"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

export function useRecordFormModal({
  autoOpen = false,
  closeHref,
}: Readonly<{
  autoOpen?: boolean;
  closeHref?: string;
}> = {}) {
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [isDirty, setIsDirty] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setIsDirty(false);
      if (closeHref) router.push(closeHref);
    }
  }

  function closeModal() {
    handleOpenChange(false);
  }

  function markDirty() {
    setIsDirty(true);
  }

  return {
    closeModal,
    formId,
    handleOpenChange,
    isDirty,
    markDirty,
    open,
    setOpen,
    setIsDirty,
  };
}
