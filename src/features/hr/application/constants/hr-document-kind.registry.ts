import type { MessageKey } from "@/platform/localization/messages/en";
import type { TranslateFn } from "@/platform/localization/public-api";

import { HR_REQUIRED_DOCUMENT_KINDS, type HrRequiredDocumentKind } from "../../template-lifecycle-foundation";

export type HrDocumentUploadType = Readonly<{
  label: string;
  requiredKind: HrRequiredDocumentKind;
  value: string;
}>;

type HrDocumentKindDefinition = Readonly<{
  expiryRequired: boolean;
  primaryUploadValue: string;
  requiredKind: HrRequiredDocumentKind;
  uploadValues: readonly string[];
}>;

const HR_DOCUMENT_KIND_DEFINITIONS: readonly HrDocumentKindDefinition[] = [
  { expiryRequired: true, primaryUploadValue: "national_id", requiredKind: "national_id", uploadValues: ["national_id"] },
  { expiryRequired: true, primaryUploadValue: "passport", requiredKind: "passport", uploadValues: ["passport"] },
  { expiryRequired: true, primaryUploadValue: "work_permit", requiredKind: "residence", uploadValues: ["work_permit", "residence"] },
  { expiryRequired: false, primaryUploadValue: "contract_copy", requiredKind: "contract", uploadValues: ["contract_copy", "contract"] },
  { expiryRequired: true, primaryUploadValue: "medical_certificate", requiredKind: "medical", uploadValues: ["medical_certificate", "medical"] },
  { expiryRequired: false, primaryUploadValue: "qualifications", requiredKind: "qualifications", uploadValues: ["qualifications", "certificate"] },
  { expiryRequired: true, primaryUploadValue: "driving_license", requiredKind: "driving_license", uploadValues: ["driving_license"] },
  { expiryRequired: false, primaryUploadValue: "certificates", requiredKind: "certificates", uploadValues: ["certificates", "certificate"] },
  { expiryRequired: false, primaryUploadValue: "other", requiredKind: "other", uploadValues: ["other"] },
] as const;

const uploadValueToKind = new Map<string, HrRequiredDocumentKind>();
const kindToDefinition = new Map<HrRequiredDocumentKind, HrDocumentKindDefinition>();

for (const definition of HR_DOCUMENT_KIND_DEFINITIONS) {
  kindToDefinition.set(definition.requiredKind, definition);
  for (const uploadValue of definition.uploadValues) {
    uploadValueToKind.set(normalizeDocumentToken(uploadValue), definition.requiredKind);
  }
}

function normalizeDocumentToken(value: string): string {
  return value.trim().toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

export function normalizeUploadDocumentType(value: string): HrRequiredDocumentKind | null {
  const normalized = normalizeDocumentToken(value);
  if (!normalized) return null;
  return uploadValueToKind.get(normalized) ?? null;
}

export function getPrimaryUploadValueForKind(kind: HrRequiredDocumentKind): string {
  return kindToDefinition.get(kind)?.primaryUploadValue ?? kind;
}

export function isExpiryRequiredForKind(kind: HrRequiredDocumentKind): boolean {
  return kindToDefinition.get(kind)?.expiryRequired ?? false;
}

export function listRequiredDocumentKinds(): readonly HrRequiredDocumentKind[] {
  return HR_REQUIRED_DOCUMENT_KINDS;
}

export function listUploadDocumentTypeOptions(): readonly HrDocumentUploadType[] {
  return HR_DOCUMENT_KIND_DEFINITIONS.map((definition) => ({
    label: definition.primaryUploadValue,
    requiredKind: definition.requiredKind,
    value: definition.primaryUploadValue,
  }));
}

export function translateHrRequiredDocumentKind(t: TranslateFn, kind: HrRequiredDocumentKind | string): string {
  const uploadValue = getPrimaryUploadValueForKind(kind as HrRequiredDocumentKind);
  const key = `hr.documentType.${normalizeDocumentToken(uploadValue)}` as MessageKey;
  const translated = t(key);
  if (translated !== key) return translated;
  return uploadValue;
}

export { HR_REQUIRED_DOCUMENT_KINDS };
