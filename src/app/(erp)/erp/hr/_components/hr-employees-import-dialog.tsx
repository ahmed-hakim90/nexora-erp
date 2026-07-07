"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, RecordFormDialog, RecordFormSection } from "@/shared/ui";

type ImportResult = Readonly<{
  acceptedCount?: number;
  createdEmployeeIds?: string[];
  message?: string;
  rejected?: ReadonlyArray<{ errors: string[]; row: number }>;
  success: boolean;
}>;

function buildCloseHref(query: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "import" || !value) continue;
    next.set(key, value);
  }
  const queryString = next.toString();
  return queryString ? `/erp/hr/employees?${queryString}` : "/erp/hr/employees";
}

export function HrEmployeesImportDialog({ query }: Readonly<{ query: Record<string, string | undefined> }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleClose() {
    startTransition(() => {
      router.push(buildCloseHref(query));
      router.refresh();
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setResult(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setErrorMessage("Select a CSV file to import.");
      return;
    }

    try {
      const response = await fetch("/api/hr/employees/import", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as ImportResult & { message?: string };
      if (!response.ok) {
        setErrorMessage(payload.message ?? "Import failed.");
        return;
      }
      setResult(payload);
      if (payload.success && (payload.rejected?.length ?? 0) === 0) {
        router.refresh();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Import failed.");
    }
  }

  return (
    <RecordFormDialog
      onDismiss={handleClose}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      open
      subtitle="Upload a CSV file using the import template. Rows with validation errors are reported without blocking valid rows."
      title="Import employees"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <RecordFormSection>
          <label className="block text-sm font-medium" htmlFor="employee-import-file">
            CSV file
          </label>
          <input
            accept=".csv,text/csv"
            className="mt-2 block w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2 text-sm text-[hsl(var(--foreground))] file:me-3 file:rounded-md file:border file:border-[hsl(var(--border))] file:bg-[hsl(var(--muted))] file:px-3 file:py-1.5 file:text-sm"
            id="employee-import-file"
            name="file"
            required
            type="file"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            <a className="underline" href="/api/hr/employees/import-template">
              Download import template
            </a>
          </p>
        </RecordFormSection>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorMessage}</p>
        ) : null}

        {result ? (
          <div className="space-y-3 rounded-md border bg-[hsl(var(--muted))]/30 p-3 text-sm">
            <p>
              {result.success
                ? `Imported ${result.acceptedCount ?? 0} employee(s).`
                : "No employees were imported."}
            </p>
            {(result.rejected?.length ?? 0) > 0 ? (
              <div>
                <p className="font-medium">Rejected rows</p>
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                  {result.rejected?.map((row) => (
                    <li className="rounded border bg-[hsl(var(--surface))] p-2" key={row.row}>
                      <span className="font-medium">Row {row.row}</span>
                      <ul className="mt-1 list-disc ps-5 text-muted-foreground">
                        {row.errors.map((error) => (
                          <li key={`${row.row}-${error}`}>{error}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button disabled={isPending} onClick={handleClose} type="button" variant="secondary">
            Close
          </Button>
          <Button disabled={isPending} type="submit">
            {isPending ? "Importing…" : "Import CSV"}
          </Button>
        </div>
      </form>
    </RecordFormDialog>
  );
}
