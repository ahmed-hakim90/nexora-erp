"use client";

import type { ReactNode } from "react";

import { Button } from "../primitives";
import { Dialog } from "../layout";
import { cn } from "../utils";
import { EditablePageProvider } from "./editable-page-context";
import { EditablePageToolbar } from "./editable-page-toolbar";
import { EditableUnsavedChangesGuard } from "./editable-unsaved-changes-guard";
import { resolveWorkflowField, useEditablePage, type UseEditablePageOptions } from "./use-editable-page";

export type EditablePageToolbarPlacement = "standalone" | "embedded";

export type EditablePageProps = UseEditablePageOptions &
  Readonly<{
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    description?: string;
    renderWorkflow?: (fieldName: string) => ReactNode;
    title?: string;
    toolbarPlacement?: EditablePageToolbarPlacement;
  }>;

export function EditablePage({
  actions,
  canEdit = true,
  children,
  className,
  description,
  entityId,
  entityLabel,
  entityType,
  extraValues,
  fields,
  onSave,
  onSaved,
  record,
  renderWorkflow,
  saveStrategy,
  sourceScreen,
  successMessage,
  title,
  toolbarPlacement = "standalone",
}: EditablePageProps) {
  const page = useEditablePage({
    canEdit,
    entityId,
    entityLabel,
    entityType,
    extraValues,
    fields,
    onSave,
    onSaved,
    record,
    saveStrategy,
    sourceScreen,
    successMessage,
  });

  const workflowField = resolveWorkflowField(page.workflowField, fields);

  return (
    <EditablePageProvider value={page}>
      <section className={cn("space-y-4", className)} data-editable-page-mode={page.pageMode}>
        {toolbarPlacement === "standalone" ? (
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-[hsl(var(--surface))] px-4 py-3">
            <div className="min-w-0 space-y-1">
              {title ? <h2 className="text-base font-medium">{title}</h2> : null}
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <EditablePageToolbar actions={actions} />
          </header>
        ) : null}

        {children}

        <Dialog
          onOpenChange={(open) => {
            if (!open) page.closeWorkflow();
          }}
          open={Boolean(page.workflowField)}
          title={workflowField?.workflowTitle ?? workflowField?.label ?? "Change value"}
        >
          {page.workflowField && renderWorkflow ? renderWorkflow(page.workflowField) : null}
          {!renderWorkflow && page.workflowField ? (
            <p className="text-sm text-muted-foreground">
              Workflow dialog for {workflowField?.label ?? page.workflowField}. Provide `renderWorkflow` on EditablePage.
            </p>
          ) : null}
        </Dialog>

        <EditableUnsavedChangesGuard />
      </section>
    </EditablePageProvider>
  );
}
