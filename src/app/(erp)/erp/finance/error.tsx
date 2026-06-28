"use client";

import { useEffect } from "react";

import { Button } from "@/shared/ui";

export default function FinanceError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error("Finance workspace error", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-[var(--container-page)] p-6">
      <div className="rounded-md border border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/10 p-6">
        <h2 className="text-lg font-semibold text-[hsl(var(--danger))]">Something went wrong in Finance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred while loading this finance workspace."}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={reset} variant="primary">
            Try again
          </Button>
          <a className="rounded-md border px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]" href="/erp/finance">
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
