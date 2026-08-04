"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { HR_BANK_ACCOUNT_TYPES } from "@/features/hr/financial-services-foundation";
import { updateEmployeeBankAccountAction } from "@/features/hr/routes/actions/hr-financial.actions";
import { platformFeedback } from "@/platform/feedback/public-api";
import {
  Button,
  FieldGroup,
  Input,
  RecordFormDialog,
  buildModalCloseHref,
  nativeSelectClassName,
  useRecordFormModal,
  useTranslations,
} from "@/shared/ui";

import type { HrBankAccountTableRecord } from "./hr-bank-accounts-workspace";

const BANK_ACCOUNTS_PATH = "/erp/hr/bank-accounts";

export function HrBankAccountFormDialog({
  account,
  query,
}: Readonly<{
  account: HrBankAccountTableRecord;
  query: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const closeHref = buildModalCloseHref(BANK_ACCOUNTS_PATH, query);
  const { closeModal, formId, handleOpenChange, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateEmployeeBankAccountAction(formData);
        platformFeedback.success(t("hr.bankAccounts.feedback.updated"), { source: "runtime" });
        closeModal();
        router.refresh();
      } catch (cause) {
        platformFeedback.error(t("hr.bankAccounts.feedback.updateFailed"), {
          description: cause instanceof Error ? cause.message : t("hr.common.reviewForm"),
          source: "runtime",
        });
      }
    });
  }

  return (
    <RecordFormDialog
      actions={
        <Button disabled={isPending} form={formId} type="submit" variant="primary">
          {isPending ? t("hr.common.saving") : t("hr.common.saveChanges")}
        </Button>
      }
      onDismiss={closeModal}
      onOpenChange={handleOpenChange}
      open={open}
      subtitle={t("hr.bankAccounts.editSubtitle")}
      title={t("hr.bankAccounts.editTitle")}
    >
      <form className="space-y-4" id={formId} onInput={markDirty} onSubmit={handleSubmit}>
        <input name="accountId" type="hidden" value={account.id} />
        <fieldset className="contents" disabled={isPending}>
          <FieldGroup isRequired label={t("hr.bankAccounts.bankName")}>
            <Input defaultValue={account.bankName} name="bankName" required />
          </FieldGroup>
          <FieldGroup isRequired label={t("hr.bankAccounts.accountHolder")}>
            <Input defaultValue={account.accountHolderName} name="accountHolderName" required />
          </FieldGroup>
          <FieldGroup isRequired label={t("hr.bankAccounts.accountNumber")}>
            <Input defaultValue={account.accountNumber} name="accountNumber" required />
          </FieldGroup>
          <FieldGroup label={t("hr.bankAccounts.iban")}>
            <Input defaultValue={account.iban ?? ""} name="iban" />
          </FieldGroup>
          <FieldGroup label={t("hr.bankAccounts.swift")}>
            <Input defaultValue={account.swiftCode ?? ""} name="swiftCode" />
          </FieldGroup>
          <FieldGroup label={t("hr.common.type")}>
            <select className={nativeSelectClassName} defaultValue={account.accountType} name="accountType">
              {HR_BANK_ACCOUNT_TYPES.map((accountType) => (
                <option key={accountType.value} value={accountType.value}>
                  {accountType.label}
                </option>
              ))}
            </select>
          </FieldGroup>
          <label className="flex items-center gap-2 text-sm">
            <input
              className="size-4 rounded border border-border bg-[hsl(var(--surface))]"
              defaultChecked={account.isPrimary}
              name="isPrimary"
              type="checkbox"
              value="true"
            />
            {t("hr.bankAccounts.primary")}
          </label>
        </fieldset>
      </form>
    </RecordFormDialog>
  );
}
