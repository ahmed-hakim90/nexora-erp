import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const blueprintPath = path.join(root, "docs/02-business-apps/MANUFACTURING_BLUEPRINT_V2.md");
const manufacturingIndexPath = path.join(root, "docs/02-business-apps/MANUFACTURING.md");

function readBlueprint() {
  return fs.readFileSync(blueprintPath, "utf8");
}

test("Manufacturing Blueprint v2 is linked as the official architecture reference", () => {
  const index = fs.readFileSync(manufacturingIndexPath, "utf8");
  const blueprint = readBlueprint();

  assert.match(index, /Manufacturing Blueprint v2/);
  assert.match(index, /MANUFACTURING_BLUEPRINT_V2\.md/);
  assert.match(blueprint, /^# Manufacturing Blueprint v2/m);
  assert.match(blueprint, /Architecture foundation only/);
  assert.match(blueprint, /does not approve production code, database migrations, UI, CRUD pages/);
});

test("blueprint declares platform alignment and prevents duplicated engine ownership", () => {
  const blueprint = readBlueprint();

  for (const engine of [
    "Platform v1.0",
    "Document Engine",
    "Workflow Engine",
    "Approval Engine",
    "Event Bus",
    "Inventory Foundation",
    "Finance Foundation",
    "Party Foundation",
    "HR Assignment Engine",
    "Cost Engine",
    "Search",
    "Reporting",
    "Dashboard",
    "Background Jobs",
  ]) {
    assert.match(blueprint, new RegExp(engine.replace(".", "\\.")));
  }

  assert.match(blueprint, /Manufacturing must never duplicate a responsibility owned by one of these engines/);
});

test("blueprint defines Manufacturing ownership and non-ownership boundaries", () => {
  const blueprint = readBlueprint();

  for (const owned of [
    "Production planning",
    "Manufacturing orders",
    "Work orders",
    "Operation planning",
    "Routing execution state",
    "BOM usage references",
    "Crew assignment to operations",
    "Production reporting",
    "Downtime reporting",
    "Scrap reporting",
    "Rework reporting",
    "Machine execution status",
    "Production KPI facts",
  ]) {
    assert.match(blueprint, new RegExp(owned));
  }

  for (const notOwned of [
    "Inventory quantities",
    "Inventory valuation",
    "Accounting entries",
    "Payroll",
    "Employee master data",
    "Product master",
    "Warehouses",
    "Cost calculations",
    "Quality release or rejection decisions",
  ]) {
    assert.match(blueprint, new RegExp(notOwned));
  }
});

test("blueprint documents the complete production execution flow and document catalog", () => {
  const blueprint = readBlueprint();

  assert.match(blueprint, /Production Plan\s+-> Manufacturing Order\s+-> Operation Planning\s+-> Crew Assignment\s+-> Material Request\s+-> Warehouse Approval\s+-> Material Issue\s+-> Operation Start\s+-> Production Reporting\s+-> Quality Inspection\s+-> Finished Goods Receipt\s+-> Production Completion/);

  for (const documentName of [
    "Production Plan",
    "Manufacturing Order",
    "Work Order",
    "Operation Plan",
    "Crew Assignment",
    "Material Request",
    "Warehouse Approval",
    "Material Issue",
    "Production Report",
    "Quality Inspection Request",
    "Finished Goods Receipt",
    "Return to Warehouse",
    "Scrap Transfer",
  ]) {
    assert.match(blueprint, new RegExp(`\\| ${documentName} \\|`));
  }
});

test("blueprint requires HR-sourced effective-dated crew assignment without employee duplication", () => {
  const blueprint = readBlueprint();

  assert.match(blueprint, /Workers come from HR/);
  assert.match(blueprint, /Workers are assigned to Operations/);
  assert.match(blueprint, /Crew assignments are effective-dated/);
  assert.match(blueprint, /It must never duplicate employee records/);
  assert.match(blueprint, /Multiple workers are supported/);
  assert.match(blueprint, /Temporary workers are supported/);
  assert.match(blueprint, /Acting workers are supported/);
  assert.match(blueprint, /Replacement workers are supported/);
  assert.match(blueprint, /Shift changes are supported/);
  assert.match(blueprint, /Historical tracking is immutable/);
});

test("blueprint moves target architecture away from per-worker target storage", () => {
  const blueprint = readBlueprint();

  assert.match(blueprint, /forbids per-worker target storage as a canonical target model/);
  assert.match(blueprint, /Standard Crew Size/);
  assert.match(blueprint, /Standard Output/);
  assert.match(blueprint, /Standard Labor Hours/);
  assert.match(blueprint, /Standard Machine Time/);
  assert.match(blueprint, /expected_output = standard_output/);
  assert.match(blueprint, /not payroll logic/);
});

test("blueprint models Production Report as a business document with requested fields and lifecycle", () => {
  const blueprint = readBlueprint();

  assert.match(blueprint, /Production Report is a business document governed by the Document Engine/);
  for (const field of [
    "Manufacturing Order",
    "Operation",
    "Product",
    "Shift",
    "Crew",
    "Machine",
    "Produced Quantity",
    "Scrap Quantity",
    "Rework Quantity",
    "Downtime",
    "Notes",
    "Attachments",
  ]) {
    assert.match(blueprint, new RegExp(field));
  }
  assert.match(blueprint, /Draft -> Submitted -> Approved -> Posted -> Closed/);
});

test("blueprint routes inventory, quality, cost, and finance through their owning engines", () => {
  const blueprint = readBlueprint();

  assert.match(blueprint, /Manufacturing must never modify inventory directly/);
  assert.match(blueprint, /All inventory changes happen through Inventory documents/);
  assert.match(blueprint, /Material Request/);
  assert.match(blueprint, /Material Issue/);
  assert.match(blueprint, /Finished Goods Receipt/);
  assert.match(blueprint, /Return to Warehouse/);
  assert.match(blueprint, /Scrap Transfer/);
  assert.match(blueprint, /Quality is an independent engine/);
  assert.match(blueprint, /Manufacturing requests inspections/);
  assert.match(blueprint, /Quality owns/);
  assert.match(blueprint, /Manufacturing never calculates cost/);
  assert.match(blueprint, /Manufacturing does not create accounting entries/);
});

test("blueprint defines machine hierarchy, events, reporting, security, and guardrails", () => {
  const blueprint = readBlueprint();

  assert.match(blueprint, /Factory\s+-> Production Line\s+-> Work Center\s+-> Workstation\s+-> Machine/);
  assert.match(blueprint, /ManufacturingCrewAssigned/);
  assert.match(blueprint, /ManufacturingProductionReportPosted/);
  assert.match(blueprint, /ManufacturingQualityInspectionRequested/);
  assert.match(blueprint, /Planned vs produced quantity/);
  assert.match(blueprint, /Machine utilization/);
  assert.match(blueprint, /Crew assignment view\/manage\/approve/);
  assert.match(blueprint, /No direct inventory quantity mutation from Manufacturing/);
  assert.match(blueprint, /No per-worker target as canonical target storage/);
});
