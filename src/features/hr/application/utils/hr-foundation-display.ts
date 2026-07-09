import type { HrFoundationDescriptor } from "../foundation-entities";
import { formatHrDisplayLabel } from "./hr-display";

export type HrFoundationLookupOption = Readonly<{ id: string; label: string }>;

type FoundationRow = Record<string, unknown>;

function lookupLabel(
  lookups: Readonly<Record<string, readonly HrFoundationLookupOption[]>>,
  field: HrFoundationDescriptor["fields"][number],
  value: unknown,
) {
  if (!field.lookup || value === null || value === undefined || value === "") return "—";
  const option = lookups[field.lookup]?.find((candidate) => candidate.id === String(value));
  return option?.label ?? "Selected record";
}

export function formatHrFoundationListValue(
  _descriptor: HrFoundationDescriptor,
  lookups: Readonly<Record<string, readonly HrFoundationLookupOption[]>>,
  field: HrFoundationDescriptor["fields"][number],
  record: FoundationRow,
) {
  const value = record[field.column];
  if (field.type === "lookup") return lookupLabel(lookups, field, value);
  if (field.type === "checkbox") return value === true ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  return formatHrDisplayLabel(value);
}
