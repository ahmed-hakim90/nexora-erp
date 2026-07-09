import {
  getPrimaryUploadValueForKind,
  normalizeUploadDocumentType,
} from "../constants/hr-document-kind.registry";
import type { HrRequiredDocumentKind } from "../../template-lifecycle-foundation";

export type HrDocumentComplianceItemStatus =
  | "present"
  | "missing"
  | "expired"
  | "expiring_soon"
  | "registered_only"
  | "waived";

export type HrDocumentComplianceUpload = Readonly<{
  createdAt: string;
  expiresOn: string | null;
  fileName: string;
  hasStorageFile: boolean;
  id: string;
  uploadType: string;
}>;

export type HrDocumentComplianceItem = Readonly<{
  attachmentId?: string;
  expiresOn?: string | null;
  fileName?: string;
  kind: HrRequiredDocumentKind;
  mandatory: true;
  status: HrDocumentComplianceItemStatus;
  uploadType?: string;
  uploadedAt?: string;
  waiverId?: string;
  waiverReason?: string;
}>;

export type HrDocumentComplianceResolution =
  | "resolved"
  | "no_active_contract"
  | "no_document_set"
  | "no_requirements";

export type HrEmployeeDocumentCompliance = Readonly<{
  contractTypeId?: string;
  contractTypeLabel?: string;
  documentSetId?: string;
  documentSetLabel?: string;
  employeeId: string;
  items: readonly HrDocumentComplianceItem[];
  resolution: HrDocumentComplianceResolution;
  summary: Readonly<{
    complete: number;
    expired: number;
    missing: number;
    total: number;
  }>;
}>;

const EXPIRING_SOON_DAYS = 30;

function addDaysIso(days: number, from = new Date()): string {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function classifyUpload(
  upload: HrDocumentComplianceUpload,
  referenceDate = todayIso(),
): HrDocumentComplianceItemStatus {
  if (!upload.hasStorageFile) return "registered_only";
  if (upload.expiresOn && upload.expiresOn < referenceDate) return "expired";
  if (upload.expiresOn && upload.expiresOn <= addDaysIso(EXPIRING_SOON_DAYS)) return "expiring_soon";
  return "present";
}

function isCompleteStatus(status: HrDocumentComplianceItemStatus): boolean {
  return status === "present" || status === "expiring_soon" || status === "waived";
}

export type HrDocumentComplianceWaiverInput = Readonly<{
  documentKind: HrRequiredDocumentKind;
  id: string;
  reason: string;
}>;

export function evaluateEmployeeDocumentCompliance(input: Readonly<{
  contractTypeId?: string | null;
  contractTypeLabel?: string | null;
  documentSetId?: string | null;
  documentSetLabel?: string | null;
  employeeId: string;
  hasActiveContract: boolean;
  requiredKinds: readonly HrRequiredDocumentKind[];
  uploads: readonly HrDocumentComplianceUpload[];
  referenceDate?: string;
  waivers?: readonly HrDocumentComplianceWaiverInput[];
}>): HrEmployeeDocumentCompliance {
  const referenceDate = input.referenceDate ?? todayIso();

  if (!input.hasActiveContract) {
    return emptyCompliance(input.employeeId, "no_active_contract", input);
  }
  if (!input.documentSetId) {
    return emptyCompliance(input.employeeId, "no_document_set", input);
  }
  if (input.requiredKinds.length === 0) {
    return emptyCompliance(input.employeeId, "no_requirements", input);
  }

  const uploadsByKind = new Map<HrRequiredDocumentKind, HrDocumentComplianceUpload[]>();
  for (const upload of input.uploads) {
    const kind = normalizeUploadDocumentType(upload.uploadType);
    if (!kind) continue;
    const bucket = uploadsByKind.get(kind) ?? [];
    bucket.push(upload);
    uploadsByKind.set(kind, bucket);
  }

  const waiversByKind = new Map<HrRequiredDocumentKind, HrDocumentComplianceWaiverInput>();
  for (const waiver of input.waivers ?? []) {
    waiversByKind.set(waiver.documentKind, waiver);
  }

  const items: HrDocumentComplianceItem[] = input.requiredKinds.map((kind) => {
    const waiver = waiversByKind.get(kind);
    if (waiver) {
      return {
        kind,
        mandatory: true,
        status: "waived",
        waiverId: waiver.id,
        waiverReason: waiver.reason,
      };
    }

    const candidates = (uploadsByKind.get(kind) ?? []).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const best = candidates.find((upload) => classifyUpload(upload, referenceDate) !== "expired") ?? candidates[0];
    if (!best) {
      return { kind, mandatory: true, status: "missing" };
    }
    const status = classifyUpload(best, referenceDate);
    return {
      attachmentId: best.id,
      expiresOn: best.expiresOn,
      fileName: best.fileName,
      kind,
      mandatory: true,
      status,
      uploadType: getPrimaryUploadValueForKind(kind),
      uploadedAt: best.createdAt,
    };
  });

  const summary = {
    complete: items.filter((item) => isCompleteStatus(item.status)).length,
    expired: items.filter((item) => item.status === "expired").length,
    missing: items.filter((item) => item.status === "missing" || item.status === "registered_only").length,
    total: items.length,
  };

  return {
    contractTypeId: input.contractTypeId ?? undefined,
    contractTypeLabel: input.contractTypeLabel ?? undefined,
    documentSetId: input.documentSetId ?? undefined,
    documentSetLabel: input.documentSetLabel ?? undefined,
    employeeId: input.employeeId,
    items,
    resolution: "resolved",
    summary,
  };
}

function emptyCompliance(
  employeeId: string,
  resolution: HrDocumentComplianceResolution,
  input: Readonly<{
    contractTypeId?: string | null;
    contractTypeLabel?: string | null;
    documentSetId?: string | null;
    documentSetLabel?: string | null;
  }>,
): HrEmployeeDocumentCompliance {
  return {
    contractTypeId: input.contractTypeId ?? undefined,
    contractTypeLabel: input.contractTypeLabel ?? undefined,
    documentSetId: input.documentSetId ?? undefined,
    documentSetLabel: input.documentSetLabel ?? undefined,
    employeeId,
    items: [],
    resolution,
    summary: { complete: 0, expired: 0, missing: 0, total: 0 },
  };
}

export function isEmployeeDocumentComplianceIncomplete(compliance: HrEmployeeDocumentCompliance): boolean {
  if (compliance.resolution !== "resolved") return false;
  return compliance.summary.missing > 0 || compliance.summary.expired > 0;
}
