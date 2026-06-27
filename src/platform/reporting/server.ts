import "server-only";

import { ApplicationError } from "@/core/errors";

import type { ReportBuilderSchema, ReportDataset, ReportDefinition } from "./public-api";

export class ReportRegistry {
  private readonly datasets = new Map<string, ReportDataset>();
  private readonly reports = new Map<string, ReportDefinition>();

  registerReportDataset(dataset: ReportDataset): void {
    if (this.datasets.has(dataset.key)) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: `Report dataset ${dataset.key} is already registered.`,
      });
    }

    this.datasets.set(dataset.key, dataset);
  }

  registerReport(report: ReportDefinition): void {
    if (report.datasetKey && !this.datasets.has(report.datasetKey)) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Report ${report.key} references an unknown dataset.`,
      });
    }

    this.reports.set(report.key, report);
  }

  buildReportDefinition(params: {
    key: string;
    mode: ReportDefinition["mode"];
    requiredPermission: string;
    schema: ReportBuilderSchema;
  }): ReportDefinition {
    if (!this.datasets.has(params.schema.datasetKey)) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Report builder schema references an unknown dataset.",
      });
    }

    return {
      builderSchema: params.schema,
      datasetKey: params.schema.datasetKey,
      key: params.key,
      mode: params.mode,
      requiredPermission: params.requiredPermission,
    };
  }
}
