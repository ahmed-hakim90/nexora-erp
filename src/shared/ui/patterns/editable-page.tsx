"use client";

import type { ReactNode } from "react";

import { Button } from "../primitives";
import { Dialog } from "../layout";
import { cn } from "../utils";
import { EditablePageProvider } from "./editable-page-context";
import { EditableUnsavedChangesGuard } from "./editable-unsaved-changes-guard";
import { resolveWorkflowField, useEditablePage, type UseEditablePageOptions } from "./use-editable-page";

export type EditablePageProps = UseEditablePageOptions &
  Readonly<{
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    description?: string;
    renderWorkflow?: (fieldName: string) => ReactNode;
    title?: string;
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
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-[hsl(var(--surface))] px-4 py-3">
          <div className="min-w-0 space-y-1">
            {title ? <h2 className="text-base font-medium">{title}</h2> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            {page.pageMode === "edit" && page.isDirty ? (
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--warning))]">
                <span aria-hidden className="size-2 rounded-full bg-[hsl(var(--warning))]" />
                Unsaved changes
              </p>
            ) : null}
            {page.errors._form ? (
              <p className="text-xs text-[hsl(var(--danger))]" role="alert">
                {page.errors._form}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {page.pageMode === "view" ? (
              canEdit ? (
                <Button onClick={page.startEdit} type="button" variant="primary">
                  Edit
                </Button>
              ) : null
            ) : (
              <>
                <Button disabled={page.saveStatus === "saving"} onClick={page.cancelEdit} type="button" variant="secondary">
                  Cancel
                </Button>
                <Button
                  disabled={page.saveStatus === "saving"}
                  onClick={() => void page.saveAll()}
                  type="button"
                  variant="primary"
                >
                  {page.saveStatus === "saving" ? "Saving…" : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        </header>

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
