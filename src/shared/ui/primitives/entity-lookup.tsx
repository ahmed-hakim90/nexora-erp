"use client";

import { useMemo, useState } from "react";
import { Command } from "cmdk";
import { Check, Loader2, Search } from "lucide-react";

import { Button } from "./controls";
import { Popover } from "../layout";
import { cn } from "../utils";

export type EntityLookupOption = Readonly<{
  id: string;
  label: string;
  subtitle?: string;
  description?: string;
  meta?: string;
  disabled?: boolean;
}>;

export function EntityLookup({
  disabled = false,
  emptyMessage = "No matches found.",
  error,
  label,
  loading = false,
  name,
  onSearchChange,
  value,
  options,
  placeholder = "Search...",
  recentOptionIds = [],
  required = false,
  onValueChange,
}: Readonly<{
  label: string;
  value?: string;
  options: readonly EntityLookupOption[];
  disabled?: boolean;
  emptyMessage?: string;
  error?: string;
  loading?: boolean;
  name?: string;
  onSearchChange?: (query: string) => void;
  placeholder?: string;
  recentOptionIds?: readonly string[];
  required?: boolean;
  onValueChange?: (value: string) => void;
}>) {
  const [internalValue, setInternalValue] = useState(value ?? "");
  const isControlled = typeof onValueChange === "function";
  const currentValue = isControlled ? value ?? "" : internalValue;
  const selected = options.find((option) => option.id === currentValue);
  const errorId = name ? `${name}-error` : undefined;
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      [option.label, option.subtitle, option.description, option.meta]
        .filter(Boolean)
        .some((part) => part?.toLowerCase().includes(normalizedQuery)),
    );
  }, [options, query]);
  const recentOptions = useMemo(() => {
    if (query.trim() || recentOptionIds.length === 0) return [];
    const recent = new Set(recentOptionIds);
    return filteredOptions.filter((option) => recent.has(option.id));
  }, [filteredOptions, query, recentOptionIds]);
  const standardOptions = recentOptions.length > 0
    ? filteredOptions.filter((option) => !recentOptions.some((recent) => recent.id === option.id))
    : filteredOptions;

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    onSearchChange?.(nextQuery);
  }

  function handleSelect(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  function renderOption(option: EntityLookupOption) {
    const isSelected = option.id === currentValue;

    return (
      <Command.Item
        className="flex cursor-pointer items-start justify-between gap-3 rounded-md px-3 py-2 text-sm outline-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-[hsl(var(--muted))]"
        disabled={option.disabled}
        key={option.id}
        onSelect={() => handleSelect(option.id)}
        value={`${option.label} ${option.subtitle ?? ""} ${option.description ?? ""} ${option.meta ?? ""}`}
      >
        <div className="min-w-0">
          <p className="truncate font-medium">{option.label}</p>
          {option.subtitle || option.description || option.meta ? (
            <p className="truncate text-xs text-muted-foreground">
              {[option.subtitle, option.description, option.meta].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        {isSelected ? <Check className="mt-0.5 size-4 shrink-0" /> : null}
      </Command.Item>
    );
  }

  return (
    <div className="space-y-1">
      {name ? <input name={name} required={required} type="hidden" value={currentValue} /> : null}
      <Popover
        trigger={
          <Button
            aria-describedby={error && errorId ? errorId : undefined}
            aria-invalid={Boolean(error)}
            className={cn("w-full justify-between", error && "border-[hsl(var(--danger))]")}
            data-field-name={name}
            disabled={disabled}
            type="button"
            variant="secondary"
          >
            <span className="min-w-0 truncate text-start">
              {selected ? (
                <>
                  <span className="block truncate">{selected.label}</span>
                  {selected.subtitle || selected.meta ? (
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {[selected.subtitle, selected.meta].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </>
              ) : label}
            </span>
            {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" /> : <Search className="size-4 shrink-0 text-muted-foreground" />}
          </Button>
        }
      >
        <Command shouldFilter={false}>
          <Command.Input
            className="mb-2 h-10 w-full rounded-md border bg-[hsl(var(--surface))] px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
            disabled={disabled}
            onValueChange={handleQueryChange}
            placeholder={placeholder}
            value={query}
          />
          <Command.List className="max-h-72 overflow-auto">
            <Command.Empty className="px-3 py-4 text-sm text-muted-foreground">
              {loading ? "Loading..." : emptyMessage}
            </Command.Empty>
            {recentOptions.length > 0 ? (
              <Command.Group heading="Recent">
                {recentOptions.map((option) => renderOption(option))}
              </Command.Group>
            ) : null}
            {standardOptions.length > 0 ? (
              <Command.Group heading={recentOptions.length > 0 ? "All" : undefined}>
                {standardOptions.map((option) => renderOption(option))}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
      </Popover>
      {error ? <p className="text-xs text-[hsl(var(--danger))]" id={errorId} role="alert">{error}</p> : null}
      {options.length === 0 && !loading ? <p className="text-xs text-muted-foreground">Create the related record first, then select it here.</p> : null}
    </div>
  );
}
