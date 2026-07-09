"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { platformFeedback } from "@/platform/feedback/public-api";
import { useTranslations } from "@/shared/ui";

export function useDeviceTabData<T>(deviceId: string | null, path: string, enabled: boolean) {
  const t = useTranslations();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refetch = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!deviceId || !enabled) return undefined;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/hr/attendance-devices/${deviceId}/${path}`);
        if (!response.ok) throw new Error(t("hr.attendance.devices.feedback.couldNotLoadTab"));
        const payload = (await response.json()) as T;
        if (!cancelled) setData(payload);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : t("hr.attendance.devices.feedback.couldNotLoadTab"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deviceId, enabled, path, refreshNonce, t]);

  return { data, error, loading, refetch };
}

export function DeviceActionForm({
  action,
  children,
  className,
  hiddenFields,
  onCompleted,
}: Readonly<{
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  className?: string;
  hiddenFields: Record<string, string>;
  onCompleted?: () => void;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await action(formData);
            platformFeedback.success(t("hr.attendance.devices.feedback.actionCompleted"));
            router.refresh();
            onCompleted?.();
          } catch (cause) {
            platformFeedback.error(cause instanceof Error ? cause.message : t("hr.attendance.devices.feedback.actionFailed"));
          }
        });
      }}
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <fieldset className="contents" disabled={isPending}>
        {children}
      </fieldset>
    </form>
  );
}

export function TabLoadingState({ error, loading }: Readonly<{ error: string | null; loading: boolean }>) {
  const t = useTranslations();
  if (loading) return <p className="text-sm text-muted-foreground">{t("hr.common.loading")}</p>;
  if (error) return <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>;
  return null;
}

export function DetailItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
