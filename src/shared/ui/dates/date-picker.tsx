"use client";

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import { CalendarIcon, X } from "lucide-react";
import "react-day-picker/style.css";
import "./date-picker.css";

import { Button, Input } from "../primitives";
import { Popover, PopoverContent, PopoverTrigger } from "../primitives/popover";
import { useEnterpriseUi } from "../providers/enterprise-ui-context";
import { cn } from "../utils";
import {
  type CompanyDateFormat,
  dateFnsLocaleFor,
  formatDisplayDate,
  getCalendarNavigationBounds,
  parseIsoDate,
  toIsoDate,
} from "./date-utils";

export type DatePickerMode = "single" | "range" | "datetime";

export type DatePickerProps = Readonly<{
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  className?: string;
  clearable?: boolean;
  dateFormat?: CompanyDateFormat;
  defaultValue?: string;
  defaultValueFrom?: string;
  defaultValueTo?: string;
  disabled?: boolean;
  disabledDates?: Matcher | readonly Matcher[];
  id?: string;
  max?: string;
  min?: string;
  mode?: DatePickerMode;
  name?: string;
  nameFrom?: string;
  nameTo?: string;
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
  onValueChange?: (value: string | undefined) => void;
  onRangeChange?: (value: Readonly<{ from?: string; to?: string }>) => void;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  timeDefaultValue?: string;
  value?: string;
  valueFrom?: string;
  valueTo?: string;
}>;

export type DatePickerFieldProps = DatePickerProps &
  Readonly<{
    description?: string;
    error?: string;
    isRequired?: boolean;
    label: ReactNode;
  }>;

function useDatePickerContext(dateFormat?: CompanyDateFormat) {
  const { dateFormat: contextDateFormat, direction, locale } = useEnterpriseUi();
  return {
    dateFormat: dateFormat ?? contextDateFormat,
    direction,
    locale,
    dateFnsLocale: dateFnsLocaleFor(locale),
  };
}

function normalizeDisabledDates(source: Matcher | readonly Matcher[] | undefined): Matcher[] {
  if (!source) return [];
  if (Array.isArray(source)) return [...source] as Matcher[];
  return [source as Matcher];
}

function HiddenFormInput({
  ariaDescribedBy,
  ariaInvalid,
  id,
  name,
  required,
  value,
}: Readonly<{
  ariaDescribedBy?: string;
  ariaInvalid?: boolean | "true" | "false" | "grammar" | "spelling";
  id?: string;
  name?: string;
  required?: boolean;
  value: string;
}>) {
  if (!name) return null;

  return (
    <input
      aria-describedby={ariaDescribedBy}
      aria-hidden="true"
      aria-invalid={ariaInvalid === true || ariaInvalid === "true" ? true : ariaInvalid === false || ariaInvalid === "false" ? false : ariaInvalid}
      className="pointer-events-none absolute h-px w-px opacity-0"
      id={id}
      name={name}
      readOnly
      required={required && value.length === 0}
      tabIndex={-1}
      type="text"
      value={value}
    />
  );
}

