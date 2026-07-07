import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { inventoryReservationListQuerySchema } from "../../application/schemas/inventory-reservation.schema";
import type { InventoryReservationWorkspaceData, InventoryReservationWorkspaceRecord } from "../../application/types/inventory-reservation";
import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";

function encodeCursor(record: { createdAt: string; id: string } | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.createdAt, id: record.id })).toString("base64url");
}

function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof parsed.createdAt === "string" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function mapRecord(
  row: Record<string, unknown>,
  totals: { requestedQuantity: number; reservedQuantity: number; shortageQuantity: number },
): InventoryReservationWorkspaceRecord {
  return {
    correlationId: String(row.correlation_id ?? ""),
    createdAt: String(row.created_at ?? ""),
    demandStatus: row.demand_status ? String(row.demand_status) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    id: String(row.id),
    priority: Number(row.priority ?? 0),
    releaseReason: row.release_reason ? String(row.release_reason) : null,
    releasedAt: row.released_at ? String(row.released_at) : null,
    requestedQuantity: totals.requestedQuantity,
    reservationNumber: String(row.reservation_number ?? ""),
    reservedQuantity: totals.reservedQuantity,
    shortageQuantity: totals.shortageQuantity,
    sourceDocumentReference: row.document_reference ? String(row.document_reference) : null,
    sourceDocumentType: row.source_document_type ? String(row.source_document_type) : row.document_type_key ? String(row.document_type_key) : null,
    sourceModule: String(row.source_module ?? ""),
    status: String(row.status ?? ""),
  };
}

export async function loadInventoryReservationsWorkspace(
  params: Record<string, string | undefined> = {},
): Promise<InventoryReservationWorkspaceData> {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.reservationsView });
  const query = inventoryReservationListQuerySchema.parse(params);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const cursor = decodeCursor(query.cursor);

  let request = supabase
    .from("inventory_reservations")
    .select("id, reservation_number, source_module, demand_status, status, priority, expires_at, source_document_type, document_type_key, document_reference, correlation_id, released_at, release_reason, created_at")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(query.pageSize + 1);

  if (query.demandStatus) request = request.eq("demand_status", query.demandStatus);
  if (query.sourceModule) request = request.eq("source_module", query.sourceModule);
  if (query.search) {
    request = request.or(`reservation_number.ilike.%${query.search}%,document_reference.ilike.%${query.search}%,correlation_id.ilike.%${query.search}%`);
  }
  if (cursor) {
    request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data, error } = await request;
  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: context.correlationId, message: error.message });
  }

  const reservationRows = data ?? [];
  const reservationIds = reservationRows.map((row) => String((row as Record<string, unknown>).id));
  const totalsByReservation = new Map<string, { requestedQuantity: number; reservedQuantity: number; shortageQuantity: number }>();

  if (reservationIds.length > 0) {
    const { data: lineRows, error: lineError } = await supabase
      .from("inventory_reservation_lines")
      .select("reservation_id, requested_quantity, reserved_quantity, shortage_quantity, hard_reserved_quantity")
      .in("reservation_id", reservationIds)
      .is("deleted_at", null);

    if (lineError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: context.correlationId, message: lineError.message });
    }

    for (const line of lineRows ?? []) {
      const row = line as Record<string, unknown>;
      const reservationId = String(row.reservation_id);
      const current = totalsByReservation.get(reservationId) ?? { requestedQuantity: 0, reservedQuantity: 0, shortageQuantity: 0 };
      totalsByReservation.set(reservationId, {
        requestedQuantity: current.requestedQuantity + Number(row.requested_quantity ?? 0),
        reservedQuantity: current.reservedQuantity + Number(row.reserved_quantity ?? row.hard_reserved_quantity ?? 0),
        shortageQuantity: current.shortageQuantity + Number(row.shortage_quantity ?? 0),
      });
    }
  }

  const rows = reservationRows.map((row) => {
    const record = row as Record<string, unknown>;
    const totals = totalsByReservation.get(String(record.id)) ?? { requestedQuantity: 0, reservedQuantity: 0, shortageQuantity: 0 };
    return mapRecord(record, totals);
  });

  const pageRecords = rows.slice(0, query.pageSize);
  const nextCursor = rows.length > query.pageSize
    ? encodeCursor({ createdAt: pageRecords.at(-1)!.createdAt, id: pageRecords.at(-1)!.id })
    : null;

  return { nextCursor, pageSize: query.pageSize, records: pageRecords };
}
