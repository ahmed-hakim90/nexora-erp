"use client";

import type { ReactNode } from "react";

import { Button } from "../primitives";
import { cn } from "../utils";
import { useEditablePageContext } from "./editable-page-context";

export function EditablePageToolbar({
  actions,
  className,
  showStatus = true,
}: Readonly<{
  actions?: ReactNode;
  className?: string;
  showStatus?: boolean;
}>) {
  const page = useEditablePageContext();

  if (!page) return null;

  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      {showStatus && page.pageMode === "edit" && page.isDirty ? (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--warning))]">
          <span aria-hidden className="size-2 rounded-full bg-[hsl(var(--warning))]" />
          Unsaved changes
        </p>
      ) : null}
      {showStatus && page.errors._form ? (
        <p className="text-xs text-[hsl(var(--danger))]" role="alert">
          {page.errors._form}
        </p>
      ) : null}
      {actions}
      {page.pageMode === "view" ? (
        page.canEdit ? (
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
  );
}
