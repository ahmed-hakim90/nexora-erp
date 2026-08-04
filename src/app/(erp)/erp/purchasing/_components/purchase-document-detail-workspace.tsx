"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import type { PurchaseDocumentDetail } from "@/features/purchasing/public-api";
import { patchPurchaseDocumentFieldAction } from "@/features/purchasing/routes/actions/purchasing.actions";
import {
  CrossEngineLookupWorkflow,
  EditableProfileWorkspace,
  useEditablePageContext,
  type ProfileFieldDefinition,
  type ProfileSectionDefinition,
} from "@/shared/ui";

function labelFor(options: readonly { id: string; label: string }[], value: string | null | undefined) {
  if (!value) return "—";
  return options.find((option) => option.id === value)?.label ?? value;
}

export function PurchaseDocumentDetailWorkspace({
  canManage = true,
  detail,
  lookups,
}: Readonly<{
  canManage?: boolean;
  detail: PurchaseDocumentDetail;
  lookups: Readonly<{
    branches: readonly { id: string; label: string }[];
    suppliers: readonly { id: string; label: string }[];
    purchaseOrders: readonly { id: string; label: string }[];
  }>;
}>) {
  const router = useRouter();
  const { document } = detail;
  const isDraft = document.status === "draft";
  const record = useMemo(
    () => ({
      branchId: document.branchId,
      createdAt: document.createdAt,
      documentDate: document.documentDate,
      id: document.id,
      purchaseOrderId: document.purchaseOrderId,
      status: document.status,
      supplierId: document.supplierId,
      title: document.title,
      updatedAt: document.updatedAt,
      version: document.version,
    }),
    [document],
  );

  const generalFields = useMemo<readonly ProfileFieldDefinition[]>(
    () => [
      {
        name: "title",
        label: "Title",
        editorType: "text",
        ownership: isDraft ? "entity" : "readonly",
      },
      {
        name: "documentDate",
        label: "Document date",
        editorType: "date",
        ownership: isDraft ? "entity" : "readonly",
      },
      {
        name: "status",
        label: "Status",
        ownership: "readonly",
        formatDisplay: (value) => String(value ?? "—"),
      },
    ],
    [isDraft],
  );

  const assignmentFields = useMemo<readonly ProfileFieldDefinition[]>(
    () => [
      {
        name: "branchId",
        label: "Branch",
        editorType: "entity-lookup",
        lookupOptions: lookups.branches,
        ownership: "cross-engine",
        workflowKey: "branch-assignment",
        workflowTitle: "Branch Assignment",
        formatDisplay: (value) => labelFor(lookups.branches, value ? String(value) : null),
      },
      {
        name: "supplierId",
        label: "Supplier",
        editorType: "entity-lookup",
        lookupOptions: lookups.suppliers,
        ownership: "cross-engine",
        workflowKey: "supplier-assignment",
        workflowTitle: "Supplier Assignment",
        formatDisplay: (value) => labelFor(lookups.suppliers, value ? String(value) : null),
      },
      {
        name: "purchaseOrderId",
        label: "Purchase order",
        editorType: "entity-lookup",
        lookupOptions: lookups.purchaseOrders,
        ownership: "cross-engine",
        workflowKey: "purchase-order-assignment",
        workflowTitle: "Purchase Order Assignment",
        formatDisplay: (value) => labelFor(lookups.purchaseOrders, value ? String(value) : null),
      },
    ],
    [lookups],
  );

  const sections = useMemo<readonly ProfileSectionDefinition[]>(
    () => [
      { key: "general", title: "General Information", fields: generalFields },
      { key: "assignments", title: "Assignments", description: "Cross-engine links open the owning workspace.", fields: assignmentFields },
    ],
    [assignmentFields, generalFields],
  );

  return (
    <EditableProfileWorkspace
      canEdit={canManage && isDraft}
      entityId={document.id}
      entityLabel={document.title}
      entityType={`purchasing_${document.kind}`}
      fields={[...generalFields, ...assignmentFields]}
      lastUpdated={document.updatedAt}
      record={record}
      renderWorkflow={(fieldName) => (
        <PurchaseDocumentCrossEngineWorkflow
          assignmentFields={assignmentFields}
          document={document}
          fieldName={fieldName}
          record={record}
        />
      )}
      saveStrategy="changed-only"
      sections={sections}
      showAuditSection
      onSave={async (formData, changedFields = []) => {
        for (const fieldName of changedFields) {
          const field = generalFields.find((candidate) => candidate.name === fieldName);
          if (!field || field.ownership !== "entity") continue;
          const nextValue = formData.get(fieldName);
          if (fieldName === "title" || fieldName === "documentDate") {
            await patchPurchaseDocumentFieldAction(document.kind, document.id, fieldName, nextValue);
          }
        }
      }}
      onSaved={() => router.refresh()}
    />
  );
}

function PurchaseDocumentCrossEngineWorkflow({
  assignmentFields,
  document,
  fieldName,
  record,
}: Readonly<{
  assignmentFields: readonly ProfileFieldDefinition[];
  document: PurchaseDocumentDetail["document"];
  fieldName: string;
  record: Record<string, unknown>;
}>) {
  const page = useEditablePageContext();
  const router = useRouter();
  const field = assignmentFields.find((candidate) => candidate.name === fieldName);
  if (!field) return null;

  return (
    <CrossEngineLookupWorkflow
      currentValue={record[fieldName]}
      field={field}
      onCancel={() => page?.closeWorkflow()}
      onSubmit={async (value) => {
        await patchPurchaseDocumentFieldAction(
          document.kind,
          document.id,
          fieldName as "branchId" | "supplierId" | "purchaseOrderId",
          value,
        );
        page?.closeWorkflow();
        router.refresh();
      }}
    />
  );
}
