"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ScanLine } from "lucide-react";

import { Button, Input } from "../primitives";

export function ScannerFocusInput({
  autoFocus = true,
  helperText = "Scanner input is focused by default. Press Enter to submit the scan.",
  label,
  onScan,
  placeholder = "Scan or type code",
}: Readonly<{
  autoFocus?: boolean;
  helperText?: string;
  label: string;
  onScan?: (value: string) => void;
  placeholder?: string;
}>) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!autoFocus) return undefined;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [autoFocus, label]);

  function submitScan() {
    const normalized = value.trim();
    if (!normalized) return;
    onScan?.(normalized);
    setValue("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <label className="block space-y-2 text-base" htmlFor={inputId}>
      <span className="font-semibold">{label}</span>
      <div className="flex gap-2">
        <Input
          autoComplete="off"
          autoFocus={autoFocus}
          className="min-h-14 text-lg"
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
          ref={inputRef}
          value={value}
        />
        <Button className="min-h-14 min-w-14 px-4" onClick={submitScan} type="button" variant="primary">
          <ScanLine aria-hidden className="size-5" />
          Scan
        </Button>
      </div>
      <span className="block text-sm text-muted-foreground">{helperText}</span>
    </label>
  );
}
