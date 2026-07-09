"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { resolveHrFieldHelp } from "@/features/hr/public-api";
import { updateEmployeePhotoAction, updateEmployeeQuickEditAction } from "@/features/hr/routes/actions/hr-operational.actions";
import {
  Button,
  DatePicker,
  FieldGroup,
  FormGrid,
  Input,
  RecordFormDialog,
  RecordFormSection,
  fileInputClassName,
  nativeSelectClassName,
  useTranslations,
} from "@/shared/ui";

export function HrEmployeeEditModal({
  closeHref,
  employee,
}: Readonly<{
  closeHref: string;
  employee: {
    addressLine1: string;
    addressLine2: string;
    attendanceCode: string;
    birthDate: string;
    city: string;
    email: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    employeeNumber: string;
    fullName: string;
    gender: string;
    id: string;
    maritalStatus: string;
    nationalId: string;
    nationality: string;
    passportNumber: string;
    phone: string;
  };
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  return (
    <RecordFormDialog
      actions={
        <Button form="hr-employee-edit-form" type="submit" variant="primary">
          {t("hr.employees.edit.saveChanges")}
        </Button>
      }
      isDirty={isDirty}
      onDismiss={() => {
        setOpen(false);
        router.push(closeHref);
      }}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) router.push(closeHref);
      }}
      open={open}
      size="wide"
      subtitle={t("hr.employees.edit.subtitle", { code: employee.employeeNumber })}
      title={t("hr.employees.edit.title", { name: employee.fullName })}
    >
      <RecordFormSection>
        <form action={updateEmployeeQuickEditAction} className="space-y-4" id="hr-employee-edit-form" onInput={() => setIsDirty(true)}>
          <input name="employeeId" type="hidden" value={employee.id} />
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            {t("hr.employees.edit.assignmentBanner")}
          </div>
          <form action={updateEmployeePhotoAction.bind(null, employee.id)} className="max-w-md space-y-2 rounded-md border p-3" encType="multipart/form-data">
            <FieldGroup label={t("hr.employees.edit.photo")}>
              <input accept="image/*" className={fileInputClassName} name="file" type="file" />
            </FieldGroup>
            <Button size="sm" type="submit" variant="secondary">
              {t("hr.employees.edit.uploadPhoto")}
            </Button>
          </form>
          <FormGrid>
            <FieldGroup help={resolveHrFieldHelp("fullName")} isRequired label={t("hr.common.fullName")}>
              <Input defaultValue={employee.fullName} name="fullName" required />
            </FieldGroup>
            <FieldGroup
              description={t("hr.employees.wizard.employeeCodeDescription")}
              help={resolveHrFieldHelp("employeeNumber")}
              isRequired
              label={t("hr.employees.wizard.employeeCode")}
            >
              <Input defaultValue={employee.employeeNumber} maxLength={50} name="employeeNumber" required />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("nationalId")} label={t("hr.common.nationalId")}>
              <Input defaultValue={employee.nationalId} name="nationalId" />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("passportNumber")} label={t("hr.common.passport")}>
              <Input defaultValue={employee.passportNumber} name="passportNumber" />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("birthDate")} label={t("hr.common.birthDate")}>
              <DatePicker defaultValue={employee.birthDate} name="birthDate" />
            </FieldGroup>
            <FieldGroup label={t("hr.common.gender")}>
              <select className={nativeSelectClassName} defaultValue={employee.gender} name="gender">
                <option value="">-</option>
                <option value="female">{t("hr.common.gender.female")}</option>
                <option value="male">{t("hr.common.gender.male")}</option>
                <option value="other">{t("hr.common.gender.other")}</option>
                <option value="undisclosed">{t("hr.common.gender.undisclosed")}</option>
              </select>
            </FieldGroup>
            <FieldGroup label={t("hr.common.nationality")}>
              <Input defaultValue={employee.nationality} name="nationality" />
            </FieldGroup>
            <FieldGroup label={t("hr.common.maritalStatus")}>
              <select className={nativeSelectClassName} defaultValue={employee.maritalStatus} name="maritalStatus">
                <option value="">-</option>
                <option value="single">{t("hr.common.maritalStatus.single")}</option>
                <option value="married">{t("hr.common.maritalStatus.married")}</option>
                <option value="divorced">{t("hr.common.maritalStatus.divorced")}</option>
                <option value="widowed">{t("hr.common.maritalStatus.widowed")}</option>
                <option value="undisclosed">{t("hr.common.maritalStatus.undisclosed")}</option>
              </select>
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("phone")} label={t("hr.common.phone")}>
              <Input defaultValue={employee.phone} name="phone" />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("email")} label={t("hr.common.email")}>
              <Input defaultValue={employee.email} name="email" type="email" />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("emergencyContactName")} label={t("hr.common.emergencyContactName")}>
              <Input defaultValue={employee.emergencyContactName} name="emergencyContactName" />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("emergencyContactPhone")} label={t("hr.common.emergencyContactPhone")}>
              <Input defaultValue={employee.emergencyContactPhone} name="emergencyContactPhone" />
            </FieldGroup>
            <FieldGroup label={t("hr.common.addressLine1")}>
              <Input defaultValue={employee.addressLine1} name="addressLine1" />
            </FieldGroup>
            <FieldGroup label={t("hr.common.addressLine2")}>
              <Input defaultValue={employee.addressLine2} name="addressLine2" />
            </FieldGroup>
            <FieldGroup label={t("hr.common.city")}>
              <Input defaultValue={employee.city} name="city" />
            </FieldGroup>
          </FormGrid>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}
