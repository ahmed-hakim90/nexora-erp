export type BackgroundJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type BackgroundJobPriority = "low" | "normal" | "high" | "critical";

export type BackgroundJobDefinition = Readonly<{
  key: string;
  maxRetries: number;
  timeoutSeconds: number;
  priority: BackgroundJobPriority;
  isScheduled?: boolean;
}>;

export type BackgroundJobRequest = Readonly<{
  tenantId?: string;
  companyId?: string | null;
  branchId?: string | null;
  actorUserId?: string | null;
  actorType?: "user" | "service" | "integration" | "automation" | "ai-agent";
  jobKey: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  correlationId?: string;
  runAt?: string;
}>;

export type BackgroundJobSnapshot = Readonly<{
  id: string;
  jobKey: string;
  status: BackgroundJobStatus;
  attempt: number;
  progress: number;
}>;
