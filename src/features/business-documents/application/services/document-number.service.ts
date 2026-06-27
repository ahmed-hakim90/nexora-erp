import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { NumberingRepository } from "../ports/business-documents.repository";
import type { GeneratedDocumentNumberRecord } from "../types";
import { assertGenericDocumentKey } from "../../domain/rules/business-documents.rules";
import { BUSINESS_DOCUMENT_PERMISSIONS } from "../../permissions/permission-registry";

export class DocumentNumberService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: NumberingRepository,
  ) {}

  async generate(input: {
    branchId?: string | null;
    documentTypeKey: string;
    fiscalYear?: string | null;
  }): Promise<GeneratedDocumentNumberRecord> {
    await requirePermission({ context: this.context, permission: BUSINESS_DOCUMENT_PERMISSIONS.create });
    assertGenericDocumentKey(input.documentTypeKey, "Document type key");

    return this.repository.generateBusinessDocumentNumber(input);
  }
}
