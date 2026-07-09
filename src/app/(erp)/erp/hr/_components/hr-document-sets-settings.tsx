"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { listRequiredDocumentKinds, translateHrRequiredDocumentKind } from "@/features/hr/application/constants/hr-document-kind.registry";
import {
  archiveRequiredDocumentSetAction,
  createRequiredDocumentSetAction,
  updateRequiredDocumentSetAction,
} from "@/features/hr/routes/actions/hr-required-document-set.actions";
import {
  Button,
  EnterpriseDataTable,
  FieldGroup,
  FormGrid,
  Input,
  RecordFormDialog,
  RecordFormSection,
  nativeSelectClassName,
  useRecordFormModal,
  useTranslations,
} from "@/shared/ui";

export type HrSettingsDocumentSetRecord = {
  code: string;
  documentKinds: readonly string[];
  id: string;
  name: string;
  status: string;
  statusRaw: string;
};

function DocumentSetFormDialog({
  closeHref,
  mode,
  record,
}: Readonly<{
  closeHref: string;
  mode: "create" | "edit";
  record?: HrSettingsDocumentSetRecord;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { formId, handleOpenChange, isDirty, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });
  const kinds = listRequiredDocumentKinds();
  const selectedKinds = new Set(record?.documentKinds ?? []);

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (mode === "edit" && record) {
        formData.set("documentSetId", record.id);
        await updateRequiredDocumentSetAction(formData);
      } else {
        await createRequiredDocumentSetAction(formData);
      }
      router.push(closeHref);
    });
  }

  async function handleArchive() {
    if (!record) return;
    if (!window.confirm(t("hr.settings.confirm.archiveDocumentSet"))) return;
    startTransition(async () => {
      await archiveRequiredDocumentSetAction(record.id);
      router.push(closeHref);
    });
  }

  return (
    <RecordFormDialog
      actions={
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
            <Button disabled={isPending} onClick={() => void handleArchive()} type="button" variant="secondary">
              {t("hr.common.archive")}
            </Button>
          ) : null}
          <Button disabled={isPending} form={formId} type="submit" variant="primary">
            {isPending ? t("hr.common.saving") : t("hr.common.save")}
          </Button>
        </div>
      }
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      title={mode === "edit" ? t("hr.settings.modal.editDocumentSet") : t("hr.settings.modal.createDocumentSet")}
    >
      <RecordFormSection>
        <form action={handleSubmit} className="space-y-4" id={formId} onInput={markDirty}>
          <FormGrid>
            <FieldGroup isRequired label={t("hr.common.code")}>
              <Input defaultValue={record?.code ?? ""} name="code" required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.name")}>
              <Input defaultValue={record?.name ?? ""} name="name" required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.status")}>
              <select className={nativeSelectClassName} defaultValue={record?.statusRaw ?? "active"} name="status" required>
                <option value="draft">{t("hr.common.status.draft")}</option>
                <option value="active">{t("hr.common.status.active")}</option>
                <option value="inactive">{t("hr.common.status.inactive")}</option>
              </select>
            </FieldGroup>
          </FormGrid>
          <FieldGroup isRequired label={t("hr.settings.documentSets.documentKinds")}>
            <div className="grid gap-2 md:grid-cols-2">
              {kinds.map((kind) => (
                <label className="flex items-center gap-2 text-sm" key={kind}>
                  <input defaultChecked={selectedKinds.has(kind)} name="documentKinds" type="checkbox" value={kind} />
                  <span>{translateHrRequiredDocumentKind(t, kind)}</span>
                </label>
              ))}
            </div>
          </FieldGroup>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

export function HrDocumentSetsSettingsPanel({
  closeHref,
  createOpen,
  editRecord,
  records,
  settingsHref,
}: Readonly<{
  closeHref: string;
  createOpen: boolean;
  editRecord?: HrSettingsDocumentSetRecord;
  records: readonly HrSettingsDocumentSetRecord[];
  settingsHref: (patch: Record<string, string | null | undefined>) => string;
}>) {
  const t = useTranslations();

  return (
    <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("hr.settings.tab.documentSets")}</h2>
          <p className="text-sm text-muted-foreground">{t("hr.settings.documentSets.description")}</p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-4 text-sm font-medium text-[hsl(var(--accent-foreground))] shadow-sm"
          href={settingsHref({ tab: "document-sets", create: "1", edit: null })}
        >
          {t("hr.settings.modal.createDocumentSet")}
        </Link>
      </div>

      <EnterpriseDataTable
        columns={[
          { header: t("hr.common.code"), key: "code", render: (record) => record.code },
          { header: t("hr.common.name"), key: "name", render: (record) => record.name },
          {
            header: t("hr.settings.documentSets.documentKinds"),
            key: "kinds",
            render: (record) =>
              record.documentKinds.map((kind) => translateHrRequiredDocumentKind(t, kind)).join(", ") || "—",
          },
          { header: t("hr.common.status"), key: "status", render: (record) => record.status },
          {
            header: t("hr.common.actions"),
            key: "actions",
            render: (record) => (
              <Link className="text-sm underline" href={settingsHref({ tab: "document-sets", edit: record.id, create: null })}>
                {t("hr.common.edit")}
              </Link>
            ),
          },
        ]}
        emptyMessage={t("hr.settings.documentSets.empty")}
        getRowId={(record) => record.id}
        pagination={{ mode: "page", page: 1, pageSize: records.length || 1, totalRows: records.length }}
        records={records}
      />

      {createOpen ? <DocumentSetFormDialog closeHref={closeHref} mode="create" /> : null}
      {editRecord ? <DocumentSetFormDialog closeHref={closeHref} mode="edit" record={editRecord} /> : null}
    </section>
  );
}
