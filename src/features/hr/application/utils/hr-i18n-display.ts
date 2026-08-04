import type { MessageKey } from "@/platform/localization/messages/en";
import type { TranslateFn } from "@/platform/localization/public-api";

import { formatHrDisplayLabel, formatHrStatusLabel } from "./hr-display";

function normalizeHrToken(value: string): string {
  return value.trim().toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

function translateCatalogKey(t: TranslateFn, prefix: string, value: string, fallback?: string): string {
  const normalized = normalizeHrToken(value);
  if (!normalized) return fallback ?? "—";
  const key = `${prefix}.${normalized}` as MessageKey;
  const translated = t(key);
  if (translated !== key) return translated;
  return fallback ?? formatHrStatusLabel(value);
}

export function translateHrStatus(t: TranslateFn, status: string): string {
  return translateCatalogKey(t, "hr.common.status", status, formatHrStatusLabel(status));
}

export function translateHrActionType(t: TranslateFn, actionType: string): string {
  return translateCatalogKey(t, "hr.actionType", actionType, formatHrStatusLabel(actionType));
}

export function translateHrDocumentType(t: TranslateFn, documentType: string): string {
  return translateCatalogKey(t, "hr.documentType", documentType);
}

export { translateHrRequiredDocumentKind } from "../constants/hr-document-kind.registry";

export function translateHrAssetType(t: TranslateFn, assetType: string): string {
  return translateCatalogKey(t, "hr.assetType", assetType);
}

export function translateHrRequestTypeLabel(
  t: TranslateFn,
  type: Readonly<{ actionType: string; label: string; metadataType?: string }>,
): string {
  if (type.metadataType) {
    const compositeKey = `hr.requestType.${normalizeHrToken(type.actionType)}.${normalizeHrToken(type.metadataType)}` as MessageKey;
    const translated = t(compositeKey);
    if (translated !== compositeKey) return translated;
  }
  return translateCatalogKey(t, "hr.requestType", type.actionType, type.label);
}

export function translateHrViolationKind(t: TranslateFn, violation: string): string {
  return translateCatalogKey(t, "hr.violationKind", violation, formatHrStatusLabel(violation));
}

export function translateHrAdvanceType(t: TranslateFn, advanceType: string): string {
  return translateCatalogKey(t, "hr.advanceType", advanceType, formatHrStatusLabel(advanceType));
}

export function translateHrLoanType(t: TranslateFn, loanType: string): string {
  return translateCatalogKey(t, "hr.loanType", loanType, formatHrStatusLabel(loanType));
}

export function translateHrTimelineEvent(t: TranslateFn, eventType: string): string {
  return translateCatalogKey(t, "hr.timelineEvent", eventType, formatHrStatusLabel(eventType));
}

export function translateHrLiveStatus(t: TranslateFn, status: string): string {
  const normalized = normalizeHrToken(status);
  const key = `hr.attendance.live.status.${normalized}` as MessageKey;
  const translated = t(key);
  if (translated !== key) return translated;
  return translateHrStatus(t, status);
}

export function translateHrPunchType(t: TranslateFn, punchType: string): string {
  const normalized = normalizeHrToken(punchType);
  const key = `hr.attendance.live.punch.${normalized}` as MessageKey;
  const translated = t(key);
  if (translated !== key) return translated;
  return translateHrStatus(t, punchType);
}

export function translateHrExportScope(t: TranslateFn, scope: string): string {
  return translateCatalogKey(t, "hr.attendance.export.scope", scope, formatHrStatusLabel(scope));
}

export function translateHrDocumentComplianceStatus(t: TranslateFn, status: string): string {
  return translateCatalogKey(t, "hr.documentCompliance.status", status, formatHrStatusLabel(status));
}

export function translateHrMessageKey(
  t: TranslateFn,
  key: string,
  params?: Readonly<Record<string, string | number>>,
): string {
  return t(key as MessageKey, params);
}

export function translateHrDisplayValue(t: TranslateFn, value: unknown, fallback = "—"): string {
  const label = formatHrDisplayLabel(value, fallback);
  if (label === fallback) return label;
  return label;
}
