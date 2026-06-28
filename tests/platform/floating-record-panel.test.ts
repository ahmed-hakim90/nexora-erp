import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sourceFiles(directory: string): string[] {
  const absolute = path.join(root, directory);
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.(ts|tsx)$/u.test(entry.name) ? [entryPath] : [];
  });
}

test("record modal icon controls require tooltip and aria labels", () => {
  const panel = read("src/shared/ui/patterns/floating-record-panel.tsx");

  assert.match(panel, /export function PanelIconButton/);
  assert.match(panel, /aria-label=\{label\}/);
  assert.match(panel, /<Tooltip content=\{tooltip\}>/);
  assert.match(panel, /aria-busy=\{isLoading \|\| undefined\}/);
  assert.match(panel, /disabled=\{disabled \|\| isLoading\}/);
  assert.match(panel, /focus-visible:ring-2/);
});

test("target record panels use icon controls and platform feedback only", () => {
  const productPanel = read("src/app/(erp)/erp/inventory/products/product-record-panel.tsx");
  const financePanel = read("src/app/(erp)/erp/finance/_components/finance-entity-drawer.tsx");
  const dprPanel = read("src/app/(erp)/erp/manufacturing/daily-reports/daily-report-record-panel.tsx");
  for (const source of [productPanel, financePanel, dprPanel]) {
    assert.match(source, /PanelIconButton/);
    assert.match(source, /SaveButtonWithReason/);
    assert.match(source, /label="Save"/);
    if (source !== financePanel && source !== productPanel) assert.match(source, /label="Save as draft"|Save draft/);
    assert.match(source, /label="Save and create another"/);
    assert.match(source, /label="More actions"/);
    assert.match(source, /SaveAuditMetadata/);
    assert.match(source, /AuditActivityTimeline/);
    assert.match(source, /FieldErrorText/);
    assert.match(source, /RequiredFieldMarker/);
    assert.match(source, /ValidationStatusBadge/);
    assert.match(source, /usePlatformFormValidation/);
    assert.match(source, /platform\.feedback\.(success|error)/);
    assert.doesNotMatch(source, /from "sonner"|toast\./);
    assert.doesNotMatch(source, /FloatingRecordPanel/);
    assert.match(source, /RecordFormDialog/);
    assert.doesNotMatch(source, /openFloatingPanel|label="Minimize panel"|label="Maximize panel"|label="Enter fullscreen"|label="Close panel"/);
  }
});

test("global form rule components are shared and exported", () => {
  const form = read("src/shared/ui/form/platform-form.tsx");
  const formIndex = read("src/shared/ui/form/index.ts");
  const patterns = read("src/shared/ui/patterns/index.ts");

  for (const component of [
    "FieldErrorText",
    "FieldWarningText",
    "RequiredFieldMarker",
    "ServerErrorMapper",
    "ValidationStatusBadge",
    "SaveButtonWithReason",
    "UnsavedChangesGuard",
  ]) {
    assert.match(form, new RegExp(component));
    assert.match(formIndex, new RegExp(component));
  }

  for (const component of [
    "RecordFormDialog",
    "RecordFormSection",
    "IconButtonWithTooltip",
    "SaveStatusIndicator",
    "AuditMetadataPanel",
    "AuditActivityTimeline",
  ]) {
    assert.match(patterns, new RegExp(component));
  }
});

