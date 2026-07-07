import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";

export type BackgroundJobRow = Readonly<{
  attempt: number;
  id: string;
  job_key: string;
  max_attempts: number;
  payload: Record<string, unknown>;
  tenant_id: string | null;
}>;

export type BackgroundJobHandler = (job: BackgroundJobRow, supabase: SupabaseClient) => Promise<void>;

const JOB_HANDLERS = new Map<string, BackgroundJobHandler>();

export function registerBackgroundJobHandler(jobKey: string, handler: BackgroundJobHandler): void {
  JOB_HANDLERS.set(jobKey, handler);
}

export async function processQueuedBackgroundJobs(
  supabase: SupabaseClient,
  options: Readonly<{ limit?: number }> = {},
): Promise<{ completed: number; failed: number; processed: number }> {
  const limit = options.limit ?? 10;
  const now = new Date().toISOString();

  const { data: jobs, error } = await supabase
    .from("background_jobs")
    .select("id, job_key, payload, tenant_id, attempt, max_attempts")
    .eq("status", "queued")
    .lte("run_at", now)
    .is("deleted_at", null)
    .order("run_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load queued background jobs.", cause: error });
  }

  let processed = 0;
  let completed = 0;
  let failed = 0;

  for (const job of jobs ?? []) {
    const jobRow: BackgroundJobRow = {
      attempt: Number(job.attempt ?? 0),
      id: String(job.id),
      job_key: String(job.job_key),
      max_attempts: Number(job.max_attempts ?? 3),
      payload: (job.payload && typeof job.payload === "object" && !Array.isArray(job.payload))
        ? job.payload as Record<string, unknown>
        : {},
      tenant_id: job.tenant_id ? String(job.tenant_id) : null,
    };

    await supabase
      .from("background_jobs")
      .update({ started_at: now, status: "running" })
      .eq("id", jobRow.id);

    const handler = JOB_HANDLERS.get(jobRow.job_key);
    processed += 1;

    try {
      if (!handler) {
        throw new Error(`No handler registered for job key: ${jobRow.job_key}`);
      }
      await handler(jobRow, supabase);
      await supabase
        .from("background_jobs")
        .update({ completed_at: new Date().toISOString(), progress: 100, status: "completed" })
        .eq("id", jobRow.id);
      completed += 1;
    } catch (cause) {
      const nextAttempt = jobRow.attempt + 1;
      const shouldRetry = nextAttempt < jobRow.max_attempts;
      await supabase
        .from("background_jobs")
        .update({
          attempt: nextAttempt,
          last_error: cause instanceof Error ? cause.message : "Background job failed.",
          status: shouldRetry ? "queued" : "failed",
        })
        .eq("id", jobRow.id);
      failed += 1;
    }
  }

  return { completed, failed, processed };
}
