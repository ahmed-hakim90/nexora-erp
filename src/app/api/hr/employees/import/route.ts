import { NextResponse } from "next/server";

import { ApplicationError } from "@/core/errors";
import { importEmployeesCsvAction } from "@/features/hr/routes/actions/hr-employees.actions";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let formData: FormData;

    if (contentType.includes("multipart/form-data")) {
      formData = await request.formData();
    } else {
      const csv = await request.text();
      formData = new FormData();
      formData.set("csv", csv);
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
