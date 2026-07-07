"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { HelpCircle } from "lucide-react";

import { Tooltip } from "../layout/layout-primitives";
import { cn } from "../utils";
import type { BilingualHelp } from "./help-types";

function BilingualTooltipContent({ help }: Readonly<{ help: BilingualHelp }>) {
  return (
    <div className="max-w-xs space-y-1.5 text-left leading-snug">
      <p>{help.en}</p>
      <p className="border-t border-[hsl(var(--background))]/20 pt-1.5 text-[hsl(var(--background))]/85">{help.ar}</p>
    </div>
  );
}

export function HelpHint({
  help,
  size = "sm",
  side = "top",
  align = "center",
  className,
}: Readonly<{
  help: BilingualHelp;
  size?: "sm" | "md";
  side?: ComponentPropsWithoutRef<typeof Tooltip> extends { side?: infer S } ? S : "top";
  align?: ComponentPropsWithoutRef<typeof Tooltip> extends { align?: infer A } ? A : "center";
  className?: string;
}>) {
  const iconSize = size === "md" ? "size-4" : "size-3.5";

  return (
    <Tooltip align={align} content={<BilingualTooltipContent help={help} />} side={side}>
      <button
        aria-label="Help"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
          className,
        )}
        type="button"
      >
        <HelpCircle aria-hidden className={iconSize} />
      </button>
    </Tooltip>
  );
}

export function LabelWithHelp({
  children,
  help,
  isRequired,
}: Readonly<{
  children: ReactNode;
  help?: BilingualHelp;
  isRequired?: boolean;
}>) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>
        {children}
        {isRequired ? <span aria-hidden="true"> *</span> : null}
      </span>
      {help ? <HelpHint help={help} /> : null}
    </span>
  );
}
