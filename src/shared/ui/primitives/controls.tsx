"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { forwardRef } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "../utils";

export const Button = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md";
  }
>(function Button(
  { className, variant = "secondary", size = "md", ...props },
  ref,
) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border font-medium text-foreground shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variant === "primary" &&
          "border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
        variant === "secondary" &&
          "border-border bg-[hsl(var(--surface-muted))] hover:border-[hsl(var(--muted-foreground)/0.35)] hover:bg-[hsl(var(--surface-elevated))]",
        variant === "ghost" && "border-transparent bg-transparent hover:bg-[hsl(var(--muted))]",
        variant === "danger" &&
          "border-[hsl(var(--danger))] bg-[hsl(var(--danger))] text-white",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        className={cn(
          "h-10 w-full rounded-md border bg-[hsl(var(--surface))] px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

export function Label(props: ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn("text-sm font-medium", props.className)} {...props} />;
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
}: Readonly<{
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
}>) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <CheckboxPrimitive.Root
        checked={checked}
        className="grid size-4 place-items-center rounded border bg-[hsl(var(--surface))]"
        onCheckedChange={(value) => onCheckedChange?.(value === true)}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="size-3" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label}
    </label>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
}: Readonly<{
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
}>) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <SwitchPrimitive.Root
        checked={checked}
        className="relative h-5 w-9 rounded-full bg-[hsl(var(--muted))] data-[state=checked]:bg-[hsl(var(--accent))]"
        onCheckedChange={onCheckedChange}
      >
        <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-4" />
      </SwitchPrimitive.Root>
      {label}
    </label>
  );
}

export function Select({
  value,
  onValueChange,
  placeholder = "Select",
  options,
}: Readonly<{
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: readonly { value: string; label: string; disabled?: boolean }[];
}>) {
  return (
    <SelectPrimitive.Root onValueChange={onValueChange} value={value}>
      <SelectPrimitive.Trigger className="inline-flex h-10 w-full items-center justify-between rounded-md border bg-[hsl(var(--surface))] px-3 text-sm">
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="z-[var(--z-dropdown)] overflow-hidden rounded-md border bg-[hsl(var(--surface))] shadow-md">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm outline-none data-[highlighted]:bg-[hsl(var(--muted))]"
                disabled={option.disabled}
                key={option.value}
                value={option.value}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function DropdownMenu({
  trigger,
  items,
  align = "start",
}: Readonly<{
  trigger: ReactNode;
  items: readonly {
    key: string;
    label: ReactNode;
    disabled?: boolean;
    onSelect?: () => void;
    href?: string;
  }[];
  align?: "start" | "center" | "end";
}>) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          className="z-[var(--z-dropdown)] min-w-48 rounded-xl border bg-[hsl(var(--surface))]/98 p-1.5 shadow-lg backdrop-blur"
          sideOffset={8}
        >
          {items.map((item) => (
            <DropdownMenuPrimitive.Item
              className="rounded-lg px-3 py-2 text-sm outline-none transition-colors data-[disabled]:opacity-50 data-[highlighted]:bg-[hsl(var(--muted))]"
              disabled={item.disabled}
              key={item.key}
              onSelect={item.onSelect}
            >
              {item.href ? <a href={item.href}>{item.label}</a> : item.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
