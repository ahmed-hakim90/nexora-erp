import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const migrationPath = resolve("supabase/migrations/20260625110000_business_document_framework.sql");
const migration = readFileSync(migrationPath, "utf8");
const normalized = migration.replace(/\s+/g, " ").toLowerCase();

const requiredTables = [
  "business_documents",
  "document_types",
  "document_statuses",
  "document_references",
  "document_timeline_events",
  "document_comments",
  "document_attachments",
  "document_print_snapshots",
  "document_export_jobs",
];

const forbiddenTables = [
  "inventory_movements",
  "inventory_transactions",
  "stock_movements",
  "stock_transfers",
  "stock_balances",
  "production_orders",
  "production_reports",
  "work_orders",
  "boms",
  "sales_orders",
  "sales_invoices",
  "purchase_orders",
  "journal_entries",
  "accounting_ledger_entries",
];

const forbiddenDocumentColumnFragments = [
  "invoice",
  "sales",
  "purchase",
  "stock",
  "inventory",
  "production",
  "account",
  "ledger",
  "journal",
];
const allowedGenericColumnNames = new Set(["sort_order"]);

const futureBusinessFeatureNames = [
  "products",
  "product-categories",
  "units",
  "brands",
  "warehouses",
  "warehouse-locations",
  "customers",
  "suppliers",
  "price-lists",
  "tax-profiles",
];

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);
    return stat.isDirectory() ? walk(path) : [path];
  });
}

const createdTables = Array.from(normalized.matchAll(/create table public\.([a-z0-9_]+)/g), (match) => match[1]);
const missingTables = requiredTables.filter((table) => !createdTables.includes(table));
const extraTables = createdTables.filter((table) => !requiredTables.includes(table));
const forbiddenCreatedTables = createdTables.filter((table) => forbiddenTables.includes(table));
const missingRls = requiredTables.filter((table) => !normalized.includes(`alter table public.${table} enable row level security`));
const missingForcedRls = requiredTables.filter((table) => !normalized.includes(`alter table public.${table} force row level security`));
const missingTenantGuards = requiredTables.filter((table) => !normalized.includes(`${table}_prevent_tenant_id_change`));
const missingPolicies = requiredTables.filter((table) => {
  return !normalized.includes(`create policy ${table}_select_member_permission`) ||
    !normalized.includes(`create policy ${table}_insert_member_permission`) ||
    !normalized.includes("public.has_permission") ||
    !normalized.includes("public.is_tenant_member");
});
const unsafeForAllPolicies = Array.from(normalized.matchAll(/create policy ([a-z0-9_]+) on public\.([a-z0-9_]+) for all/g), (match) => `${match[2]}.${match[1]}`);
const unsafeTimelineUpdatePolicy = /create policy [a-z0-9_]+ on public\.document_timeline_events for update/.test(normalized);
const missingPolicyWithCheck = requiredTables.filter((table) => {
  const policyStatements = Array.from(normalized.matchAll(new RegExp(`create policy [^;]+ on public\\.${table} [^;]+;`, "g")), (match) => match[0]);
  const writes = policyStatements.filter((statement) => / for (insert|update) /.test(statement));
  return writes.length === 0 || writes.some((statement) => !statement.includes(" with check "));
});

function tableBody(table) {
  const match = normalized.match(new RegExp(`create table public\\.${table} \\((.*?)\\);`));
  return match?.[1] ?? "";
}

const leakedDomainColumns = requiredTables.flatMap((table) => {
  const body = tableBody(table);
  const columnNames = body
    .split(",")
    .map((line) => line.trim().match(/^([a-z][a-z0-9_]*)\s+/)?.[1])
    .filter(Boolean);

  return columnNames
    .filter((columnName) => !allowedGenericColumnNames.has(columnName))
    .filter((columnName) => forbiddenDocumentColumnFragments.some((fragment) => columnName.includes(fragment)))
    .map((columnName) => `${table}.${columnName}`);
});

