import "server-only";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrRequiredDocumentSetArchiveSchema,
  hrRequiredDocumentSetCreateSchema,
  hrRequiredDocumentSetUpdateSchema,
  parseDocumentKindsFromFormData,
} from "../../application/schemas/hr-required-document-set.schema";
import { HrRequiredDocumentSetService } from "../../application/services/hr-required-document-set.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

async function documentSetService() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrRequiredDocumentSetService(supabase, context) };
}

function revalidateDocumentSetSettings() {
  revalidatePath("/erp/hr/settings");
  revalidatePath("/erp/hr/documents");
  revalidatePath("/erp/hr/dashboard");
  revalidatePath("/erp/hr/employees");
}

export async function createRequiredDocumentSetAction(formData: FormData) {
  const { context, service } = await documentSetService();
  await requirePermission({ context, permission: HR_PERMISSIONS.templatesManage });

  const parsed = hrRequiredDocumentSetCreateSchema.parse({
    code: formData.get("code"),
    documentKinds: parseDocumentKindsFromFormData(formData),
    name: formData.get("name"),
    status: formData.get("status") || "active",
  });

  await service.createDocumentSet(parsed);
  revalidateDocumentSetSettings();
}

export async function updateRequiredDocumentSetAction(formData: FormData) {
  const { context, service } = await documentSetService();
  await requirePermission({ context, permission: HR_PERMISSIONS.templatesManage });

  const parsed = hrRequiredDocumentSetUpdateSchema.parse({
    code: formData.get("code"),
    documentKinds: parseDocumentKindsFromFormData(formData),
    documentSetId: formData.get("documentSetId"),
    name: formData.get("name"),
    status: formData.get("status") || "active",
  });

  await service.updateDocumentSet(parsed);
  revalidateDocumentSetSettings();
}

export async function archiveRequiredDocumentSetAction(documentSetId: string) {
  const { context, service } = await documentSetService();
  await requirePermission({ context, permission: HR_PERMISSIONS.templatesManage });
  hrRequiredDocumentSetArchiveSchema.parse({ documentSetId });
  await service.archiveDocumentSet(documentSetId);
  revalidateDocumentSetSettings();
}
