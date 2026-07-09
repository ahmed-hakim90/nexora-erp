"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  activateContractTypeVersionAction,
  archiveContractTypeVersionAction,
  createContractTypeAction,
  createContractTypeVersionAction,
  saveContractTypeArticlesAction,
  updateContractTypeAction,
} from "@/features/hr/routes/actions/hr-contract-type.actions";
import {
  HR_CONTRACT_PLACEHOLDER_LABELS,
  HR_CONTRACT_PLACEHOLDERS,
  placeholderToken,
} from "@/features/hr/contract-type-foundation";
import {
  Button,
  EnterpriseDataTable,
  EntityLookup,
  FieldGroup,
  FormGrid,
  Input,
  RecordFormDialog,
  RecordFormSection,
  nativeSelectClassName,
  secondaryButtonLinkClassName,
  useRecordFormModal,
  useTranslations,
} from "@/shared/ui";

export type HrSettingsContractTypeRecord = {
  activeVersionId: string | null;
  activeVersionNo: number | null;
  code: string;
  defaultProbationDays: number | null;
  draftVersionId: string | null;
  draftVersionNo: number | null;
  id: string;
  name: string;
  nameAr: string | null;
  requiredDocumentSetId: string | null;
  requiredDocumentSetLabel: string | null;
  requiresEndDate: boolean;
  status: string;
  statusRaw: string;
};

export type HrSettingsContractTypeVersionRecord = {
  articleCount: number;
  changeSummary: string | null;
  contractTypeId: string;
  id: string;
  status: string;
  statusRaw: string;
  versionNo: number;
};

export type HrSettingsContractTypeArticleRecord = {
  bodyAr: string;
  bodyEn: string;
  code: string | null;
  id: string;
  sequence: number;
  titleAr: string | null;
  titleEn: string;
};

type ArticleDraft = {
  bodyAr: string;
  bodyEn: string;
  code: string;
  sequence: number;
  titleAr: string;
  titleEn: string;
};