const missingIndexes = [
  "document_types_scope_key_active_uq",
  "document_statuses_scope_key_active_uq",
  "business_documents_number_active_uq",
  "business_documents_tenant_status_idx",
  "document_references_reference_idx",
  "document_timeline_events_document_idx",
  "document_comments_document_idx",
  "document_attachments_document_file_active_uq",
  "document_print_snapshots_key_active_uq",
  "document_export_jobs_idempotency_uq",
].filter((indexName) => !normalized.includes(indexName));

const missingNumberingRequirements = [
  "generate_business_document_number",
  "for update",
  "numbering_sequences",
  "document_types",
  "next_value = next_value + 1",
  "coalesce(fiscal_year",
].filter((fragment) => !normalized.includes(fragment));

const missingPermissions = [
  "documents.view",
  "documents.create",
  "documents.update",
  "documents.change_status",
  "documents.comment",
  "documents.attach",
  "documents.print",
  "documents.export",
  "documents.cancel",
  "documents.close",
].filter((permission) => !normalized.includes(`'${permission}'`));

const missingGenericSafety = [
  "create domain public.business_document_generic_key",
  "document_timeline_events_prevent_update",
  "prevent_document_timeline_event_update",
  "tg_table_name = 'document_references' and new.reference_type in ('business_document', 'document')",
  "document reference target tenant must match row tenant",
  "parent comment tenant must match child comment tenant",
  "business document type must be registered for the row scope",
  "business document status must be registered for the document type",
].filter((fragment) => !normalized.includes(fragment));

const placeholderViolations = [
  "preserved_payload",
  "rendered_payload",
  "print_payload",
  "export_payload",
  "file_bucket",
  "storage_path",
].filter((fragment) => normalized.includes(fragment));

const appRoot = join(root, "src/app");
const uiFiles = walk(appRoot).filter((file) => /\.(ts|tsx)$/.test(file));
const supabaseInUi = uiFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return source.includes(".from(") || source.includes("createRequestSupabaseClient") || source.includes("@supabase/supabase-js");
});

const featureRoot = join(root, "src/features/business-documents");
const featureFiles = walk(featureRoot).filter((file) => /\.(ts|tsx)$/.test(file));
const privateFeatureImports = featureFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return futureBusinessFeatureNames.some((feature) => {
    const forbidden = new RegExp(`@/features/${feature}/(?!public-api)`);
    return forbidden.test(source);
  });
});
const serviceFiles = featureFiles.filter((file) => file.includes("/application/services/"));
const futureModuleDependencies = serviceFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return futureBusinessFeatureNames.some((feature) => source.includes(`@/features/${feature}`));
});
const repositoryUsageOutsideInfrastructure = featureFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return !file.includes("/infrastructure/repositories/") &&
    (source.includes(".from(") || source.includes(".rpc(") || source.includes("@supabase/supabase-js"));
});
const repositoryRuleViolations = featureFiles.filter((file) => {
  if (!file.includes("/infrastructure/repositories/")) return false;
  const source = readFileSync(file, "utf8");
  return source.includes("requirePermission(") || source.includes("recordAuditEvent(") || source.includes("assertGenericDocumentKey(");
});
const serviceRuleFiles = [
  "business-document.service.ts",
  "document-attachment.service.ts",
  "document-comment.service.ts",
  "document-number.service.ts",
  "document-print-export.service.ts",
  "document-reference.service.ts",
].map((file) => join(featureRoot, "application/services", file));
const servicesMissingPermissions = serviceRuleFiles.filter((file) => !readFileSync(file, "utf8").includes("requirePermission("));
const servicesMissingRules = [
  "business-document.service.ts",
  "document-attachment.service.ts",
  "document-number.service.ts",
  "document-print-export.service.ts",
  "document-reference.service.ts",
].map((file) => join(featureRoot, "application/services", file))
  .filter((file) => !readFileSync(file, "utf8").includes("assertGenericDocumentKey("));
