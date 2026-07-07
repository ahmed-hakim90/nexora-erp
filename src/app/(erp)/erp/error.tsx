"use client";

import { useEffect } from "react";

import { resolveOperatorSafeSecurityMessage } from "@/core/errors/operator-security-messages";
import { Button } from "@/shared/ui";

export default function ErpWorkspaceError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error("ERP workspace error", error);
  }, [error]);

  const message = resolveOperatorSafeSecurityMessage(error);

  return (
    <div className="mx-auto w-full max-w-[var(--container-page)] p-6">
      <div className="rounded-md border border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/10 p-6">
        <h2 className="text-lg font-semibold text-[hsl(var(--danger))]">Unable to continue</h2>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={reset} variant="primary">
            Try again
          </Button>
          <a className="rounded-md border px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]" href="/erp">
            Back to workspace
          </a>
        </div>
      </div>
    </div>
  );
}
