import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";

import { cn } from "../utils";

export type NavTabItem = Readonly<{
  key: string;
  label: string;
  href: string;
  optional?: boolean;
}>;

export type WizardStepItem = Readonly<{
  key: string;
  label: string;
  optional?: boolean;
  state?: "complete" | "current" | "pending";
}>;

export function navTabTriggerClassName(isActive: boolean) {
  return cn(
    "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
    "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-muted-foreground",
    "hover:border-[hsl(var(--accent))]/40 hover:bg-[hsl(var(--muted))]/60 hover:text-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface))]",
    isActive &&
      "border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-sm hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
  );
}

export function tabTriggerClassName(isActive: boolean) {
  return cn(
    "inline-flex items-center rounded-md border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors",
    "text-muted-foreground hover:text-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2",
    isActive &&
      "border-[hsl(var(--accent))] bg-[hsl(var(--muted))]/50 text-foreground",
  );
}

export function NavTabBar({
  children,
  className,
  label = "Sections",
}: Readonly<{
  children: ReactNode;
  className?: string;
  label?: string;
}>) {
  return (
    <nav aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {children}
    </nav>
  );
}

export function NavTabLink({
  active,
  children,
  className,
  href,
  ...props
}: ComponentPropsWithoutRef<typeof Link> &
  Readonly<{
    active: boolean;
  }>) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(navTabTriggerClassName(active), className)}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}

export function WizardStepIndicator({
  currentIndex,
  onStepClick,
  steps,
}: Readonly<{
  currentIndex: number;
  onStepClick?: (index: number) => void;
  steps: readonly WizardStepItem[];
}>) {
  return (
    <ol aria-label="Wizard progress" className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          aria-hidden
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]"
        >
          <div
            className="h-full rounded-full bg-[hsl(var(--accent))] transition-all duration-200"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {currentIndex + 1} / {steps.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => {
          const state =
            step.state ??
            (index < currentIndex ? "complete" : index === currentIndex ? "current" : "pending");
          const content = (
            <>
              <span aria-hidden className="tabular-nums">
                {index + 1}.
              </span>{" "}
              {step.label}
              {step.optional ? (
                <span className="ms-1 text-[0.7rem] font-normal opacity-80">(optional)</span>
              ) : null}
            </>
          );

          if (onStepClick) {
            return (
              <li key={step.key}>
                <button
                  aria-current={state === "current" ? "step" : undefined}
                  className={wizardStepClassName(state)}
                  onClick={() => onStepClick(index)}
                  type="button"
                >
                  {content}
                </button>
              </li>
            );
          }

          return (
            <li
              aria-current={state === "current" ? "step" : undefined}
              className={wizardStepClassName(state)}
              key={step.key}
            >
              {content}
            </li>
          );
        })}
      </div>
    </ol>
  );
}

function wizardStepClassName(state: "complete" | "current" | "pending") {
  return cn(
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    state === "complete" &&
      "border-[hsl(var(--success))]/50 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    state === "current" &&
      "border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-sm",
    state === "pending" &&
      "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-muted-foreground",
  );
}