const actionFile = join(featureRoot, "routes/actions/business-documents.actions.ts");
const actionSource = readFileSync(actionFile, "utf8");
const requiredActionSchemas = [
  "createDocumentShellSchema.parse",
  "updateDocumentMetadataSchema.parse",
  "changeDocumentStatusSchema.parse",
  "addDocumentCommentSchema.parse",
  "addDocumentReferenceSchema.parse",
  "addDocumentAttachmentRelationSchema.parse",
  "createPrintSnapshotPlaceholderSchema.parse",
  "createExportJobPlaceholderSchema.parse",
  "idSchema.parse",
];
const missingActionValidation = requiredActionSchemas.filter((fragment) => !actionSource.includes(fragment));

if (missingTables.length > 0) throw new Error(`Missing Sprint 6 document tables: ${missingTables.join(", ")}`);
if (extraTables.length > 0) throw new Error(`Unexpected Sprint 6 tables: ${extraTables.join(", ")}`);
if (forbiddenCreatedTables.length > 0) throw new Error(`Forbidden business document tables found: ${forbiddenCreatedTables.join(", ")}`);
if (missingRls.length > 0) throw new Error(`Missing RLS enable statements: ${missingRls.join(", ")}`);
if (missingForcedRls.length > 0) throw new Error(`Missing forced RLS statements: ${missingForcedRls.join(", ")}`);
if (missingTenantGuards.length > 0) throw new Error(`Missing immutable tenant triggers: ${missingTenantGuards.join(", ")}`);
if (missingPolicies.length > 0) throw new Error(`Missing permission-aware RLS policies: ${missingPolicies.join(", ")}`);
if (missingPolicyWithCheck.length > 0) throw new Error(`Missing WITH CHECK on write policies: ${missingPolicyWithCheck.join(", ")}`);
if (unsafeForAllPolicies.length > 0) throw new Error(`FOR ALL policies are not allowed: ${unsafeForAllPolicies.join(", ")}`);
if (unsafeTimelineUpdatePolicy) throw new Error("Timeline events must not have an update policy.");
if (missingIndexes.length > 0) throw new Error(`Missing required indexes: ${missingIndexes.join(", ")}`);
if (missingNumberingRequirements.length > 0) throw new Error(`Missing document numbering requirements: ${missingNumberingRequirements.join(", ")}`);
if (missingPermissions.length > 0) throw new Error(`Missing document permissions: ${missingPermissions.join(", ")}`);
if (leakedDomainColumns.length > 0) throw new Error(`Domain-specific document columns found: ${leakedDomainColumns.join(", ")}`);
if (missingGenericSafety.length > 0) throw new Error(`Missing generic safety requirements: ${missingGenericSafety.join(", ")}`);
if (placeholderViolations.length > 0) throw new Error(`Print/export/file placeholder violations found: ${placeholderViolations.join(", ")}`);
if (supabaseInUi.length > 0) throw new Error(`Supabase queries found in UI/app files: ${supabaseInUi.map((file) => file.replace(`${root}/`, "")).join(", ")}`);
if (privateFeatureImports.length > 0) throw new Error(`Private feature imports found in business documents: ${privateFeatureImports.map((file) => file.replace(`${root}/`, "")).join(", ")}`);
if (futureModuleDependencies.length > 0) throw new Error(`Document services depend on future business modules: ${futureModuleDependencies.map((file) => file.replace(`${root}/`, "")).join(", ")}`);
if (repositoryUsageOutsideInfrastructure.length > 0) throw new Error(`Database access outside repositories: ${repositoryUsageOutsideInfrastructure.map((file) => file.replace(`${root}/`, "")).join(", ")}`);
if (repositoryRuleViolations.length > 0) throw new Error(`Repositories contain business rules or permissions: ${repositoryRuleViolations.map((file) => file.replace(`${root}/`, "")).join(", ")}`);
if (servicesMissingPermissions.length > 0) throw new Error(`Services missing server-side permission checks: ${servicesMissingPermissions.map((file) => file.replace(`${root}/`, "")).join(", ")}`);
if (servicesMissingRules.length > 0) throw new Error(`Services missing generic document rules: ${servicesMissingRules.map((file) => file.replace(`${root}/`, "")).join(", ")}`);
if (missingActionValidation.length > 0) throw new Error(`Server actions missing Zod validation: ${missingActionValidation.join(", ")}`);

console.log("Sprint 6 business document framework verification passed.");