function ContractTypeFormDialog({
  closeHref,
  mode,
  record,
}: Readonly<{
  closeHref: string;
  mode: "create" | "edit";
  record?: HrSettingsContractTypeRecord;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { formId, handleOpenChange, isDirty, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (mode === "edit" && record) {
        formData.set("contractTypeId", record.id);
        await updateContractTypeAction(formData);
      } else {
        await createContractTypeAction(formData);
      }
      router.push(closeHref);
    });
  }

  return (
    <RecordFormDialog
      actions={
        <Button disabled={isPending} form={formId} type="submit" variant="primary">
          {isPending ? t("hr.common.saving") : mode === "edit" ? t("hr.attendance.devices.form.saveChanges") : t("hr.common.create")}
        </Button>
      }
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      subtitle={t("hr.settings.contractTypes.modal.subtitle")}
      title={mode === "edit" ? t("hr.settings.contractTypes.modal.editTitle") : t("hr.settings.contractTypes.modal.createTitle")}
    >
      <RecordFormSection>
        <form action={handleSubmit} className="space-y-4" id={formId} onInput={markDirty}>
          <FormGrid>
            <FieldGroup isRequired label={t("hr.common.code")}>
              <Input defaultValue={record?.code} name="code" placeholder={t("hr.settings.contractTypes.modal.codeExample")} required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.name")}>
              <Input defaultValue={record?.name} name="name" placeholder={t("hr.settings.contractTypes.modal.nameExample")} required />
            </FieldGroup>
            <FieldGroup label={t("hr.common.nameAr")}>
              <Input defaultValue={record?.nameAr ?? ""} name="nameAr" placeholder={t("hr.settings.contractTypes.modal.nameArExample")} />
            </FieldGroup>
            <FieldGroup label={t("hr.common.defaultProbationDays")}>
              <Input
                defaultValue={record?.defaultProbationDays ?? ""}
                min="0"
                name="defaultProbationDays"
                type="number"
              />
            </FieldGroup>
            <FieldGroup label={t("hr.common.requiresEndDate")}>
              <select
                className={nativeSelectClassName}
                defaultValue={record?.requiresEndDate ? "true" : "false"}
                name="requiresEndDate"
              >
                <option value="false">{t("hr.common.no")}</option>
                <option value="true">{t("hr.common.yes")}</option>
              </select>
            </FieldGroup>
            <FieldGroup label={t("hr.settings.contractTypes.requiredDocumentSet")}>
              <EntityLookup
                label={t("hr.settings.contractTypes.requiredDocumentSet")}
                name="requiredDocumentSetId"
                providerKey="hr.required-document-sets.lookup"
                value={record?.requiredDocumentSetId ?? undefined}
              />
            </FieldGroup>
          </FormGrid>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

function ContractTypeArticlesDialog({
  articles,
  closeHref,
  contractTypeVersionId,
  readOnly,
}: Readonly<{
  articles: readonly HrSettingsContractTypeArticleRecord[];
  closeHref: string;
  contractTypeVersionId: string;
  readOnly: boolean;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { formId, handleOpenChange, isDirty, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });
  const [draftArticles, setDraftArticles] = useState<ArticleDraft[]>(
    articles.length > 0
      ? articles.map((article) => ({
          bodyAr: article.bodyAr,
          bodyEn: article.bodyEn,
          code: article.code ?? "",
          sequence: article.sequence,
          titleAr: article.titleAr ?? "",
          titleEn: article.titleEn,
        }))
      : [{ bodyAr: "", bodyEn: "", code: "ART-01", sequence: 1, titleAr: "", titleEn: "Article 1" }],
  );

  const placeholderButtons = useMemo(
    () =>
      HR_CONTRACT_PLACEHOLDERS.map((key) => ({
        key,
        label: HR_CONTRACT_PLACEHOLDER_LABELS[key],
        token: placeholderToken(key),
      })),
    [],
  );

  function updateArticle(index: number, patch: Partial<ArticleDraft>) {
    markDirty();
    setDraftArticles((current) => current.map((article, articleIndex) => (articleIndex === index ? { ...article, ...patch } : article)));
  }

  function addArticle() {
    markDirty();
    setDraftArticles((current) => [
      ...current,
      {
        bodyAr: "",
        bodyEn: "",
        code: `ART-${String(current.length + 1).padStart(2, "0")}`,
        sequence: current.length + 1,
        titleAr: "",
        titleEn: t("hr.settings.contractTypes.articles.defaultTitle", { number: String(current.length + 1) }),
      },
    ]);
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      formData.set("contractTypeVersionId", contractTypeVersionId);
      formData.set("articlesJson", JSON.stringify(draftArticles));
      await saveContractTypeArticlesAction(formData);
      router.push(closeHref);
    });
  }

  return (
    <RecordFormDialog
      actions={
        !readOnly ? (
          <Button disabled={isPending} form={formId} type="submit" variant="primary">
            {isPending ? t("hr.common.saving") : t("hr.settings.contractTypes.articles.save")}
          </Button>
        ) : undefined
      }
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      size="wide"
      subtitle={t("hr.settings.contractTypes.articles.subtitle")}
      title={readOnly ? t("hr.settings.contractTypes.articles.viewTitle") : t("hr.settings.contractTypes.articles.editTitle")}
    >
      <RecordFormSection>
        <form action={handleSubmit} className="space-y-4" id={formId} onInput={markDirty}>
          <div className="mb-3 flex flex-wrap gap-2">
            {placeholderButtons.map((placeholder) => (
              <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground" key={placeholder.key}>
                {placeholder.label}: <code>{placeholder.token}</code>
              </span>
            ))}
          </div>
          <div className="space-y-4">
            {draftArticles.map((article, index) => (
              <div className="space-y-3 rounded-lg border p-3" key={`${article.sequence}-${index}`}>
                <FormGrid>
                  <FieldGroup label={t("hr.common.sequence")}>
                    <Input
                      min="1"
                      onChange={(event) => updateArticle(index, { sequence: Number(event.target.value) })}
                      type="number"
                      value={article.sequence}
                    />
                  </FieldGroup>
                  <FieldGroup label={t("hr.common.code")}>
                    <Input onChange={(event) => updateArticle(index, { code: event.target.value })} value={article.code} />
                  </FieldGroup>
                  <FieldGroup isRequired label={t("hr.common.titleEn")}>
                    <Input
                      onChange={(event) => updateArticle(index, { titleEn: event.target.value })}
                      required
                      value={article.titleEn}
                    />
                  </FieldGroup>
                  <FieldGroup label={t("hr.common.titleAr")}>
                    <Input onChange={(event) => updateArticle(index, { titleAr: event.target.value })} value={article.titleAr} />
                  </FieldGroup>
                </FormGrid>
                <FieldGroup isRequired label={t("hr.common.bodyEn")}>
                  <textarea
                    className="min-h-24 w-full rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm"
                    onChange={(event) => updateArticle(index, { bodyEn: event.target.value })}
                    required
                    value={article.bodyEn}
                  />
                </FieldGroup>
                <FieldGroup label={t("hr.common.bodyAr")}>
                  <textarea
                    className="min-h-24 w-full rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm"
                    dir="rtl"
                    onChange={(event) => updateArticle(index, { bodyAr: event.target.value })}
                    value={article.bodyAr}
                  />
                </FieldGroup>
              </div>
            ))}
          </div>
          {!readOnly ? (
            <Button className="mt-3" onClick={addArticle} type="button" variant="secondary">
              {t("hr.settings.contractTypes.articles.add")}
            </Button>
          ) : null}
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

export function HrContractTypesSettingsPanel({
  articleRecords,
  closeModalHref,
  contractTypeRecords,
  createContractTypeOpen,
  editContractType,
  editVersionArticles,
  query,
  settingsHref,
  versionRecords,
}: Readonly<{
  articleRecords: readonly HrSettingsContractTypeArticleRecord[];
  closeModalHref: string;
  contractTypeRecords: readonly HrSettingsContractTypeRecord[];
  createContractTypeOpen: boolean;
  editContractType?: HrSettingsContractTypeRecord;
  editVersionArticles?: { readOnly: boolean; versionId: string };
  query: Record<string, string | undefined>;
  settingsHref: (patch: Record<string, string | null | undefined>) => string;
  versionRecords: readonly HrSettingsContractTypeVersionRecord[];
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const selectedTypeId = query.contractTypeId;
  const selectedVersions = versionRecords.filter((version) => version.contractTypeId === selectedTypeId);

  function runAction(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("hr.settings.contractTypes.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("hr.settings.contractTypes.description")}</p>
        </div>
        <Link className={secondaryButtonLinkClassName} href={settingsHref({ tab: "contract-types", create: "1", edit: null })}>
          {t("hr.settings.contractTypes.create")}
        </Link>
      </div>

      <EnterpriseDataTable
        columns={[
          { header: t("hr.common.code"), key: "code", render: (record) => record.code },
          { header: t("hr.common.name"), key: "name", render: (record) => record.name },
          {
            header: t("hr.settings.contractTypes.requiredDocumentSet"),
            key: "documentSet",
            render: (record) => record.requiredDocumentSetLabel ?? "—",
          },
          { header: t("hr.common.activeVersion"), key: "active", render: (record) => (record.activeVersionNo ? `v${record.activeVersionNo}` : "—") },
          { header: t("hr.common.draftVersion"), key: "draft", render: (record) => (record.draftVersionNo ? `v${record.draftVersionNo}` : "—") },
          { header: t("hr.common.status"), key: "status", render: (record) => record.status },
          {
            header: t("hr.common.actions"),
            key: "actions",
            render: (record) => (
              <div className="flex flex-wrap gap-2">
                <Link
                  className={secondaryButtonLinkClassName}
                  href={settingsHref({ tab: "contract-types", contractTypeId: record.id, create: null, edit: null })}
                >
                  {t("hr.settings.contractTypes.versions")}
                </Link>
                <Link
                  className={secondaryButtonLinkClassName}
                  href={settingsHref({ tab: "contract-types", edit: record.id, create: null })}
                >
                  {t("hr.common.edit")}
                </Link>
              </div>
            ),
          },
        ]}
        emptyMessage={t("hr.settings.contractTypes.empty")}
        getRowId={(record) => record.id}
        pagination={{ mode: "cursor", pageSize: 25 }}
        records={contractTypeRecords}
      />

      {selectedTypeId ? (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{t("hr.settings.contractTypes.versionsSection")}</h3>
            <Button
              disabled={isPending}
              onClick={() =>
                runAction(async () => {
                  const formData = new FormData();
                  formData.set("contractTypeId", selectedTypeId);
                  const active = selectedVersions.find((version) => version.statusRaw === "active");
                  if (active) formData.set("parentVersionId", active.id);
                  await createContractTypeVersionAction(formData);
                })
              }
              type="button"
              variant="secondary"
            >
              {t("hr.settings.contractTypes.newDraftVersion")}
            </Button>
          </div>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.version"), key: "version", render: (record) => `v${record.versionNo}` },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
              { header: t("hr.common.articles"), key: "articles", render: (record) => String(record.articleCount) },
              { header: t("hr.common.summary"), key: "summary", render: (record) => record.changeSummary ?? "—" },
              {
                header: t("hr.common.actions"),
                key: "actions",
                render: (record) => (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className={secondaryButtonLinkClassName}
                      href={settingsHref({
                        tab: "contract-types",
                        contractTypeId: selectedTypeId,
                        versionArticles: record.id,
                        versionReadOnly: record.statusRaw === "draft" ? null : "1",
                      })}
                    >
                      {record.statusRaw === "draft" ? t("hr.settings.contractTypes.editArticles") : t("hr.settings.contractTypes.viewArticles")}
                    </Link>
                    {record.statusRaw === "draft" ? (
                      <Button
                        disabled={isPending}
                        onClick={() => runAction(async () => activateContractTypeVersionAction(record.id))}
                        type="button"
                        variant="primary"
                      >
                        {t("hr.common.activate")}
                      </Button>
                    ) : null}
                    {record.statusRaw === "draft" ? (
                      <Button
                        disabled={isPending}
                        onClick={() => runAction(async () => archiveContractTypeVersionAction(record.id))}
                        type="button"
                        variant="secondary"
                      >
                        {t("hr.settings.contractTypes.archiveDraft")}
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            emptyMessage={t("hr.settings.contractTypes.emptyVersions")}
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", pageSize: 25 }}
            records={selectedVersions}
          />
        </div>
      ) : null}

      {createContractTypeOpen ? <ContractTypeFormDialog closeHref={closeModalHref} mode="create" /> : null}
      {editContractType ? <ContractTypeFormDialog closeHref={closeModalHref} mode="edit" record={editContractType} /> : null}
      {editVersionArticles ? (
        <ContractTypeArticlesDialog
          articles={articleRecords}
          closeHref={closeModalHref}
          contractTypeVersionId={editVersionArticles.versionId}
          readOnly={editVersionArticles.readOnly}
        />
      ) : null}
    </div>
  );
}
