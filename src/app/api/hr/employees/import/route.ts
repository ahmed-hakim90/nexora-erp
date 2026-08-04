import { NextResponse } from "next/server";

import { ApplicationError } from "@/core/errors";
import {
  commitEmployeesImportAction,
  importEmployeesCsvAction,
  previewEmployeesCsvAction,
} from "@/features/hr/routes/actions/hr-employees.actions";
import type { HrEmployeeImportCommitRow } from "@/features/hr/server-api";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        mode?: string;
        rows?: HrEmployeeImportCommitRow[];
      };
      const mode = body.mode ?? "commit";
      if (mode !== "commit") {
        return NextResponse.json(
          { message: "JSON body only supports mode=commit.", success: false },
          { status: 400 },
        );
      }
      const result = await commitEmployeesImportAction({ rows: body.rows ?? [] });
      return NextResponse.json(result);
    }

    let formData: FormData;
    if (contentType.includes("multipart/form-data")) {
      formData = await request.formData();
    } else {
      const csv = await request.text();
      formData = new FormData();
      formData.set("csv", csv);
    }

    const mode = String(formData.get("mode") ?? "import");
    if (mode === "preview") {
      const result = await previewEmployeesCsvAction(formData);
      return NextResponse.json(result);
    }

    if (mode === "commit") {
      const rawRows = formData.get("rows");
      const rows =
        typeof rawRows === "string"
          ? (JSON.parse(rawRows) as HrEmployeeImportCommitRow[])
          : [];
      const result = await commitEmployeesImportAction({ rows });
      return NextResponse.json(result);
    }

    const result = await importEmployeesCsvAction(formData);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
          success: false,
        },
        { status: error.code === "VALIDATION_ERROR" ? 400 : 500 },
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Import failed.",
        success: false,
      },
      { status: 500 },
    );
  }
}
