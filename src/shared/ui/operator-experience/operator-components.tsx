"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { ScanLine } from "lucide-react";

import type {
  OxOperationalContext,
  OxOperatorError,
  OxResolvedDefault,
  OxTaskDefinition,
  OxVisibleFieldPolicy,
  OxWizardState,
} from "@/platform/operator-experience/public-api";
import { OX_MOBILE_STANDARD } from "@/platform/operator-experience/public-api";

import { Button, Input } from "../primitives";
import { cn } from "../utils";

export function OperatorTaskCard({
  task,
  action,
}: Readonly<{
  task: OxTaskDefinition;
  action?: ReactNode;
}>) {
  return (
    <article className="rounded-2xl border bg-[hsl(var(--surface))] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {task.intent.replaceAll("-", " ")}
          </p>
          <h3 className="mt-2 text-lg font-semibold">{task.label}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{task.description}</p>
        </div>
        {task.scannerTargets?.length ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
            <ScanLine aria-hidden className="size-3.5" />
            Scanner ready
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {task.quickActionLabel || task.routeHref ? (
          <Button type="button" variant="primary">
            {task.quickActionLabel ?? "Start task"}
          </Button>
        ) : null}
        {action}
      </div>
    </article>
  );
}

export function OperatorContextBar({
  context,
}: Readonly<{
  context: OxOperationalContext;
}>) {
  const chips = [
    context.companyName ?? context.companyId,
    context.branchName ?? context.branchId,
    context.warehouseName ?? context.warehouseId,
    context.locationName ?? context.locationId,
    context.productionLineName ?? context.productionLineId,
    context.shiftName ?? context.shiftKey,
    context.roleKey,
    context.device.kind,
  ].filter((value): value is string => Boolean(value));

  return (
    <section className="rounded-2xl border bg-[hsl(var(--surface))] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Current context</span>
        {chips.map((chip) => (
          <span className="rounded-full border bg-[hsl(var(--muted))] px-2.5 py-1 text-xs text-muted-foreground" key={chip}>
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
}

export function OperatorProgressiveSection({
  title,
  description,
  category,
  policy,
  children,
}: Readonly<{
  title: string;
  description?: string;
  category: "essential" | "advanced" | "administrative" | "system";
  policy?: OxVisibleFieldPolicy;
  children: ReactNode;
}>) {
  const [open, setOpen] = useState(category === "essential");
  const shouldRender =
    category === "essential"
    || (category === "advanced" && policy?.showAdvanced)
    || (category === "administrative" && policy?.showAdministrative)
    || (category === "system" && policy?.includeSystemFields);

  if (!shouldRender) return null;

  return (
    <section className="rounded-2xl border bg-[hsl(var(--surface))]">
      <button
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 px-4 py-3 text-start"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>
          <span className="block font-medium">{title}</span>
          {description ? <span className="mt-1 block text-sm text-muted-foreground">{description}</span> : null}
        </span>
        <span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">{category}</span>
      </button>
      {open ? <div className="border-t p-4">{children}</div> : null}
    </section>
  );
}

export function ScannerInputFrame({
  label,
  placeholder = "Scan or type code",
  helperText = "Scanner input is prioritized. Manual typing is available as a fallback.",
  onScan,
}: Readonly<{
  label: string;
  placeholder?: string;
  helperText?: string;
  onScan?: (value: string) => void;
}>) {
  const inputId = useId();
  const [value, setValue] = useState("");

  function submitScan() {
    const normalized = value.trim();
    if (!normalized) return;
    onScan?.(normalized);
    setValue("");
  }

  return (
    <label className="block space-y-1.5 text-sm" htmlFor={inputId}>
      <span className="font-medium">{label}</span>
      <div className="flex gap-2">
        <Input
          autoComplete="off"
          className="min-h-12 text-base"
          id={inputId}
          inputMode="search"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitScan();
            }
          }}
          placeholder={placeholder}
          value={value}
        />
        <Button className="min-h-12" onClick={submitScan} type="button" variant="primary">
          <ScanLine aria-hidden className="size-4" />
          Scan
        </Button>
      </div>
      <span className="block text-xs text-muted-foreground">{helperText}</span>
    </label>
  );
}

export function OperatorWizardProgress({
  state,
}: Readonly<{
  state: OxWizardState;
}>) {
  return (
    <nav aria-label="Task progress" className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Progress</p>
        <p className="text-sm text-muted-foreground">{state.progressPercent}% complete</p>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {state.steps.map((step) => (
          <li
            className={cn(
              "rounded-xl border px-3 py-2 text-sm",
              step.state === "current" && "border-[hsl(var(--accent))] bg-[hsl(var(--muted))]",
              step.state === "complete" && "border-[hsl(var(--success))] text-[hsl(var(--success))]",
              step.state === "blocked" && "border-[hsl(var(--danger))] text-[hsl(var(--danger))]",
            )}
            key={step.key}
          >
            <span className="block font-medium">{step.label}</span>
            <span className="mt-1 block text-xs capitalize text-muted-foreground">{step.state}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function OperatorErrorMessage({
  error,
}: Readonly<{
  error: OxOperatorError;
}>) {
  return (
    <section className="rounded-2xl border border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/10 p-4 text-sm" role="alert">
      <p className="font-semibold text-[hsl(var(--danger))]">{error.problem}</p>
      <p className="mt-2 text-foreground">{error.reason}</p>
      <p className="mt-1 text-muted-foreground">{error.fix}</p>
      {error.fieldLabel ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Field: <span className="font-medium text-foreground">{error.fieldLabel}</span>
        </p>
      ) : null}
    </section>
  );
}

export function SmartDefaultsSummary({
  defaults,
}: Readonly<{
  defaults: readonly OxResolvedDefault[];
}>) {
  if (defaults.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
      <h3 className="font-medium">Smart defaults applied</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {defaults.map((item) => (
          <div className="rounded-xl border bg-[hsl(var(--muted))] px-3 py-2 text-sm" key={item.key}>
            <p className="font-medium">{item.label}</p>
            <p className="mt-1 truncate text-muted-foreground">{String(item.value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function OperatorMobileStandardsCard() {
  return (
    <section className="rounded-2xl border bg-[hsl(var(--surface))] p-4 text-sm">
      <h3 className="font-medium">Mobile and handheld standard</h3>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <StandardItem label="Touch target" value={`${OX_MOBILE_STANDARD.minTouchTargetPx}px minimum`} />
        <StandardItem label="Primary actions" value={`${OX_MOBILE_STANDARD.maxPrimaryActions} maximum`} />
        <StandardItem label="Form layout" value={OX_MOBILE_STANDARD.preferSingleColumnForms ? "Single column" : "Responsive grid"} />
        <StandardItem label="Scanner input" value={OX_MOBILE_STANDARD.scannerInputVisible ? "Always visible" : "Contextual"} />
      </dl>
    </section>
  );
}

function StandardItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border bg-[hsl(var(--muted))] px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
