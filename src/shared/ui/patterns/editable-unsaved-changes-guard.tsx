"use client";

import { useEffect, useState } from "react";

import { Button } from "../primitives";
import { Dialog } from "../layout";
import { useEditablePageContext } from "./editable-page-context";

export function EditableUnsavedChangesGuard() {
  const page = useEditablePageContext();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!page || page.pageMode !== "edit" || !page.isDirty) return;

    function onDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (anchor.origin !== window.location.origin) return;
      if (anchor.pathname === window.location.pathname && anchor.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(anchor.href);
    }

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [page]);

  if (!page) return null;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) setPendingHref(null);
      }}
      open={Boolean(pendingHref)}
      title="Unsaved changes"
    >
      <p className="text-sm text-muted-foreground">
        You have unsaved changes on this page. Save them, discard them, or continue editing.
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button onClick={() => setPendingHref(null)} type="button" variant="secondary">
          Continue Editing
        </Button>
        <Button
          onClick={() => {
            page.cancelEdit();
            const href = pendingHref;
            setPendingHref(null);
            if (href) window.location.assign(href);
          }}
          type="button"
          variant="secondary"
        >
          Discard
        </Button>
        <Button
          onClick={() => {
            void page.saveAll().then((saved) => {
              if (!saved) return;
              const href = pendingHref;
              setPendingHref(null);
              if (href) window.location.assign(href);
            });
          }}
          type="button"
          variant="primary"
        >
          Save Changes
        </Button>
      </div>
    </Dialog>
  );
}
