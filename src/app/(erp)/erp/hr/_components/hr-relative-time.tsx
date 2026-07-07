"use client";

import { useSyncExternalStore } from "react";

import {
  formatHrAbsoluteTime,
  formatHrRelativeTime,
} from "@/features/hr/public-api";

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function HrRelativeTime({ value }: Readonly<{ value: string | null | undefined }>) {
  const mounted = useHasMounted();

  if (!mounted) {
    return <>{formatHrAbsoluteTime(value)}</>;
  }

  return <>{formatHrRelativeTime(value)}</>;
}
