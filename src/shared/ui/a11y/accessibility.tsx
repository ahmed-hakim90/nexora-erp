import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../utils";

export function VisuallyHidden({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0",
        className,
      )}
      style={{ clip: "rect(0 0 0 0)" }}
      {...props}
    />
  );
}

export function FocusScope({
  children,
  label,
}: Readonly<{
  children: ReactNode;
  label: string;
}>) {
  return (
    <section aria-label={label} tabIndex={-1}>
      {children}
    </section>
  );
}

export function KeyboardShortcut({
  keys,
}: Readonly<{
  keys: readonly string[];
}>) {
  return (
    <span aria-hidden="true" className="inline-flex gap-1 text-xs text-muted-foreground">
      {keys.map((key) => (
        <kbd key={key} className="rounded border px-1.5 py-0.5">
          {key}
        </kbd>
      ))}
    </span>
  );
}
