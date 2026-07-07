"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createInventoryTransactionAction } from "@/features/inventory/routes/actions/inventory-transactions.actions";
import {
  OX_HANDHELD_DEVICE_PROFILE,
  createOxOperatorError,
  createOxRuntimeContext,
  type OxOperationalContext,
  type OxOperatorError,
  type OxScanTarget,
} from "@/platform/operator-experience/public-api";
import {
  WAREHOUSE_EXECUTION_FLOWS,
  advanceWarehouseStep,
  appendScanHistory,
  createWarehouseExecutionDraft,
  mergeDuplicateWarehouseLine,
  parseWarehouseDraft,
  serializeWarehouseDraft,
  warehouseDraftStorageKey,
  warehouseLineFromDraft,
  warehouseWizardState,
  type WarehouseExecutionCatalog,
  type WarehouseExecutionDraft,
  type WarehouseFlowKey,
} from "@/platform/operator-experience/warehouse-execution";
import { resolveLookupScan } from "@/shared/ui/operator-experience/use-entity-lookup";

import { EntityLookup, OperatorContextBar, OperatorErrorMessage, OperatorWizardProgress } from "@/shared/ui";

import { ScanHistoryPanel } from "./scan-history-panel";
import { ScannerFocusInput } from "./scanner-focus-input";

const SCAN_LOOKUP_PROVIDER_KEYS: Partial<Record<OxScanTarget, string>> = {
  lot: "inventory.lots.lookup",
  product: "inventory.products.lookup",
  serial: "inventory.serials.lookup",
  "transfer-document": "inventory.transactions.lookup",
  "warehouse-location": "inventory.locations.lookup",
};

