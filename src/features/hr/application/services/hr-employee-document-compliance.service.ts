import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import {
  evaluateEmployeeDocumentCompliance,
  isEmployeeDocumentComplianceIncomplete,
  type HrDocumentComplianceUpload,
  type HrDocumentComplianceWaiverInput,
  type HrEmployeeDocumentCompliance,
} from "../utils/hr-document-compliance.evaluate";
import type { HrRequiredDocumentKind } from "../../template-lifecycle-foundation";
import { HrDocumentComplianceWaiverService } from "./hr-document-compliance-waiver.service";

export type HrCompanyDocumentComplianceRow = Readonly<{
  completeCount: number;
  contractTypeLabel: string;
  employeeId: string;
  employeeLabel: string;
  expiredCount: number;
  missingCount: number;
  resolution: HrEmployeeDocumentCompliance["resolution"];
  totalCount: number;
}>;

export type HrCompanyDocumentComplianceSummary = Readonly<{
  complianceRate: number;
  expiredRequiredDocuments: number;
  incompleteEmployees: number;
  rows: readonly HrCompanyDocumentComplianceRow[];
  totalEmployees: number;
}>;

type ActiveContractRow = Readonly<{
  contract_type: string;
  contract_type_version_id: string | null;
  employee_id: string;
}>;

type ContractTypeRow = Readonly<{
  code: string;
  id: string;
  name: string;
  required_document_set_id: string | null;
}>;

type DocumentSetRow = Readonly<{
  document_kinds: string[] | null;
  id: string;
  name: string;
}>;

