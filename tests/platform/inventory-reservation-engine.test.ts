import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260627194000_inventory_reservation_engine_foundation.sql");
const docPath = path.join(root, "docs/platform/11_INVENTORY_RESERVATION_ENGINE.md");

test("inventory reservation engine migration creates foundation tables, derived availability, and quantity buckets", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of [
    "inventory_reservations",
    "inventory_reservation_lines",
    "inventory_quantity_snapshots",
    "inventory_quantity_events",
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`public\\.is_tenant_member\\(tenant_id\\)`));

    const definition = sql.match(new RegExp(`create table public\\.${table} \\([\\s\\S]*?\\n\\);`))?.[0] ?? "";
    assert.match(definition, /tenant_id uuid not null references public\.tenants\(id\)/);
    assert.match(definition, /company_id uuid not null references public\.companies\(id\)/);
    assert.match(definition, /branch_id uuid/);
    assert.match(definition, /created_at timestamptz not null default now\(\)/);
    assert.match(definition, /updated_at timestamptz not null default now\(\)/);
    assert.match(definition, /deleted_at timestamptz/);
    assert.match(definition, /is_active boolean not null default true/);
    assert.match(definition, /version integer not null default 1 check \(version > 0\)/);
  }

  assert.match(sql, /create or replace view public\.inventory_availability_views as/);
  assert.match(sql, /alter table public\.stock_balances\s+add column quantity_pending_approval/);
  assert.match(sql, /add column quantity_in_transit numeric\(18, 6\) not null default 0/);
  assert.match(sql, /add column quantity_incoming numeric\(18, 6\) not null default 0/);
  assert.match(sql, /add column quantity_outgoing numeric\(18, 6\) not null default 0/);
  assert.match(sql, /add column quantity_damaged numeric\(18, 6\) not null default 0/);
  assert.match(sql, /add column quantity_quarantine numeric\(18, 6\) not null default 0/);
  assert.match(sql, /quantity_available numeric\(18, 6\) generated always as \(/);
  assert.match(sql, /quantity_on_hand\s+- quantity_reserved\s+- quantity_pending_approval\s+- quantity_outgoing\s+- quantity_damaged\s+- quantity_quarantine/);
});

test("inventory reservation engine migration encodes concurrency, idempotency, permissions, and guards", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /create unique index inventory_reservations_idempotency_uq/);
  assert.match(sql, /create unique index inventory_reservation_lines_idempotency_uq/);
  assert.match(sql, /create unique index inventory_quantity_events_idempotency_uq/);
  assert.match(sql, /prevent_manual_stock_balance_quantity_mutation/);
  assert.match(sql, /app\.stock_posting_service/);
  assert.match(sql, /app\.inventory_reservation_engine/);

  for (const permission of [
    "inventory.reservations.view",
    "inventory.reservations.create",
    "inventory.reservations.approve",
    "inventory.reservations.release",
    "inventory.reservations.consume",
    "inventory.reservations.cancel",
    "inventory.reservations.audit",
  ]) {
    assert.match(sql, new RegExp(permission.replaceAll(".", "\\.")));
  }

  for (const eventName of [
    "InventoryReservationRequested",
    "InventoryReservationCreated",
    "InventoryReservationApproved",
    "InventoryReservationReleased",
    "InventoryReservationConsumed",
    "InventoryReservationExpired",
    "InventoryReservationCancelled",
    "InventoryAvailabilityChanged",
    "InventoryTransferIssued",
    "InventoryTransferReceived",
  ]) {
    assert.match(sql, new RegExp(eventName));
  }
});

test("inventory reservation architecture document covers requested deliverables and future runtime boundary", () => {
  const doc = fs.readFileSync(docPath, "utf8");

  for (const heading of [
    "Reservation Architecture Summary",
    "Quantity Model",
    "Reservation Lifecycle",
    "Database Foundation",
    "Platform Integrations",
    "Events",
    "Permissions",
    "Remaining Future Runtime Work",
  ]) {
    assert.match(doc, new RegExp(`## ${heading}`));
  }

  assert.match(doc, /Frontend validation is advisory only and must never be trusted/);
  assert.match(doc, /No runtime handlers are registered by this foundation/);
  assert.match(doc, /Runtime reservation execution is intentionally not implemented yet/);
  assert.match(doc, /accounting, valuation, costing, or warehouse execution/);
});
