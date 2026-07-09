"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { Command } from "cmdk";
import { Check, Loader2, Search, X } from "lucide-react";

import { useEntityLookup } from "@/shared/ui/operator-experience/use-entity-lookup";

import { Button } from "./controls";
import { Popover } from "../layout";
import { cn } from "../utils";

export type EntityLookupOption = Readonly<{
  id: string;
  label: string;
  subtitle?: string;
  description?: string;
  meta?: string;
  metadata?: Readonly<Record<string, unknown>>;
  disabled?: boolean;
}>;

function useLookupSelection(
  value: string | undefined,
  onValueChange?: (value: string, option?: EntityLookupOption) => void,
) {
  const [internalValue, setInternalValue] = useState(value ?? "");
  // Uncontrolled when parent only needs a form hidden input (most HR create forms).
  // Controlled when parent manages value via onValueChange.
  const isControlled = typeof onValueChange === "function";
  const currentValue = isControlled ? value ?? "" : internalValue;

  function commitValue(nextValue: string, option?: EntityLookupOption) {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue, option);
  }

  return { commitValue, currentValue };
}

type SharedProps = Readonly<{
  disabled?: boolean;
  emptyMessage?: string;
  error?: string;
  label: string;
  loading?: boolean;
  name?: string;
  placeholder?: string;
  recentOptionIds?: readonly string[];
  required?: boolean;
  value?: string;
  onValueChange?: (value: string, option?: EntityLookupOption) => void;
}>;

type StaticEntityLookupProps = SharedProps & Readonly<{
  providerKey?: never;
  options: readonly EntityLookupOption[];
  onSearchChange?: (query: string) => void;
}>;

type RemoteEntityLookupProps = SharedProps & Readonly<{
  providerKey: string;
  favoriteIds?: readonly string[];
  options?: never;
  onSearchChange?: never;
}>;

export function EntityLookup(props: StaticEntityLookupProps): React.ReactElement;
export function EntityLookup(props: RemoteEntityLookupProps): React.ReactElement;
export function EntityLookup(props: StaticEntityLookupProps | RemoteEntityLookupProps) {
  if ("providerKey" in props && props.providerKey) {
    return <RemoteEntityLookup {...props} />;
  }
  return <StaticEntityLookup {...(props as StaticEntityLookupProps)} />;
}

function RemoteEntityLookup({
  disabled = false,
  emptyMessage,
  error,
  favoriteIds,
  label,
  loading: externalLoading = false,
  name,
  placeholder = "Search...",
  providerKey,
  recentOptionIds,
  required = false,
  value,
  onValueChange,
}: RemoteEntityLookupProps) {
  const [query, setQuery] = useState("");
  const { commitValue, currentValue } = useLookupSelection(value, onValueChange);
  const lookup = useEntityLookup({
    favoriteIds,
    providerKey,
    recentIds: recentOptionIds,
    value: currentValue || undefined,
  });
  const loading = externalLoading || lookup.loading;
  const selected =
    lookup.options.find((option) => option.id === currentValue) ?? undefined;

  return (
    <EntityLookupSurface
      disabled={disabled}
      emptyMessage={emptyMessage ?? lookup.emptyMessage}
      error={error}
      label={label}
      loading={loading}
      loadingMore={lookup.loadingMore}
      name={name}
      onLoadMore={lookup.hasMore ? lookup.loadMore : undefined}
      onSearchChange={(nextQuery) => {
        setQuery(nextQuery);
        lookup.onSearchChange(nextQuery);
      }}
      onValueChange={(nextValue) => {
        const option = lookup.options.find((item) => item.id === nextValue);
        lookup.onValueChange(nextValue);
        commitValue(nextValue, option);
      }}
      options={lookup.options}
      placeholder={placeholder}
      query={query}
      required={required}
      selected={selected}
      value={currentValue}
    />
  );
}

