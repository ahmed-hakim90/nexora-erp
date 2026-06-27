export { businessDocumentsModuleManifest } from "./module.manifest";
export { BUSINESS_DOCUMENT_PERMISSIONS } from "./permissions/permission-registry";
export { createBusinessDocumentServices } from "./routes/service-factory";
export type { BusinessDocumentService } from "./application/services/business-document.service";
export type {
  BusinessDocumentRecord,
  CreateDocumentShellInput,
  UpdateDocumentMetadataInput,
  ChangeDocumentStatusInput,
  DocumentApprovalStatus,
  AddCommentInput,
  AddReferenceInput,
  AddAttachmentRelationInput,
  CreatePrintSnapshotInput,
  CreateExportJobInput,
} from "./application/types";
