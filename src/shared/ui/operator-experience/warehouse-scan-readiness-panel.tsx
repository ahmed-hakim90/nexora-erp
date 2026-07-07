"use client";

import { useState } from "react";

import type { OxOperatorError } from "@/platform/operator-experience/public-api";
import {
  appendScanHistory,
  createWarehouseExecutionDraft,
  resolveWarehouseScan,
  type WarehouseExecutionCatalog,
  type WarehouseScanHistoryEntry,
} from "@/platform/operator-experience/warehouse-execution";
import { OperatorErrorMessage } from "@/shared/ui";

import { ScanHistoryPanel } from "./scan-history-panel";
import { ScannerFocusInput } from "./scanner-focus-input";

const scanTargets = {
  document: "transfer-document",
  location: "warehouse-location",
  lot: "lot",
  product: "product",
  serial: "serial",
} as const;

export function WarehouseScanReadinessPanel({
  catalog,
  target,
}: Readonly<{
  catalog: WarehouseExecutionCatalog;
  target: keyof typeof scanTargets;
}>) {
  const [history, setHistory] = useState<readonly WarehouseScanHistoryEntry[]>([]);
  const [error, setError] = useState<OxOperatorError | null>(null);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);

  function handleScan(value: string) {
    const resolved = resolveWarehouseScan(scanTargets[target], value, catalog);
    if ("code" in resolved) {
      setError(resolved);
      setHistory(
        appendScanHistory(createWarehouseExecutionDraft({ branchId: "scan-lab", flowKey: "goods-receipt" }), {
          outcome: "rejected",
          resolvedLabel: resolved.problem,
          scanTarget: scanTargets[target],
          scannedValue: value,
          stepKey: "product",
        }).scanHistory,
      );
      return;
    }
    setError(null);
    setResolvedLabel(resolved.label);
    setHistory((current) =>
      appendScanHistory(
        { ...createWarehouseExecutionDraft({ branchId: "scan-lab", flowKey: "goods-receipt" }), scanHistory: current },
        {
          outcome: "accepted",
          resolvedLabel: resolved.label,
          scanTarget: scanTargets[target],
          scannedValue: value,
          stepKey: "product",
        },
      ).scanHistory,
    );
  }

  return (
    <div className="space-y-4">
      <ScannerFocusInput autoFocus label={`Scan ${target}`} onScan={handleScan} placeholder={`Scan ${target} code`} />
      {resolvedLabel ? (
        <section className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Resolved label</p>
          <p className="mt-1 text-xl font-semibold">{resolvedLabel}</p>
        </section>
      ) : null}
      {error ? <OperatorErrorMessage error={error} /> : null}
      <ScanHistoryPanel history={history} />
    </div>
  );
}
