import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const contractsPath = resolve("src/features/business-contracts/public-api.ts");
const contracts = readFileSync(contractsPath, "utf8");
const srcFiles = listFiles(resolve("src")).filter((path) => /\.(ts|tsx)$/.test(path));
const migrationFiles = existsSync(resolve("supabase/migrations"))
  ? listFiles(resolve("supabase/migrations")).filter((path) => path.endsWith(".sql"))
  : [];

const requiredContractFunctions = [
  "checkAvailableStock",
  "checkCanReserveStock",
  "getStockAvailabilitySnapshot",
  "createReservationDraft",
  "confirmReservation",
  "releaseReservation",
  "cancelReservation",
  "postInventoryTransaction",
  "reverseInventoryPosting",
  "getPostingStatus",
  "getPurchaseOrderReceivingStatus",
  "getOpenPurchaseOrderLines",
  "receivePurchaseOrderLines",
  "reversePurchaseReceipt",
  "getProductForBusinessUse",
  "validateProductIsStockable",
  "validateProductIsPurchasable",
  "validateProductIsSellable",
  "validateProductIsManufacturable",
  "createBusinessDocumentShell",
  "transitionBusinessDocument",
  "attachDocumentReference",
  "getDocumentStatus",
];

for (const functionName of requiredContractFunctions) {
  const declaration = new RegExp(`export\\s+async\\s+function\\s+${functionName}\\s*\\(`);
  if (!declaration.test(contracts)) throw new Error(`Missing public business contract function: ${functionName}`);
}

for (const functionName of requiredContractFunctions) {
  const signature = new RegExp(`export\\s+async\\s+function\\s+${functionName}[\\s\\S]*?\\):\\s*Promise<[^>]*DTO(?:\\[\\])?>`);
  if (!signature.test(contracts)) throw new Error(`Contract function must return an explicit DTO type: ${functionName}`);
}

for (const required of [
  "createInventoryFoundationService",
  "createInventoryTransactionServices",
  "createPurchasingService",
  "createProductService",
  "createBusinessDocumentServices",
]) {
  if (!contracts.includes(required)) throw new Error(`Business contracts must delegate through public service boundary: ${required}`);
}

if (!contracts.includes("resolveTenantRequestContext")) {
  throw new Error("Business contracts must validate tenant context.");
}

if (!contracts.includes("requirePermission")) {
  throw new Error("Reservation contracts without persisted services must still enforce permissions server-side.");
}

const forbiddenContractFragments = [
  "/application/services/",
  "/application/ports/",
  "/infrastructure/",
  "/routes/",
  "Repository",
  "repository",
  "Supabase",
  "supabase",
  ".from(",
  ".rpc(",
  "tenant_id",
  "branch_id",
  "deleted_at",
];

for (const fragment of forbiddenContractFragments) {
  if (contracts.includes(fragment)) throw new Error(`Forbidden contract boundary leak found: ${fragment}`);
}

for (const requiredType of [
  "StockAvailabilitySnapshotDTO",
  "InventoryReservationDTO",
  "InventoryPostingStatusDTO",
  "PurchaseOrderReceivingStatusDTO",
  "PurchaseReceiptDTO",
  "ProductForBusinessUseDTO",
  "ProductCapabilityValidationDTO",
  "BusinessDocumentStatusDTO",
  "DocumentReferenceAttachmentDTO",
]) {
  if (!contracts.includes(`export type ${requiredType}`)) throw new Error(`Missing contract DTO: ${requiredType}`);
}

const forbiddenModuleDirs = [
  "src/features/sales",
  "src/features/production",
  "src/features/accounting",
  "src/features/supplier-invoices",
  "src/app/(erp)/erp/sales",
  "src/app/(erp)/erp/production",
  "src/app/(erp)/erp/accounting",
  "src/app/(erp)/erp/supplier-invoices",
];

for (const dir of forbiddenModuleDirs) {
  if (existsSync(resolve(dir))) throw new Error(`Forbidden Sprint 11.5 module was created: ${dir}`);
}

for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");
  if (file.includes("/src/features/") && /@\/features\/[^/]+\/(application|infrastructure|routes|domain)\//.test(text)) {
    throw new Error(`Private cross-feature import found: ${file}`);
  }
  if (file.includes("/src/features/business-contracts/") && /createRequestSupabaseClient|@supabase\/supabase-js|\.from\(|\.rpc\(/.test(text)) {
    throw new Error(`Supabase access found inside business contract: ${file}`);
  }
}

for (const file of migrationFiles) {
  const text = readFileSync(file, "utf8");
  for (const forbiddenTable of [
    "sales_",
    "production_",
    "accounting_",
    "supplier_invoice",
    "stock_reservation",
    "inventory_reservation",
  ]) {
    const createForbiddenTable = new RegExp(`create\\s+table\\s+public\\.[a-z0-9_]*${forbiddenTable}`, "i");
    if (createForbiddenTable.test(text)) {
      throw new Error(`Forbidden Sprint 11.5 workflow table found in migration: ${file}`);
    }
  }
}

console.log("Sprint 11.5 public business contracts verification passed.");

function listFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return listFiles(path);
    return [path];
  });
}
