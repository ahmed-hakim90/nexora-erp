import { NextResponse } from "next/server";

import { runEntityLookupRequest, resolveEntityLookupScan } from "@/shared/workspace/entity-lookup-runtime.server";
import { getOxLookupProvider } from "@/platform/operator-experience/lookup-providers";

function createJsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  request: Request,
  context: Readonly<{ params: Promise<{ providerKey: string }> }>,
) {
  try {
    const { providerKey } = await context.params;
    const provider = getOxLookupProvider(providerKey);
    if (!provider) {
      return createJsonError("Lookup provider was not found.", 404);
    }

    const url = new URL(request.url);
    const term = url.searchParams.get("term");
    const cursor = url.searchParams.get("cursor");
    const mode = url.searchParams.get("mode");
    const hydrate = url.searchParams.get("hydrate");
    const recent = url.searchParams.get("recent");
    const favorites = url.searchParams.get("favorites");
    const pageSize = url.searchParams.get("pageSize");

    const result = await runEntityLookupRequest({
      cursor,
      favoriteIds: favorites?.split(",").filter(Boolean) ?? [],
      hydrateIds: hydrate?.split(",").filter(Boolean) ?? [],
      mode: mode === "barcode" || mode === "qr" ? mode : "manual",
      pageSize: pageSize ? Number.parseInt(pageSize, 10) : undefined,
      providerKey,
      recentIds: recent?.split(",").filter(Boolean) ?? [],
      term,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup request failed.";
    return createJsonError(message, 500);
  }
}

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ providerKey: string }> }>,
) {
  try {
    const { providerKey } = await context.params;
    const body = await request.json().catch(() => null);
    const term = typeof body?.term === "string" ? body.term : "";
    if (!term.trim()) {
      return createJsonError("Scan term is required.");
    }

    const option = await resolveEntityLookupScan(providerKey, term.trim());
    if (!option) {
      return createJsonError("No matching record was found.", 404);
    }

    return NextResponse.json({ option });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup scan resolution failed.";
    return createJsonError(message, 500);
  }
}