export function WarehouseScannerWorkspace({
  branchId,
  branchName,
  catalog: _catalog,
  companyId,
  companyName,
  defaultWarehouseId,
  defaultWarehouseLabel,
  flowKey,
}: Readonly<{
  branchId: string;
  branchName: string;
  catalog: WarehouseExecutionCatalog;
  companyId: string;
  companyName: string;
  defaultWarehouseId?: string | null;
  defaultWarehouseLabel?: string | null;
  flowKey: WarehouseFlowKey;
}>) {
  void _catalog;
  const router = useRouter();
  const flow = WAREHOUSE_EXECUTION_FLOWS[flowKey];
  const storageKey = warehouseDraftStorageKey(flowKey, branchId);
  const [draft, setDraft] = useState<WarehouseExecutionDraft>(() =>
    createWarehouseExecutionDraft({ branchId, flowKey, transactionDate: new Date().toISOString().slice(0, 10) }),
  );
  const [error, setError] = useState<OxOperatorError | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);

  const oxContext: OxOperationalContext = useMemo(
    () =>
      createOxRuntimeContext({
        branchId,
        branchName,
        companyId,
        companyName,
        device: OX_HANDHELD_DEVICE_PROFILE,
        experience: "erp",
        locationName: draft.destinationLocationLabel ?? draft.sourceLocationLabel ?? null,
        roleKey: "warehouse-keeper",
        tenantId: "current-tenant",
        transactionDate: draft.transactionDate,
        warehouseId: draft.destinationWarehouseId ?? draft.sourceWarehouseId ?? defaultWarehouseId ?? null,
        warehouseName: draft.destinationLocationLabel ? defaultWarehouseLabel ?? null : defaultWarehouseLabel ?? null,
      }),
    [branchId, branchName, companyId, companyName, defaultWarehouseId, defaultWarehouseLabel, draft],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const frame = window.requestAnimationFrame(() => {
      if (saved) {
        const parsed = parseWarehouseDraft(saved);
        if (parsed && parsed.flowKey === flowKey && parsed.branchId === branchId) {
          setDraft(parsed);
        }
      } else if (defaultWarehouseId) {
        setDraft((current) => ({
          ...current,
          destinationWarehouseId: defaultWarehouseId,
          sourceWarehouseId: defaultWarehouseId,
        }));
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [branchId, defaultWarehouseId, flowKey, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, serializeWarehouseDraft(draft));
  }, [draft, hydrated, storageKey]);

  const activeStep = flow.steps.find((step) => step.key === draft.activeStepKey) ?? flow.steps[0];
  const wizardState = warehouseWizardState(draft);

  function persistDraft(next: WarehouseExecutionDraft) {
    setDraft(next);
    setError(null);
  }

  function rejectScan(stepKey: WarehouseExecutionDraft["activeStepKey"], scanTarget: NonNullable<typeof activeStep.scanTarget>, value: string, operatorError: OxOperatorError) {
    setError(operatorError);
    persistDraft(
      appendScanHistory(draft, {
        outcome: "rejected",
        resolvedLabel: operatorError.problem,
        scanTarget,
        scannedValue: value,
        stepKey,
      }),
    );
  }

  function acceptScan(stepKey: WarehouseExecutionDraft["activeStepKey"], scanTarget: NonNullable<typeof activeStep.scanTarget>, value: string, label: string, outcome: WarehouseExecutionDraft["scanHistory"][number]["outcome"] = "accepted") {
    persistDraft(
      appendScanHistory(draft, {
        outcome,
        resolvedLabel: label,
        scanTarget,
        scannedValue: value,
        stepKey,
      }),
    );
  }

  async function handleScan(rawValue: string) {
    if (!activeStep.scanTarget) return;

    const providerKey = SCAN_LOOKUP_PROVIDER_KEYS[activeStep.scanTarget];
    if (!providerKey) {
      rejectScan(activeStep.key, activeStep.scanTarget, rawValue, createOxOperatorError({
        code: "SCAN_PROVIDER_MISSING",
        fieldLabel: activeStep.label,
        fix: "Contact your administrator to configure scan lookup for this step.",
        problem: "Scan lookup is not configured.",
        reason: `No lookup provider is registered for ${activeStep.scanTarget}.`,
      }));
      return;
    }

    const resolved = await resolveLookupScan(providerKey, rawValue);

    if (!resolved) {
      rejectScan(activeStep.key, activeStep.scanTarget, rawValue, createOxOperatorError({
        code: "SCAN_NOT_FOUND",
        fieldLabel: activeStep.label,
        fix: "Scan the printed code or use manual search.",
        problem: `${activeStep.label} was not recognized.`,
        reason: `No match was found for "${rawValue}".`,
      }));
      return;
    }

    const label = resolved.businessName;
    const id = resolved.id;
    const metadata = resolved.metadata ?? {};

    if (activeStep.key === "document") {
      acceptScan(activeStep.key, activeStep.scanTarget, rawValue, label);
      persistDraft(advanceWarehouseStep({ ...draft, documentId: id, documentLabel: label, title: label }));
      return;
    }

    if (activeStep.key === "product") {
      acceptScan(activeStep.key, activeStep.scanTarget, rawValue, label);
      persistDraft(
        advanceWarehouseStep({
          ...draft,
          currentProductId: id,
          currentProductLabel: label,
          currentUnitId: String(metadata.baseUomId ?? metadata.unitId ?? ""),
        }),
      );
      return;
    }

    if (["location", "source-location", "source", "destination"].includes(activeStep.key)) {
      const warehouseId = String(metadata.warehouseId ?? defaultWarehouseId ?? "");
      acceptScan(activeStep.key, activeStep.scanTarget, rawValue, label);
      if (activeStep.key === "destination") {
        persistDraft(
          advanceWarehouseStep({
            ...draft,
            destinationLocationId: id,
            destinationLocationLabel: label,
            destinationWarehouseId: warehouseId || draft.destinationWarehouseId,
          }),
        );
        return;
      }
      persistDraft(
        advanceWarehouseStep({
          ...draft,
          destinationLocationId: activeStep.key === "location" ? id : draft.destinationLocationId,
          destinationLocationLabel: activeStep.key === "location" ? label : draft.destinationLocationLabel,
          destinationWarehouseId: activeStep.key === "location" ? warehouseId || draft.destinationWarehouseId : draft.destinationWarehouseId,
          sourceLocationId: ["source", "source-location"].includes(activeStep.key) ? id : draft.sourceLocationId,
          sourceLocationLabel: ["source", "source-location"].includes(activeStep.key) ? label : draft.sourceLocationLabel,
          sourceWarehouseId: ["source", "source-location"].includes(activeStep.key) ? warehouseId || draft.sourceWarehouseId : draft.sourceWarehouseId,
        }),
      );
      return;
    }

    if (activeStep.key === "tracking") {
      if (activeStep.scanTarget === "lot" || metadata.lotKey) {
        acceptScan(activeStep.key, "lot", rawValue, label);
        persistDraft(advanceWarehouseStep({ ...draft, currentLotKey: String(metadata.lotKey ?? rawValue) }));
        return;
      }
      if (activeStep.scanTarget === "serial" || metadata.serialKey) {
        acceptScan(activeStep.key, "serial", rawValue, label);
        persistDraft(advanceWarehouseStep({ ...draft, currentSerialKey: String(metadata.serialKey ?? rawValue) }));
      }
    }
  }

  function handleManualSelect(value: string, label: string, field: "document" | "product" | "location", metadata: Readonly<Record<string, unknown>> = {}) {
    if (field === "document") {
      persistDraft(advanceWarehouseStep({ ...draft, documentId: value, documentLabel: label, title: label }));
      return;
    }
    if (field === "product") {
      persistDraft(
        advanceWarehouseStep({
          ...draft,
          currentProductId: value,
          currentProductLabel: label,
          currentUnitId: String(metadata.baseUomId ?? ""),
        }),
      );
      return;
    }
    persistDraft(
      advanceWarehouseStep({
        ...draft,
        destinationLocationId: activeStep.key === "location" || activeStep.key === "destination" ? value : draft.destinationLocationId,
        destinationLocationLabel: activeStep.key === "location" || activeStep.key === "destination" ? label : draft.destinationLocationLabel,
        destinationWarehouseId: String(metadata.warehouseId ?? draft.destinationWarehouseId ?? ""),
        sourceLocationId: activeStep.key === "source" || activeStep.key === "source-location" ? value : draft.sourceLocationId,
        sourceLocationLabel: activeStep.key === "source" || activeStep.key === "source-location" ? label : draft.sourceLocationLabel,
        sourceWarehouseId: String(metadata.warehouseId ?? draft.sourceWarehouseId ?? ""),
      }),
    );
  }

  function handleAddLine() {
    const line = warehouseLineFromDraft(draft);
    if (!line) {
      setError(
        createOxOperatorError({
          code: "LINE_INCOMPLETE",
          fix: "Scan product, quantity, and location before adding a line.",
          problem: "Line is incomplete.",
          reason: "Required scan steps are missing.",
        }),
      );
      return;
    }
    const merged = mergeDuplicateWarehouseLine(draft, line);
    persistDraft(
      advanceWarehouseStep({
        ...merged.draft,
        currentLotKey: null,
        currentProductId: null,
        currentProductLabel: null,
        currentQuantity: 1,
        currentSerialKey: null,
        currentUnitId: null,
        scanHistory: appendScanHistory(merged.draft, {
          outcome: merged.merged ? "duplicate-merged" : "accepted",
          resolvedLabel: `${line.productLabel} × ${line.quantity}`,
          scanTarget: "product",
          scannedValue: line.productLabel,
          stepKey: "review",
        }).scanHistory,
      }),
    );
  }

  function handleSubmit() {
    if (draft.lines.length === 0) {
      handleAddLine();
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("branchId", draft.branchId);
      formData.set("title", draft.title);
      formData.set("transactionDate", draft.transactionDate);
      formData.set("destinationWarehouseId", draft.destinationWarehouseId ?? draft.lines[0]?.destinationWarehouseId ?? "");
      formData.set("destinationLocationId", draft.destinationLocationId ?? draft.lines[0]?.destinationLocationId ?? "");
      formData.set("sourceWarehouseId", draft.sourceWarehouseId ?? draft.lines[0]?.sourceWarehouseId ?? "");
      formData.set("sourceLocationId", draft.sourceLocationId ?? draft.lines[0]?.sourceLocationId ?? "");
      formData.set(
        "linesJson",
        JSON.stringify(
          draft.lines.map((line) => ({
            countedQuantity: line.countedQuantity ?? line.quantity,
            destinationLocationId: line.destinationLocationId,
            destinationWarehouseId: line.destinationWarehouseId,
            expectedQuantity: line.expectedQuantity ?? 0,
            productId: line.productId,
            quantity: line.quantity,
            sourceLocationId: line.sourceLocationId,
            sourceWarehouseId: line.sourceWarehouseId,
            unitCost: 0,
            unitId: line.unitId,
          })),
        ),
      );
      await createInventoryTransactionAction(flow.transactionType, formData);
      window.localStorage.removeItem(storageKey);
      router.refresh();
    });
  }

  function clearDraft() {
    window.localStorage.removeItem(storageKey);
    setDraft(createWarehouseExecutionDraft({ branchId, flowKey }));
    setError(null);
  }

  return (
    <div className="space-y-4">
      <OperatorContextBar context={oxContext} />
      <OperatorWizardProgress state={wizardState} />
      <ScanHistoryPanel history={draft.scanHistory} />
      {error ? <OperatorErrorMessage error={error} /> : null}

      <section className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Current task</p>
          <h2 className="text-xl font-semibold">{activeStep.label}</h2>
          <p className="text-sm text-muted-foreground">{activeStep.description}</p>
        </header>

        <div className="mt-4 space-y-4">
          {activeStep.scanTarget ? (
            <ScannerFocusInput
              autoFocus
              label={`Scan ${activeStep.label.toLowerCase()}`}
              onScan={handleScan}
              placeholder={`Scan ${activeStep.label.toLowerCase()} or type code`}
            />
          ) : null}

          {activeStep.key === "quantity" || activeStep.key === "counted" ? (
            <label className="block space-y-2 text-base">
              <span className="font-semibold">{activeStep.key === "counted" ? "Counted quantity" : "Quantity"}</span>
              <input
                className="min-h-14 w-full rounded-md border px-4 text-lg"
                min="0.000001"
                onChange={(event) => persistDraft({ ...draft, currentQuantity: Number(event.target.value), currentCountedQuantity: Number(event.target.value) })}
                step="0.000001"
                type="number"
                value={draft.currentQuantity}
              />
              <button className="min-h-14 w-full rounded-md border bg-[hsl(var(--primary))] px-4 text-base text-[hsl(var(--primary-foreground))]" onClick={() => persistDraft(advanceWarehouseStep(draft))} type="button">
                Continue
              </button>
            </label>
          ) : null}

          {activeStep.key === "variance" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Expected" value={String(draft.currentExpectedQuantity ?? 0)} />
              <MetricCard label="Counted" value={String(draft.currentCountedQuantity ?? draft.currentQuantity)} />
              <MetricCard label="Variance" value={String((draft.currentCountedQuantity ?? draft.currentQuantity) - (draft.currentExpectedQuantity ?? 0))} />
              <button className="min-h-14 rounded-md border bg-[hsl(var(--primary))] px-4 text-base text-[hsl(var(--primary-foreground))] sm:col-span-3" onClick={handleAddLine} type="button">
                Save count line
              </button>
            </div>
          ) : null}

          {activeStep.allowManualFallback && activeStep.key === "document" ? (
            <EntityLookup label="Select document manually" name="manualDocument" onValueChange={(value, option) => { if (option) handleManualSelect(value, option.label, "document"); }} placeholder="Search document..." providerKey="inventory.transactions.lookup" />
          ) : null}
          {activeStep.allowManualFallback && activeStep.key === "product" ? (
            <EntityLookup label="Select product manually" name="manualProduct" onValueChange={(value, option) => { if (option) handleManualSelect(value, option.label, "product", option.metadata ?? {}); }} placeholder="Search product..." providerKey="inventory.products.lookup" />
          ) : null}
          {activeStep.allowManualFallback && ["location", "source", "source-location", "destination"].includes(activeStep.key) ? (
            <EntityLookup label="Select location manually" name="manualLocation" onValueChange={(value, option) => { if (option) handleManualSelect(value, option.label, "location", option.metadata ?? {}); }} placeholder="Search location..." providerKey="inventory.locations.lookup" />
          ) : null}

          {activeStep.key === "tracking" ? (
            <div className="flex flex-wrap gap-2">
              <button className="min-h-12 rounded-md border px-4 text-sm" onClick={() => persistDraft(advanceWarehouseStep(draft))} type="button">
                Skip tracking
              </button>
              <button className="min-h-12 rounded-md border bg-[hsl(var(--primary))] px-4 text-sm text-[hsl(var(--primary-foreground))]" onClick={handleAddLine} type="button">
                Add line
              </button>
            </div>
          ) : null}

          {["quantity", "location", "destination"].includes(activeStep.key) ? (
            <button className="min-h-12 rounded-md border bg-[hsl(var(--primary))] px-4 text-sm text-[hsl(var(--primary-foreground))]" onClick={() => (activeStep.key === "destination" || activeStep.key === "location" ? handleAddLine() : persistDraft(advanceWarehouseStep(draft)))} type="button">
              {activeStep.key === "destination" || (activeStep.key === "location" && flowKey === "goods-receipt") ? "Add line" : "Continue"}
            </button>
          ) : null}
        </div>
      </section>

      {draft.lines.length > 0 ? (
        <section className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
          <h3 className="font-medium">Lines ({draft.lines.length})</h3>
          <ul className="mt-3 space-y-2">
            {draft.lines.map((line) => (
              <li className="rounded-xl border px-3 py-2 text-sm" key={line.key}>
                <p className="font-medium">{line.productLabel}</p>
                <p className="text-muted-foreground">Qty {line.quantity}{line.destinationLocationLabel ? ` · ${line.destinationLocationLabel}` : ""}{line.sourceLocationLabel ? ` · from ${line.sourceLocationLabel}` : ""}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeStep.key === "review" ? (
        <div className="flex flex-wrap gap-2">
          <button className="min-h-14 rounded-md border bg-[hsl(var(--primary))] px-5 text-base text-[hsl(var(--primary-foreground))]" disabled={isPending || draft.lines.length === 0} onClick={handleSubmit} type="button">
            {isPending ? "Saving..." : "Submit draft"}
          </button>
          <button className="min-h-14 rounded-md border px-5 text-base" disabled={isPending} onClick={() => persistDraft({ ...createWarehouseExecutionDraft({ branchId, flowKey }), lines: draft.lines })} type="button">
            Scan another line
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="min-h-12 rounded-md border px-4 text-sm" onClick={clearDraft} type="button">
          Clear draft
        </button>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border bg-[hsl(var(--muted))] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
