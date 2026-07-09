"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrContractPreviewSchema,
  hrContractTypeArchiveSchema,
  hrContractTypeArticlesSaveSchema,
  hrContractTypeCreateSchema,
  hrContractTypeUpdateSchema,
  hrContractTypeVersionActivateSchema,
  hrContractTypeVersionArchiveSchema,
  hrContractTypeVersionCreateSchema,
} from "../../application/schemas/hr-contracts.schema";
import { HrContractTypeService } from "../../application/services/hr-contract-type.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

function contractTypeService() {
  return resolveBranchRequestContext("erp").then(async (context) => {
    const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
    return { context, service: new HrContractTypeService(supabase, context) };
  });
}

function revalidateContractTypeSettings() {
  revalidatePath("/erp/hr/settings");
  revalidatePath("/erp/hr/contracts");
  revalidatePath("/erp/hr/documents");
  revalidatePath("/erp/hr/dashboard");
  revalidatePath("/erp/hr/employees");
}

function parseArticlesJson(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string" || raw.trim() === "") return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed;
}

export async function createContractTypeAction(formData: FormData) {
  const { context, service } = await contractTypeService();
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsManage });

  const parsed = hrContractTypeCreateSchema.parse({
    code: formData.get("code"),
    defaultProbationDays: formData.get("defaultProbationDays") || undefined,
    name: formData.get("name"),
    nameAr: formData.get("nameAr") || undefined,
    requiredDocumentSetId: formData.get("requiredDocumentSetId") || undefined,
    requiresEndDate: formData.get("requiresEndDate") ?? undefined,
  });

  await service.createContractType(parsed);
  revalidateContractTypeSettings();
}

export async function updateContractTypeAction(formData: FormData) {
  const { context, service } = await contractTypeService();
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsManage });

  const parsed = hrContractTypeUpdateSchema.parse({
    code: formData.get("code"),
    contractTypeId: formData.get("contractTypeId"),
    defaultProbationDays: formData.get("defaultProbationDays") || undefined,
    name: formData.get("name"),
    nameAr: formData.get("nameAr") || undefined,
    requiredDocumentSetId: formData.get("requiredDocumentSetId") || undefined,
    requiresEndDate: formData.get("requiresEndDate") ?? undefined,
    status: formData.get("status") || undefined,
  });

  await service.updateContractType(parsed);
  revalidateContractTypeSettings();
}

export async function archiveContractTypeAction(contractTypeId: string) {
  const { context, service } = await contractTypeService();
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsManage });
  hrContractTypeArchiveSchema.parse({ contractTypeId });
  await service.archiveContractType(contractTypeId);
  revalidateContractTypeSettings();
}

export async function createContractTypeVersionAction(formData: FormData) {
  const { context, service } = await contractTypeService();
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsManage });

  const parsed = hrContractTypeVersionCreateSchema.parse({
    changeSummary: formData.get("changeSummary") || undefined,
    contractTypeId: formData.get("contractTypeId"),
    notes: formData.get("notes") || undefined,
    parentVersionId: formData.get("parentVersionId") || undefined,
  });

  await service.createContractTypeVersion(parsed);
  revalidateContractTypeSettings();
}

export async function saveContractTypeArticlesAction(formData: FormData) {
  const { context, service } = await contractTypeService();
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsManage });

  const parsed = hrContractTypeArticlesSaveSchema.parse({
    articles: parseArticlesJson(formData.get("articlesJson")),
    contractTypeVersionId: formData.get("contractTypeVersionId"),
  });

  await service.saveDraftArticles(parsed);
  revalidateContractTypeSettings();
}

export async function activateContractTypeVersionAction(contractTypeVersionId: string) {
  const { context, service } = await contractTypeService();
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsManage });
  hrContractTypeVersionActivateSchema.parse({ contractTypeVersionId });
  await service.activateContractTypeVersion(contractTypeVersionId);
  revalidateContractTypeSettings();
}

export async function archiveContractTypeVersionAction(contractTypeVersionId: string) {
  const { context, service } = await contractTypeService();
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsManage });
  hrContractTypeVersionArchiveSchema.parse({ contractTypeVersionId });
  await service.archiveContractTypeVersion(contractTypeVersionId);
  revalidateContractTypeSettings();
}

export async function previewHireContractTypeVersionAction(contractTypeVersionId: string) {
  const { context, service } = await contractTypeService();
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsView });
  const versionId = z.string().uuid().parse(contractTypeVersionId);
  const snapshot = await service.buildActiveVersionSnapshot(versionId);
  return {
    articles: snapshot.legalTerms.articles,
    contractTypeCode: snapshot.type.code,
    contractTypeName: snapshot.type.name,
    versionNo: snapshot.version.version_no,
  };
}

export async function previewHrContractAction(formData: FormData) {
  const { context, service } = await contractTypeService();
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsView });

  const parsed = hrContractPreviewSchema.parse({
    contractTypeVersionId: formData.get("contractTypeVersionId"),
    employeeId: formData.get("employeeId"),
    endsOn: formData.get("endsOn") || undefined,
    startsOn: formData.get("startsOn"),
  });

  return service.previewContract(parsed);
}