test("field-level errors use readable labels instead of technical names", () => {
  const form = read("src/shared/ui/form/platform-form.tsx");
  const productPanel = read("src/app/(erp)/erp/inventory/products/product-record-panel.tsx");
  const financePanel = read("src/app/(erp)/erp/finance/_components/finance-entity-drawer.tsx");
  const dprPanel = read("src/app/(erp)/erp/manufacturing/daily-reports/daily-report-record-panel.tsx");

  assert.match(form, /manufacturingProductId: "Product"/);
  assert.match(form, /productionLineId: "Production Line"/);
  assert.match(form, /reportDate: "Report Date"/);
  assert.match(form, /shiftKey: "Shift"/);
  assert.match(form, /product_id: "Product"/);
  assert.match(form, /productId: "Product"/);
  assert.match(form, /unitId: "UOM"/);
  assert.match(form, /locationId: "Location"/);
  assert.match(form, /warehouse_id: "Warehouse"/);
  assert.match(form, /workCenterId: "Work Center"/);
  assert.match(form, /mapTechnicalErrorMessage/);

  for (const source of [productPanel, financePanel, dprPanel]) {
    assert.doesNotMatch(source, /FormErrorSummary/);
    assert.match(source, /fieldErrorId/);
    assert.doesNotMatch(source, /Please fill the required .*fields: \$\{fields\.join/);
  }

  assert.match(dprPanel, /label: "Product", name: "manufacturingProductId"/);
  assert.match(dprPanel, /label: "Shift", name: "shiftKey"/);
});

test("record modals hide initial validation and reveal field errors by interaction", () => {
  const form = read("src/shared/ui/form/platform-form.tsx");
  const entityLookup = read("src/shared/ui/primitives/entity-lookup.tsx");
  const productPanel = read("src/app/(erp)/erp/inventory/products/product-record-panel.tsx");
  const financePanel = read("src/app/(erp)/erp/finance/_components/finance-entity-drawer.tsx");
  const dprPanel = read("src/app/(erp)/erp/manufacturing/daily-reports/daily-report-record-panel.tsx");

  assert.match(form, /visibleFieldNames/);
  assert.match(form, /hasValidationAttempted/);
  assert.match(form, /validateOnBlur/);
  assert.match(form, /validateOnInput/);
  assert.match(form, /changedFieldName/);
  assert.match(form, /touchedFieldName/);
  assert.match(form, /revealAll/);
  assert.match(form, /saveDisabledReason/);
  assert.match(form, /Complete required fields before saving\./);
  assert.match(form, /\$\{missingRequiredCount\} required fields are missing\./);
  assert.match(form, /Fix validation errors before saving\./);

  assert.match(entityLookup, /aria-describedby=\{error && errorId \? errorId : undefined\}/);
  assert.match(entityLookup, /data-field-name=\{name\}/);
  assert.match(entityLookup, /role="alert"/);

  for (const source of [productPanel, financePanel, dprPanel]) {
    assert.match(source, /validation\.validateOnInput\(event\)/);
    assert.match(source, /onBlur=\{validation\.validateOnBlur\}/);
    assert.match(source, /validateForm\(\{ focusFirstInvalid: true, revealAll: true \}\)/);
    assert.match(source, /allowDisabledAttempt=\{saveBlockedByValidation\}/);
    assert.match(source, /show=\{validation\.hasValidationAttempted\}/);
    assert.match(source, /errorCount=\{validation\.allErrorList\.length\}/);
    assert.doesNotMatch(source, /fields need your attention|field needs your attention/);
  }
});

test("direct sonner imports stay inside platform feedback", () => {
  const offenders = sourceFiles("src")
    .filter((file) => file !== "src/platform/feedback/public-api.tsx")
    .filter((file) => /from "sonner"|toast\./u.test(read(file)));

  assert.deepEqual(offenders, []);
});

test("migrated create and edit forms use shared page-local record dialogs", () => {
  const migratedSurfaces = [
    "src/app/(erp)/erp/inventory/products/product-record-panel.tsx",
    "src/app/(erp)/erp/finance/_components/finance-entity-drawer.tsx",
    "src/app/(erp)/erp/manufacturing/daily-reports/daily-report-record-panel.tsx",
  ];

  for (const file of migratedSurfaces) {
    const source = read(file);
    assert.match(source, /RecordFormDialog/);
    assert.doesNotMatch(source, /openFloatingPanel|<Drawer|DrawerForm/);
    assert.doesNotMatch(source, /StickyToolbar|StickyActions/);
  }
});

test("workspace panel infrastructure is removed from the ERP shell", () => {
  const erpLayout = read("src/app/(erp)/layout.tsx");
  const appShell = read("src/shared/ui/app-shell/app-shell.tsx");
  const patterns = read("src/shared/ui/patterns/index.ts");
  const productPage = read("src/app/(erp)/erp/inventory/products/page.tsx");
  const dprPage = read("src/app/(erp)/erp/manufacturing/daily-reports/page.tsx");
  const financeDrawer = read("src/app/(erp)/erp/finance/_components/finance-entity-drawer.tsx");

  assert.doesNotMatch(erpLayout, /ErpFloatingPanelRoot|FloatingPanelProvider/);
  assert.doesNotMatch(appShell, /WorkspacePanelTabs|FloatingWorkspacePanelLayer/);
  assert.doesNotMatch(patterns, /FloatingPanelProvider|FloatingWorkspacePanelLayer|MinimizedPanelDock|WorkspacePanelTabs|floating-panel-store|floating-workspace-panel-layer/);
  assert.match(productPage, /ProductRecordModalLauncher/);
  assert.match(dprPage, /DailyReportRecordModalLauncher/);
  assert.match(financeDrawer, /RecordFormDialog/);
  assert.doesNotMatch(financeDrawer, /openFloatingPanel|<Drawer/);
});

test("erp shell header and workspace nav stay compact and icon-first", () => {
  const appShell = read("src/shared/ui/app-shell/app-shell.tsx");
  const launcher = read("src/shared/ui/app-shell/application-launcher.tsx");
  const workspaceNav = read("src/shared/ui/app-shell/workspace-nav.tsx");
  const manufacturingShell = read("src/app/(erp)/erp/manufacturing/_components/manufacturing-shell.tsx");
  const shellModel = read("src/app/(erp)/erp-shell-model.ts");
  const globals = read("src/app/globals.css");

  assert.match(appShell, /function TopbarIconButton/);
  assert.match(appShell, /function ContextSwitcher/);
  assert.match(appShell, /function SettingsMenu/);
  assert.match(appShell, /function UserMenuControl/);
  assert.match(appShell, /className="sticky top-0 z-\[50\]/);
  assert.match(appShell, /className="flex h-14/);
  assert.match(globals, /--z-dropdown: 55/);
  assert.match(appShell, /label="Open command palette"/);
  assert.match(appShell, /label="Open notifications"/);
  assert.match(appShell, /Open context switcher/);
  assert.match(appShell, /Open user menu for/);
  assert.match(appShell, /Sign out/);
  assert.doesNotMatch(shellModel, /userMenu:|href: "\/logout"/);

  assert.match(launcher, /title=\{triggerLabel\}/);
  assert.doesNotMatch(launcher, /hidden sm:inline">\{triggerLabel\}/);

  assert.match(workspaceNav, /sticky top-14 z-\[45\]/);
  assert.match(workspaceNav, /fullLabel\?: string/);
  assert.match(workspaceNav, /Tooltip content=\{item\.fullLabel \?\? item\.label\}/);
  assert.match(workspaceNav, /Open more workspace pages/);

  assert.match(manufacturingShell, /label: "DPR"/);
  assert.match(manufacturingShell, /fullLabel: "Daily Production Report"/);
  assert.match(manufacturingShell, /label: "Reports"/);
  assert.match(manufacturingShell, /replace\("Manufacturing Products", "Products"\)/);
  assert.match(manufacturingShell, /replace\("Production Lines", "Lines"\)/);
  assert.match(manufacturingShell, /replace\("Work Centers", "Centers"\)/);
});

test("target modal draft keys are local to record forms", () => {
  const productPanel = read("src/app/(erp)/erp/inventory/products/product-record-panel.tsx");
  const financePanel = read("src/app/(erp)/erp/finance/_components/finance-entity-drawer.tsx");
  const dprPanel = read("src/app/(erp)/erp/manufacturing/daily-reports/daily-report-record-panel.tsx");

  assert.match(productPanel, /nexora\.modalDraft\.inventory\.product/);
  assert.match(financePanel, /nexora\.modalDraft\.finance/);
  assert.match(dprPanel, /nexora\.modalDraft\.manufacturing\.daily-production-report/);
  assert.match(productPanel, /window\.localStorage\.getItem\(localDraftKey\)/);
  assert.match(financePanel, /window\.localStorage\.getItem\(localDraftKey\)/);
  assert.match(dprPanel, /window\.localStorage\.getItem\(localDraftKey\)/);
});

test("product and dpr loaders expose audit metadata columns", () => {
  const productLoader = read("src/features/inventory/routes/loaders/inventory-products.loader.ts");
  const dprLoader = read("src/features/manufacturing/routes/loaders/daily-reports.loader.ts");

  for (const source of [productLoader, dprLoader]) {
    assert.match(source, /created_by/);
    assert.match(source, /updated_by/);
    assert.match(source, /createdBy/);
    assert.match(source, /updatedBy/);
    assert.match(source, /version/);
  }
});
