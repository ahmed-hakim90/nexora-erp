"use client";

import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";

import { Dialog } from "../layout";
import { cn } from "../utils";

export type CommandPaletteItem = Readonly<{
  key: string;
  label: string;
  description?: string;
  group?: string;
  href?: string;
  onSelect?: () => void;
}>;

export function CommandPalette({
  items,
  open,
  onOpenChange,
}: Readonly<{
  items: readonly CommandPaletteItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const groups = useMemo(() => {
    const grouped = new Map<string, CommandPaletteItem[]>();

    for (const item of items) {
      const group = item.group ?? "Actions";
      grouped.set(group, [...(grouped.get(group) ?? []), item]);
    }

    return [...grouped.entries()];
  }, [items]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open} title="Command palette">
      <Command className="space-y-3">
        <Command.Input
          autoFocus
          className="h-11 w-full rounded-md border bg-[hsl(var(--surface))] px-3 text-sm outline-none"
          placeholder="Search commands, pages, and records..."
        />
        <Command.List className="max-h-[24rem] overflow-auto">
          <Command.Empty className="px-3 py-6 text-sm text-muted-foreground">
            No command found.
          </Command.Empty>
          {groups.map(([group, groupItems]) => (
            <Command.Group heading={group} key={group}>
              {groupItems.map((item) => (
                <Command.Item
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-[hsl(var(--muted))]",
                  )}
                  key={item.key}
                  onSelect={() => {
                    item.onSelect?.();
                    if (item.href) {
                      window.location.href = item.href;
                    }
                    onOpenChange(false);
                  }}
                  value={`${item.label} ${item.description ?? ""}`}
                >
                  <div>
                    <p>{item.label}</p>
                    {item.description ? (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    ) : null}
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </Dialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