function StaticEntityLookup({
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
}: StaticEntityLookupProps) {
  const { commitValue, currentValue } = useLookupSelection(value, onValueChange);
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
  const selected = options.find((option) => option.id === currentValue);

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    onSearchChange?.(nextQuery);
  }

  return (
    <EntityLookupSurface
      disabled={disabled}
      emptyMessage={emptyMessage}
      error={error}
      label={label}
      loading={loading}
      name={name}
      onSearchChange={handleQueryChange}
      onValueChange={commitValue}
      options={standardOptions}
      placeholder={placeholder}
      query={query}
      recentOptions={recentOptions}
      required={required}
      selected={selected}
      showEmptyHint={options.length === 0 && !loading}
      value={currentValue}
    />
  );
}

function EntityLookupSurface({
  disabled = false,
  emptyMessage = "No matches found.",
  error,
  label,
  loading = false,
  loadingMore = false,
  name,
  onLoadMore,
  onSearchChange,
  options,
  placeholder = "Search...",
  query = "",
  recentOptions = [],
  required = false,
  selected,
  showEmptyHint = false,
  value = "",
  onValueChange,
}: Readonly<{
  disabled?: boolean;
  emptyMessage?: string;
  error?: string;
  label: string;
  loading?: boolean;
  loadingMore?: boolean;
  name?: string;
  onLoadMore?: () => void;
  onSearchChange?: (query: string) => void;
  options: readonly EntityLookupOption[];
  placeholder?: string;
  query?: string;
  recentOptions?: readonly EntityLookupOption[];
  required?: boolean;
  selected?: EntityLookupOption;
  showEmptyHint?: boolean;
  value?: string;
  onValueChange?: (value: string, option?: EntityLookupOption) => void;
}>) {
  const [open, setOpen] = useState(false);
  const currentValue = value;
  const resolvedSelected = selected ?? options.find((option) => option.id === currentValue);
  const errorId = name ? `${name}-error` : undefined;
  const standardOptions = recentOptions.length > 0
    ? options.filter((option) => !recentOptions.some((recent) => recent.id === option.id))
    : options;

  function handleSelect(nextValue: string) {
    onValueChange?.(nextValue);
    setOpen(false);
  }

  function handleClear(event: MouseEvent) {
    event.stopPropagation();
    onValueChange?.("");
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
        onOpenChange={setOpen}
        open={open}
        trigger={
          <div className="flex w-full items-center gap-1">
            <Button
              aria-describedby={error && errorId ? errorId : undefined}
              aria-expanded={open}
              aria-invalid={Boolean(error)}
              className={cn("w-full justify-between", error && "border-[hsl(var(--danger))]")}
              data-field-name={name}
              disabled={disabled}
              type="button"
              variant="secondary"
            >
              <span className="min-w-0 truncate text-start">
                {resolvedSelected ? (
                  <>
                    <span className="block truncate">{resolvedSelected.label}</span>
                    {resolvedSelected.subtitle || resolvedSelected.meta ? (
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {[resolvedSelected.subtitle, resolvedSelected.meta].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </>
                ) : (
                  label
                )}
              </span>
              {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" /> : <Search className="size-4 shrink-0 text-muted-foreground" />}
            </Button>
            {currentValue && !disabled ? (
              <button
                aria-label={`Clear ${label}`}
                className="grid size-9 shrink-0 place-items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-muted-foreground hover:bg-[hsl(var(--muted))] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
                onClick={handleClear}
                type="button"
              >
                <X aria-hidden className="size-4" />
              </button>
            ) : null}
          </div>
        }
      >
        <Command shouldFilter={false}>
          <Command.Input
            className="mb-2 h-10 w-full rounded-md border bg-[hsl(var(--surface))] px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
            disabled={disabled}
            onValueChange={(nextQuery) => onSearchChange?.(nextQuery)}
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
            {onLoadMore ? (
              <div className="border-t px-3 py-2">
                <Button
                  className="w-full"
                  disabled={loadingMore}
                  onClick={onLoadMore}
                  type="button"
                  variant="secondary"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </Command.List>
        </Command>
      </Popover>
      {error ? <p className="text-xs text-[hsl(var(--danger))]" id={errorId} role="alert">{error}</p> : null}
      {showEmptyHint ? <p className="text-xs text-muted-foreground">Create the related record first, then select it here.</p> : null}
    </div>
  );
}