export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  {
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    className,
    clearable = true,
    dateFormat,
    defaultValue,
    defaultValueFrom,
    defaultValueTo,
    disabled = false,
    disabledDates,
    id,
    max,
    min,
    mode = "single",
    name,
    nameFrom,
    nameTo,
    onBlur,
    onRangeChange,
    onValueChange,
    placeholder,
    readOnly = false,
    required = false,
    timeDefaultValue,
    value,
    valueFrom,
    valueTo,
  },
  ref,
) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);

  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const { dateFormat: resolvedFormat, dateFnsLocale, direction, locale } = useDatePickerContext(dateFormat);

  const isControlled = value !== undefined;
  const isRangeControlled = valueFrom !== undefined || valueTo !== undefined;

  const [open, setOpen] = useState(false);
  const [uncontrolledSingleDate, setUncontrolledSingleDate] = useState<Date | undefined>(() => parseIsoDate(defaultValue));
  const [uncontrolledRange, setUncontrolledRange] = useState<DateRange | undefined>(() => ({
    from: parseIsoDate(defaultValueFrom),
    to: parseIsoDate(defaultValueTo),
  }));
  const [timeValue, setTimeValue] = useState(timeDefaultValue ?? "00:00");

  const singleDate = isControlled ? parseIsoDate(value) : uncontrolledSingleDate;
  const range = isRangeControlled
    ? { from: parseIsoDate(valueFrom), to: parseIsoDate(valueTo) }
    : uncontrolledRange;

  const minDate = useMemo(() => parseIsoDate(min), [min]);
  const maxDate = useMemo(() => parseIsoDate(max), [max]);

  const { endMonth, startMonth } = useMemo(
    () => getCalendarNavigationBounds({ max: maxDate, min: minDate }),
    [maxDate, minDate],
  );

  const calendarDefaultMonth = useMemo(() => {
    const selected = mode === "range" ? range?.from : singleDate;
    return selected ?? new Date();
  }, [mode, range?.from, singleDate]);

  const dayPickerNavigationProps = useMemo(
    () => ({
      captionLayout: "dropdown" as const,
      defaultMonth: calendarDefaultMonth,
      endMonth,
      navLayout: "after" as const,
      reverseYears: true,
      startMonth,
    }),
    [calendarDefaultMonth, endMonth, startMonth],
  );

  const disabledMatchers = useMemo(() => {
    const matchers: Matcher[] = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    if (disabledDates) matchers.push(...normalizeDisabledDates(disabledDates));
    return matchers;
  }, [disabledDates, maxDate, minDate]);

  const displaySingle = useMemo(
    () => formatDisplayDate(singleDate, { dateFormat: resolvedFormat, locale }),
    [locale, resolvedFormat, singleDate],
  );

  const displayRange = useMemo(() => {
    const fromLabel = formatDisplayDate(range?.from, { dateFormat: resolvedFormat, locale });
    const toLabel = formatDisplayDate(range?.to, { dateFormat: resolvedFormat, locale });
    if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`;
    if (fromLabel) return `${fromLabel} – …`;
    return "";
  }, [locale, range?.from, range?.to, resolvedFormat]);

  const triggerLabel = mode === "range" ? displayRange : displaySingle;
  const resolvedPlaceholder =
    placeholder ??
    (mode === "range" ? "Select date range" : mode === "datetime" ? "Select date & time" : "Select date");

  function commitSingle(nextDate: Date | undefined) {
    if (!isControlled) setUncontrolledSingleDate(nextDate);
    onValueChange?.(toIsoDate(nextDate) || undefined);
    if (mode !== "datetime") setOpen(false);
  }

  function commitRange(nextRange: DateRange | undefined) {
    if (!isRangeControlled) setUncontrolledRange(nextRange);
    onRangeChange?.({
      from: toIsoDate(nextRange?.from) || undefined,
      to: toIsoDate(nextRange?.to) || undefined,
    });
    if (nextRange?.from && nextRange.to) setOpen(false);
  }

  function handleClear(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (mode === "range") {
      commitRange(undefined);
      return;
    }
    commitSingle(undefined);
  }

  const isInteractive = !disabled && !readOnly;

  return (
    <div className={cn("relative", className)} data-field-name={name ?? nameFrom}>
      <Popover onOpenChange={setOpen} open={open && isInteractive}>
        <PopoverTrigger asChild>
          <button
            aria-describedby={ariaDescribedBy}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(
              "inline-flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-[hsl(var(--surface))] px-3 text-start text-sm shadow-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]",
              readOnly && "cursor-default bg-[hsl(var(--muted))] text-muted-foreground",
              disabled && "cursor-not-allowed opacity-50",
              ariaInvalid && "border-[hsl(var(--danger))]",
              !triggerLabel && "text-muted-foreground",
            )}
            disabled={disabled}
            id={triggerId}
            onBlur={onBlur}
            ref={triggerRef}
            type="button"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <CalendarIcon aria-hidden className="size-4 shrink-0 opacity-70" />
              <span className="truncate">{triggerLabel || resolvedPlaceholder}</span>
            </span>
            {clearable && triggerLabel && isInteractive ? (
              <span
                aria-label="Clear date"
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-[hsl(var(--muted))]"
                onClick={handleClear}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    handleClear(event as unknown as MouseEvent);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <X aria-hidden className="size-3.5" />
              </span>
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="nexora-date-picker w-auto p-0">
          {mode === "range" ? (
            <DayPicker
              {...dayPickerNavigationProps}
              dir={direction}
              disabled={disabledMatchers}
              locale={dateFnsLocale}
              mode="range"
              numberOfMonths={1}
              onSelect={(nextRange) => commitRange(nextRange)}
              selected={range}
              showOutsideDays
            />
          ) : (
            <div className="p-3">
              <DayPicker
                {...dayPickerNavigationProps}
                dir={direction}
                disabled={disabledMatchers}
                locale={dateFnsLocale}
                mode="single"
                onSelect={(nextDate: Date | undefined) => commitSingle(nextDate)}
                required={required}
                selected={singleDate}
                showOutsideDays
              />
              {mode === "datetime" ? (
                <div className="mt-3 border-t pt-3">
                  <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                    <span>Time</span>
                    <Input
                      className="h-9"
                      onChange={(event) => setTimeValue(event.target.value)}
                      type="time"
                      value={timeValue}
                    />
                  </label>
                  <div className="mt-3 flex justify-end">
                    <Button onClick={() => setOpen(false)} size="sm" type="button" variant="primary">
                      Apply
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {mode === "range" ? (
        <>
          <HiddenFormInput
            ariaDescribedBy={ariaDescribedBy}
            ariaInvalid={ariaInvalid}
            name={nameFrom}
            required={required}
            value={toIsoDate(range?.from)}
          />
          <HiddenFormInput name={nameTo} value={toIsoDate(range?.to)} />
        </>
      ) : (
        <HiddenFormInput
          ariaDescribedBy={ariaDescribedBy}
          ariaInvalid={ariaInvalid}
          name={name}
          required={required}
          value={toIsoDate(singleDate)}
        />
      )}
    </div>
  );
});

export function DatePickerField({
  className,
  description,
  error,
  isRequired,
  label,
  required,
  ...pickerProps
}: DatePickerFieldProps) {
  const resolvedRequired = isRequired ?? required ?? false;
  const fieldName = pickerProps.name ?? pickerProps.nameFrom ?? "date";

  return (
    <label className={cn("block space-y-1 text-sm", className)}>
      <span className="font-medium">
        {label}
        {resolvedRequired ? <span aria-hidden="true"> *</span> : null}
      </span>
      {description ? <span className="block text-muted-foreground">{description}</span> : null}
      <DatePicker
        aria-describedby={error ? `${fieldName}-error` : pickerProps["aria-describedby"]}
        aria-invalid={Boolean(error) || pickerProps["aria-invalid"]}
        required={resolvedRequired}
        {...pickerProps}
      />
      {error ? (
        <span className="block text-xs text-[hsl(var(--danger))]" id={`${fieldName}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function DateRangePickerField({
  className,
  description,
  error,
  isRequired,
  label = "Date Range",
  required,
  ...pickerProps
}: Omit<DatePickerFieldProps, "mode">) {
  return (
    <DatePickerField
      className={className}
      description={description}
      error={error}
      isRequired={isRequired}
      label={label}
      mode="range"
      required={required}
      {...pickerProps}
    />
  );
}

export function DateFilterInput({
  className,
  clearable = true,
  name,
  ...props
}: Omit<DatePickerProps, "mode"> & Readonly<{ name: string }>) {
  return (
    <DatePicker
      className={className}
      clearable={clearable}
      mode="single"
      name={name}
      placeholder={props.placeholder ?? "Any date"}
      {...props}
    />
  );
}

export function DateRangeFilterInput({
  className,
  clearable = true,
  fromPlaceholder = "From date",
  nameFrom,
  nameTo,
  toPlaceholder = "To date",
  ...props
}: Omit<DatePickerProps, "mode" | "name"> &
  Readonly<{
    fromPlaceholder?: string;
    nameFrom: string;
    nameTo: string;
    toPlaceholder?: string;
  }>) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <DatePicker clearable={clearable} mode="single" name={nameFrom} placeholder={fromPlaceholder} {...props} />
      <DatePicker clearable={clearable} mode="single" name={nameTo} placeholder={toPlaceholder} {...props} />
    </div>
  );
}

export type { Matcher as DatePickerDisabledMatcher };
