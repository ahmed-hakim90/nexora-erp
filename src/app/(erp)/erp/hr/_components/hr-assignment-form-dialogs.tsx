"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { createHrAssignmentAction, updateHrAssignmentAction } from "@/features/hr/routes/actions/hr-employees.actions";
import { resolveHrFieldHelp } from "@/features/hr/public-api";
import { platformFeedback } from "@/platform/feedback/public-api";
import {
  Button,
  DatePickerField,
  FieldGroup,
  Input,
  RecordFormDialog,
  buildModalCloseHref,
  useRecordFormModal,
  useTranslations,
} from "@/shared/ui";

import { HrAssignmentCreateForm } from "./hr-assignment-form";
import type { HrAssignmentTableRecord } from "./hr-assignments-workspace";

const ASSIGNMENTS_PATH = "/erp/hr/assignments";

export function HrAssignmentCreateFormDialog({
  employeeId,
  employmentProfileId,
  preset,
  query,
}: Readonly<{
  employeeId: string;
  employmentProfileId?: string;
  preset?: string;
  query: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const closeHref = buildModalCloseHref(ASSIGNMENTS_PATH, query, ["create", "preset"]);
  const { closeModal, handleOpenChange, open } = useRecordFormModal({ autoOpen: true, closeHref });

  async function handleCreate(formData: FormData) {
    try {
      await createHrAssignmentAction(formData);
      platformFeedback.success(t("hr.assignments.feedback.created"), { source: "runtime" });
      closeModal();
      router.refresh();
    } catch (cause) {
      platformFeedback.error(t("hr.assignments.feedback.createFailed"), {
        description: cause instanceof Error ? cause.message : t("hr.common.reviewForm"),
        source: "runtime",
      });
    }
  }

  return (
    <RecordFormDialog
      onDismiss={closeModal}
      onOpenChange={handleOpenChange}
      open={open}
      subtitle={t("hr.assignments.createSubtitle")}
      title={t("hr.assignments.createTitle")}
    >
      <HrAssignmentCreateForm
        action={handleCreate}
        employeeId={employeeId}
        employmentProfileId={employmentProfileId}
        preset={preset}
        variant="modal"
      />
    </RecordFormDialog>
  );
}

export function HrAssignmentEditFormDialog({
  assignment,
  query,
}: Readonly<{
  assignment: HrAssignmentTableRecord;
  query: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const closeHref = buildModalCloseHref(ASSIGNMENTS_PATH, query);
  const { closeModal, formId, handleOpenChange, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateHrAssignmentAction(formData);
        platformFeedback.success(t("hr.assignments.feedback.updated"), { source: "runtime" });
        closeModal();
        router.refresh();
      } catch (cause) {
        platformFeedback.error(t("hr.assignments.feedback.updateFailed"), {
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
          {isPending ? t("hr.common.saving") : t("hr.assignments.save")}
        </Button>
      }
      onDismiss={closeModal}
      onOpenChange={handleOpenChange}
      open={open}
      subtitle={t("hr.assignments.editSubtitle")}
      title={t("hr.assignments.editTitle")}
    >
      <form className="space-y-4" id={formId} onInput={markDirty} onSubmit={handleSubmit}>
        <input name="assignmentId" type="hidden" value={assignment.id} />
        <fieldset className="contents" disabled={isPending}>
          <DatePickerField defaultValue={assignment.effectiveFrom} isRequired label={t("hr.common.effectiveFrom")} name="effectiveFrom" />
          <DatePickerField defaultValue={assignment.effectiveTo || undefined} label={t("hr.common.effectiveTo")} name="effectiveTo" />
          <FieldGroup help={resolveHrFieldHelp("reason")} label={t("hr.common.priority")}>
            <Input defaultValue={assignment.priority} min="1" name="priority" type="number" />
          </FieldGroup>
          <FieldGroup help={resolveHrFieldHelp("reason")} label={t("hr.common.reason")}>
            <Input defaultValue={assignment.reason} name="reason" placeholder={t("hr.common.reason")} />
          </FieldGroup>
        </fieldset>
      </form>
    </RecordFormDialog>
  );
}
