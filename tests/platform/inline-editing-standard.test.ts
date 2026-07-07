import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("edit mode v2 documentation exists and is referenced by inline editing standard", () => {
  const v2 = read("docs/06-guidelines/EDIT_MODE_V2_STANDARD.md");
  const inline = read("docs/06-guidelines/INLINE_EDITING_STANDARD.md");

  assert.match(v2, /EditablePage/);
  assert.match(v2, /useEditablePage/);
  assert.match(v2, /cross-engine/);
  assert.match(v2, /Save Changes/);
  assert.match(inline, /EDIT_MODE_V2_STANDARD\.md/);
});

test("editable page layer is exported", () => {
  const patterns = read("src/shared/ui/patterns/index.ts");

  for (const symbol of [
    "EditablePage",
    "useEditablePage",
    "useEditablePageContext",
    "buildChangedFormData",
    "buildCrossEngineFormData",
    "CrossEngineLookupWorkflow",
    "EditableUnsavedChangesGuard",
  ]) {
    assert.match(patterns, new RegExp(symbol));
  }
});

test("editable profile workspace layer is exported", () => {
  const workspace = read("src/shared/ui/patterns/editable-profile-workspace.tsx");
  const patterns = read("src/shared/ui/patterns/index.ts");

  for (const symbol of [
    "EditableProfileWorkspace",
    "EditableProfileSection",
    "EditableProfileField",
    "buildPatchFormData",
    "inferProfileFieldOwnership",
    "PROFILE_AUDIT_FIELDS",
  ]) {
    assert.match(workspace, new RegExp(symbol));
    assert.match(patterns, new RegExp(symbol));
  }

  assert.match(workspace, /EditablePage/);
  assert.doesNotMatch(workspace, /type="date"/);
});

test("business app detail workspaces adopt edit mode v2 without workflow redirects", () => {
  const adopters = [
    ["finance", "src/app/(erp)/erp/finance/_components/finance-detail-view.tsx"],
    ["master-data", "src/app/(erp)/erp/master-data/_components/master-data-detail-workspace.tsx"],
    ["inventory", "src/app/(erp)/erp/inventory/_components/inventory-foundation-detail-workspace.tsx"],
    ["manufacturing", "src/app/(erp)/erp/manufacturing/_components/manufacturing-detail-workspace.tsx"],
    ["purchasing", "src/app/(erp)/erp/purchasing/_components/purchase-document-detail-workspace.tsx"],
    ["hr", "src/app/(erp)/erp/hr/_components/hr-employee-profile-editable.tsx"],
  ] as const;

  for (const [app, file] of adopters) {
    const source = read(file);
    assert.match(source, /EditableProfileWorkspace|EditablePage/, `${app} should use edit mode v2 components`);
    assert.match(source, /ownership|inferProfileFieldOwnership/, `${app} should declare field ownership`);
    assert.match(source, /renderWorkflow/, `${app} should provide in-page workflow dialogs`);
    assert.doesNotMatch(source, /workflowHref/, `${app} must not redirect for cross-engine edits`);
    assert.doesNotMatch(source, /type="date"/, `${app} must not use native date inputs`);
  }
});

test("readonly ownership is supported by editable field hook", () => {
  const hook = read("src/shared/ui/patterns/use-editable-field.ts");
  assert.match(hook, /"readonly"/);
  assert.match(hook, /"versioned"/);
  assert.match(hook, /ownership === "readonly"/);
});

test("detail pages remove separate edit buttons where inline editing is enabled", () => {
  const inventoryDetail = read("src/app/(erp)/erp/inventory/_components/inventory-foundation-pages.tsx");
  const manufacturingDetail = read("src/app/(erp)/erp/manufacturing/_components/manufacturing-pages.tsx");
  const masterDataDetail = read("src/app/(erp)/erp/master-data/_components/master-data-pages.tsx");
  const financeDetail = read("src/app/(erp)/erp/finance/_components/finance-detail-view.tsx");

  assert.match(inventoryDetail, /InventoryFoundationDetailWorkspace/);
  assert.doesNotMatch(inventoryDetail, /href=\{`\$\{descriptor\.basePath\}\/\$\{String\(record\.id\)\}\/edit`\}/);
  assert.match(manufacturingDetail, /ManufacturingDetailWorkspace/);
  assert.doesNotMatch(manufacturingDetail, /href=\{`\$\{definition\.basePath\}\/\$\{record\.id\}\/edit`\}/);
  assert.match(masterDataDetail, /MasterDataDetailWorkspace/);
  assert.doesNotMatch(masterDataDetail, /href=\{`\$\{config\.basePath\}\/\$\{record\.id\}\/edit`\}/);
  assert.match(financeDetail, /EditableProfileWorkspace/);
  assert.doesNotMatch(financeDetail, /FinanceEntityDrawer/);
});
