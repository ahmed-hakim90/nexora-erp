import { NextResponse } from "next/server";

import {
  loadCurrentWorkspacePreferences,
  saveCurrentWorkspacePreferences,
} from "@/shared/workspace/preferences.server";

function createJsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const preferences = await loadCurrentWorkspacePreferences();

    return NextResponse.json(preferences);
  } catch {
    return createJsonError("Workspace preferences could not be loaded.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || !("preferences" in body)) {
      return createJsonError("Workspace preferences are required.");
    }

    const preferences = await saveCurrentWorkspacePreferences(body.preferences);

    return NextResponse.json(preferences);
  } catch {
    return createJsonError("Workspace preferences could not be saved.", 500);
  }
}
