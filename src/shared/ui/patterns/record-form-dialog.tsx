"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "../primitives";
import { cn } from "../utils";

export type RecordFormDialogSize = "normal" | "wide";

export function RecordFormDialog({
  actions,
  auditMetadata,
  centerControls,
  children,
  dismissLabel = "Cancel",
  isDirty,
  onDismiss,
  onOpenChange,
  open,
  size = "normal",
  status,
  subtitle,
  title,
  trigger,
}: Readonly<{
  actions?: ReactNode;
  auditMetadata?: ReactNode;
  centerControls?: ReactNode;
  children: ReactNode;
  dismissLabel?: string;
  isDirty?: boolean;
  onDismiss?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  size?: RecordFormDialogSize;
  status?: ReactNode;
  subtitle?: ReactNode;
  title: string;
  trigger?: ReactNode;
}>) {
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isDirty && !window.confirm("Discard unsaved changes?")) {
      return;
    }
    onOpenChange(nextOpen);
  }

  function handleDismiss() {
    if (isDirty && !window.confirm("Discard unsaved changes?")) {
      return;
    }
    if (onDismiss) {
      onDismiss();
      return;
    }
    onOpenChange(false);
  }

  return (
    <DialogPrimitive.Root onOpenChange={handleOpenChange} open={open}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[var(--z-modal)] flex max-h-[88dvh] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-foreground shadow-[var(--shadow-lg)]",
            size === "wide" && "w-[min(72rem,calc(100vw-2rem))]",
          )}
        >
          <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-5 py-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
                  {title}
                </DialogPrimitive.Title>
                {status}
              </div>
              {subtitle ? <DialogPrimitive.Description className="text-sm text-muted-foreground">{subtitle}</DialogPrimitive.Description> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {centerControls ? <div className="hidden items-center gap-1 sm:flex">{centerControls}</div> : null}
              <DialogPrimitive.Close
                aria-label="Close dialog"
                className="grid size-9 place-items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-muted))]/60 text-muted-foreground transition hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface))]"
              >
                <X aria-hidden className="size-4" />
              </DialogPrimitive.Close>
            </div>
          </header>

          <div className="flex-1 overflow-auto px-5 py-4">{children}</div>

          <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-5 py-3 shadow-[0_-8px_24px_-12px_hsl(var(--foreground)/0.12)]">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {onDismiss ? (
                <Button onClick={handleDismiss} type="button" variant="secondary">
                  {dismissLabel}
                </Button>
              ) : null}
              {auditMetadata}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