export class HrEmployeeDocumentComplianceService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async evaluateEmployee(employeeId: string): Promise<HrEmployeeDocumentCompliance> {
    const [contract, uploads, waivers] = await Promise.all([
      this.loadActiveContract(employeeId),
      this.loadEmployeeUploads(employeeId),
      this.loadWaiversForEmployee(employeeId),
    ]);
    const requirement = await this.resolveRequirementFromContract(contract);
    return evaluateEmployeeDocumentCompliance({
      contractTypeId: requirement.contractTypeId,
      contractTypeLabel: requirement.contractTypeLabel,
      documentSetId: requirement.documentSetId,
      documentSetLabel: requirement.documentSetLabel,
      employeeId,
      hasActiveContract: Boolean(contract),
      requiredKinds: requirement.requiredKinds,
      uploads,
      waivers,
    });
  }

  async evaluateCompanyMatrix(
    query: Readonly<{ departmentId?: string; employeeIds?: readonly string[]; status?: "complete" | "incomplete" }> = {},
  ): Promise<HrCompanyDocumentComplianceSummary> {
    let employeeQuery = this.supabase
      .from("hr_employees")
      .select("id, full_name, employee_number, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("full_name", { ascending: true })
      .limit(100);

    if (query.employeeIds) {
      if (query.employeeIds.length === 0) {
        return { complianceRate: 100, expiredRequiredDocuments: 0, incompleteEmployees: 0, rows: [], totalEmployees: 0 };
      }
      employeeQuery = employeeQuery.in("id", [...query.employeeIds]);
    }

    const { data: employees, error } = await employeeQuery;
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load employees for compliance matrix.", cause: error });
    }

    const employeeRows = employees ?? [];
    const employeeIds = employeeRows.map((row) => String(row.id));
    if (employeeIds.length === 0) {
      return { complianceRate: 100, expiredRequiredDocuments: 0, incompleteEmployees: 0, rows: [], totalEmployees: 0 };
    }

    const [contracts, uploads, waiversByEmployee] = await Promise.all([
      this.loadActiveContractsForEmployees(employeeIds),
      this.loadUploadsForEmployees(employeeIds),
      new HrDocumentComplianceWaiverService(this.supabase, this.context).listActiveWaiversForEmployees(employeeIds),
    ]);

    const versionIds = [...contracts.values()]
      .map((contract) => contract.contract_type_version_id)
      .filter((value): value is string => Boolean(value));
    const versionToTypeId = await this.loadContractTypeIdsByVersionIds(versionIds);

    const contractTypeIds = new Set<string>([...versionToTypeId.values()]);
    const contractTypeCodes = new Set<string>();
    for (const contract of contracts.values()) {
      if (!contract.contract_type_version_id && contract.contract_type) {
        contractTypeCodes.add(String(contract.contract_type).trim().toUpperCase());
      }
    }

    const contractTypesById = await this.loadContractTypesByIds([...contractTypeIds]);
    const contractTypesByCode = await this.loadContractTypesByCodes([...contractTypeCodes]);
    const documentSetIds = new Set<string>();
    for (const type of [...contractTypesById.values(), ...contractTypesByCode.values()]) {
      if (type.required_document_set_id) documentSetIds.add(String(type.required_document_set_id));
    }
    const documentSetsById = await this.loadDocumentSetsByIds([...documentSetIds]);

    const rows: HrCompanyDocumentComplianceRow[] = [];
    let incompleteEmployees = 0;
    let expiredRequiredDocuments = 0;
    let completeEmployees = 0;

    for (const employee of employeeRows) {
      const employeeId = String(employee.id);
      const contract = contracts.get(employeeId) ?? null;
      const requirement = this.resolveRequirementFromLoadedData({
        contract,
        contractTypesByCode,
        contractTypesById,
        documentSetsById,
        versionToTypeId,
      });
      const compliance = evaluateEmployeeDocumentCompliance({
        contractTypeId: requirement.contractTypeId,
        contractTypeLabel: requirement.contractTypeLabel,
        documentSetId: requirement.documentSetId,
        documentSetLabel: requirement.documentSetLabel,
        employeeId,
        hasActiveContract: Boolean(contract),
        requiredKinds: requirement.requiredKinds,
        uploads: uploads.get(employeeId) ?? [],
        waivers: mapWaivers(waiversByEmployee.get(employeeId) ?? []),
      });

      const isResolvable = compliance.resolution === "resolved";
      const isIncomplete = isEmployeeDocumentComplianceIncomplete(compliance);
      if (isResolvable && !isIncomplete) completeEmployees += 1;
      if (isIncomplete) incompleteEmployees += 1;
      expiredRequiredDocuments += compliance.summary.expired;

      if (query.status === "complete" && isIncomplete) continue;
      if (query.status === "incomplete" && !isIncomplete) continue;

      rows.push({
        completeCount: compliance.summary.complete,
        contractTypeLabel: compliance.contractTypeLabel ?? "—",
        employeeId,
        employeeLabel: employee.full_name ? String(employee.full_name) : String(employee.employee_number ?? employeeId),
        expiredCount: compliance.summary.expired,
        missingCount: compliance.summary.missing,
        resolution: compliance.resolution,
        totalCount: compliance.summary.total,
      });
    }

    const resolvableEmployees = employeeRows.filter((employee) => {
      const contract = contracts.get(String(employee.id)) ?? null;
      const requirement = this.resolveRequirementFromLoadedData({
        contract,
        contractTypesByCode,
        contractTypesById,
        documentSetsById,
        versionToTypeId,
      });
      return Boolean(contract) && Boolean(requirement.documentSetId) && requirement.requiredKinds.length > 0;
    }).length;

    const complianceRate =
      resolvableEmployees === 0 ? 100 : Math.round((completeEmployees / resolvableEmployees) * 100);

    return {
      complianceRate,
      expiredRequiredDocuments,
      incompleteEmployees,
      rows,
      totalEmployees: employeeRows.length,
    };
  }

  async countIncompleteEmployees(): Promise<number> {
    const summary = await this.evaluateCompanyMatrix();
    return summary.incompleteEmployees;
  }

  private async loadWaiversForEmployee(employeeId: string): Promise<readonly HrDocumentComplianceWaiverInput[]> {
    const waivers = await new HrDocumentComplianceWaiverService(this.supabase, this.context).listActiveWaiversForEmployee(employeeId);
    return mapWaivers(waivers);
  }

  private async loadActiveContract(employeeId: string): Promise<ActiveContractRow | null> {
    const { data, error } = await this.supabase
      .from("hr_contracts")
      .select("employee_id, contract_type, contract_type_version_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("employee_id", employeeId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("starts_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load active contract.", cause: error });
    }
    if (!data) return null;
    return {
      contract_type: String(data.contract_type),
      contract_type_version_id: data.contract_type_version_id ? String(data.contract_type_version_id) : null,
      employee_id: String(data.employee_id),
    };
  }

  private async loadActiveContractsForEmployees(employeeIds: readonly string[]) {
    const { data, error } = await this.supabase
      .from("hr_contracts")
      .select("employee_id, contract_type, contract_type_version_id, starts_on")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .in("employee_id", [...employeeIds])
      .eq("status", "active")
      .is("deleted_at", null)
      .order("starts_on", { ascending: false });
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load employee contracts.", cause: error });
    }

    const contracts = new Map<string, ActiveContractRow>();
    for (const row of data ?? []) {
      const employeeId = String(row.employee_id);
      if (contracts.has(employeeId)) continue;
      contracts.set(employeeId, {
        contract_type: String(row.contract_type),
        contract_type_version_id: row.contract_type_version_id ? String(row.contract_type_version_id) : null,
        employee_id: employeeId,
      });
    }
    return contracts;
  }

  private async resolveRequirementFromContract(contract: ActiveContractRow | null): Promise<Readonly<{
    contractTypeId?: string;
    contractTypeLabel?: string;
    documentSetId?: string;
    documentSetLabel?: string;
    requiredKinds: readonly HrRequiredDocumentKind[];
  }>> {
    if (!contract) {
      return { requiredKinds: [] };
    }

    let contractType: ContractTypeRow | null = null;
    if (contract.contract_type_version_id) {
      const typeId = await this.resolveContractTypeIdFromVersion(contract.contract_type_version_id);
      if (typeId) {
        contractType = await this.loadContractTypeById(typeId);
      }
    }
    if (!contractType) {
      contractType = await this.loadContractTypeByCode(contract.contract_type);
    }
    if (!contractType?.required_document_set_id) {
      return {
        contractTypeId: contractType?.id,
        contractTypeLabel: contractType?.name,
        requiredKinds: [],
      };
    }

    const documentSet = await this.loadDocumentSetById(contractType.required_document_set_id);
    return {
      contractTypeId: contractType.id,
      contractTypeLabel: contractType.name,
      documentSetId: documentSet.id,
      documentSetLabel: documentSet.name,
      requiredKinds: (documentSet.document_kinds ?? []) as HrRequiredDocumentKind[],
    };
  }

  private resolveRequirementFromLoadedData(input: Readonly<{
    contract: ActiveContractRow | null;
    contractTypesByCode: Map<string, ContractTypeRow>;
    contractTypesById: Map<string, ContractTypeRow>;
    documentSetsById: Map<string, DocumentSetRow>;
    versionToTypeId: Map<string, string>;
  }>) {
    if (!input.contract) return { requiredKinds: [] as const };

    let contractType: ContractTypeRow | undefined;
    if (input.contract.contract_type_version_id) {
      const typeId = input.versionToTypeId.get(input.contract.contract_type_version_id);
      if (typeId) contractType = input.contractTypesById.get(typeId);
    }
    if (!contractType) {
      contractType = input.contractTypesByCode.get(String(input.contract.contract_type).trim().toUpperCase());
    }
    if (!contractType?.required_document_set_id) {
      return {
        contractTypeId: contractType?.id,
        contractTypeLabel: contractType?.name,
        requiredKinds: [] as const,
      };
    }

    const documentSet = input.documentSetsById.get(String(contractType.required_document_set_id));
    return {
      contractTypeId: contractType.id,
      contractTypeLabel: contractType.name,
      documentSetId: documentSet?.id,
      documentSetLabel: documentSet?.name,
      requiredKinds: (documentSet?.document_kinds ?? []) as HrRequiredDocumentKind[],
    };
  }

  private async loadEmployeeUploads(employeeId: string): Promise<readonly HrDocumentComplianceUpload[]> {
    const uploads = await this.loadUploadsForEmployees([employeeId]);
    return uploads.get(employeeId) ?? [];
  }

  private async loadUploadsForEmployees(employeeIds: readonly string[]) {
    const { data, error } = await this.supabase
      .from("file_attachments")
      .select("id, entity_id, file_name, metadata, storage_path, created_at")
      .eq("tenant_id", this.context.tenantId)
      .eq("module_key", "hr")
      .eq("entity_type", "hr_employee_document")
      .in("entity_id", [...employeeIds])
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load employee documents.", cause: error });
    }

    const uploads = new Map<string, HrDocumentComplianceUpload[]>();
    for (const row of data ?? []) {
      const employeeId = String(row.entity_id);
      const metadata = readMetadata(row.metadata);
      const bucket = uploads.get(employeeId) ?? [];
      bucket.push({
        createdAt: String(row.created_at),
        expiresOn: metadata.expiry_date ? String(metadata.expiry_date) : null,
        fileName: String(row.file_name),
        hasStorageFile: Boolean(row.storage_path && !String(row.storage_path).startsWith("hr/documents/")),
        id: String(row.id),
        uploadType: metadata.document_type ? String(metadata.document_type) : "other",
      });
      uploads.set(employeeId, bucket);
    }
    return uploads;
  }

  private async resolveContractTypeIdFromVersion(contractTypeVersionId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("hr_contract_type_versions")
      .select("contract_type_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", contractTypeVersionId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) return null;
    return String(data.contract_type_id);
  }

  private async loadContractTypeById(contractTypeId: string): Promise<ContractTypeRow | null> {
    const map = await this.loadContractTypesByIds([contractTypeId]);
    return map.get(contractTypeId) ?? null;
  }

  private async loadContractTypeByCode(code: string): Promise<ContractTypeRow | null> {
    const map = await this.loadContractTypesByCodes([code]);
    return map.get(code.trim().toUpperCase()) ?? null;
  }

  private async loadContractTypesByIds(ids: readonly string[]) {
    const map = new Map<string, ContractTypeRow>();
    if (ids.length === 0) return map;
    const { data, error } = await this.supabase
      .from("hr_contract_types")
      .select("id, code, name, required_document_set_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .in("id", [...ids])
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load contract types.", cause: error });
    }
    for (const row of data ?? []) {
      map.set(String(row.id), {
        code: String(row.code),
        id: String(row.id),
        name: String(row.name),
        required_document_set_id: row.required_document_set_id ? String(row.required_document_set_id) : null,
      });
    }
    return map;
  }

  private async loadContractTypesByCodes(codes: readonly string[]) {
    const map = new Map<string, ContractTypeRow>();
    if (codes.length === 0) return map;
    const { data, error } = await this.supabase
      .from("hr_contract_types")
      .select("id, code, name, required_document_set_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .in("code", [...codes])
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load contract types by code.", cause: error });
    }
    for (const row of data ?? []) {
      map.set(String(row.code), {
        code: String(row.code),
        id: String(row.id),
        name: String(row.name),
        required_document_set_id: row.required_document_set_id ? String(row.required_document_set_id) : null,
      });
    }
    return map;
  }

  private async loadDocumentSetById(documentSetId: string): Promise<DocumentSetRow> {
    const map = await this.loadDocumentSetsByIds([documentSetId]);
    const documentSet = map.get(documentSetId);
    if (!documentSet) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Required document set not found." });
    }
    return documentSet;
  }

  private async loadDocumentSetsByIds(ids: readonly string[]) {
    const map = new Map<string, DocumentSetRow>();
    if (ids.length === 0) return map;
    const { data, error } = await this.supabase
      .from("hr_required_document_sets")
      .select("id, name, document_kinds")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .in("id", [...ids])
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load document sets.", cause: error });
    }
    for (const row of data ?? []) {
      map.set(String(row.id), {
        document_kinds: (row.document_kinds ?? []) as string[],
        id: String(row.id),
        name: String(row.name),
      });
    }
    return map;
  }

  private async loadContractTypeIdsByVersionIds(versionIds: readonly string[]) {
    const map = new Map<string, string>();
    if (versionIds.length === 0) return map;
    const { data, error } = await this.supabase
      .from("hr_contract_type_versions")
      .select("id, contract_type_id")
      .eq("tenant_id", this.context.tenantId)
      .in("id", [...versionIds])
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load contract type versions.", cause: error });
    }
    for (const row of data ?? []) {
      map.set(String(row.id), String(row.contract_type_id));
    }
    return map;
  }
}

function readMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return metadata as Record<string, unknown>;
}

function mapWaivers(
  waivers: ReadonlyArray<{ documentKind: HrRequiredDocumentKind; id: string; reason: string }>,
): HrDocumentComplianceWaiverInput[] {
  return waivers.map((waiver) => ({
    documentKind: waiver.documentKind,
    id: waiver.id,
    reason: waiver.reason,
  }));
}
