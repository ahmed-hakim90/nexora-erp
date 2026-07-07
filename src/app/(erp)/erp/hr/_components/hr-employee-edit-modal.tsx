"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { resolveHrFieldHelp } from "@/features/hr/public-api";
import { updateEmployeePhotoAction, updateEmployeeQuickEditAction } from "@/features/hr/routes/actions/hr-operational.actions";
import { Button, DatePicker, FieldGroup, FormGrid, Input, nativeSelectClassName, RecordFormDialog, RecordFormSection } from "@/shared/ui";

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
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  return (
    <RecordFormDialog
      actions={
        <Button form="hr-employee-edit-form" type="submit" variant="primary">
          Save changes
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
      subtitle={`Quick edit for ${employee.employeeNumber}. Organization fields must be changed through Assignments.`}
      title={`Edit ${employee.fullName}`}
    >
      <RecordFormSection>
        <form action={updateEmployeeQuickEditAction} className="space-y-4" id="hr-employee-edit-form" onInput={() => setIsDirty(true)}>
          <input name="employeeId" type="hidden" value={employee.id} />
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            To change department, position, manager, shift, or payroll group, create an Assignment Change.
          </div>
          <form action={updateEmployeePhotoAction.bind(null, employee.id)} className="max-w-md space-y-2 rounded-md border p-3" encType="multipart/form-data">
            <FieldGroup label="Employee photo">
              <input
                accept="image/*"
                className="block w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2 text-sm text-[hsl(var(--foreground))] file:me-3 file:rounded-md file:border file:border-[hsl(var(--border))] file:bg-[hsl(var(--muted))] file:px-3 file:py-1.5 file:text-sm"
                name="file"
                type="file"
              />
            </FieldGroup>
            <Button size="sm" type="submit" variant="secondary">
              Upload photo
            </Button>
          </form>
          <FormGrid>
            <FieldGroup help={resolveHrFieldHelp("fullName")} isRequired label="Full name">
              <Input defaultValue={employee.fullName} name="fullName" required />
            </FieldGroup>
            <FieldGroup
              description="Internal employee code used across HR, payroll, and lookups."
              help={resolveHrFieldHelp("employeeNumber")}
              isRequired
              label="Employee number / رقم الموظف"
            >
              <Input defaultValue={employee.employeeNumber} name="employeeNumber" required />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("nationalId")} label="National ID">
              <Input defaultValue={employee.nationalId} name="nationalId" />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("passportNumber")} label="Passport">
              <Input defaultValue={employee.passportNumber} name="passportNumber" />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("birthDate")} label="Birth date">
              <DatePicker defaultValue={employee.birthDate} name="birthDate" />
            </FieldGroup>
            <FieldGroup label="Gender">
              <select className={nativeSelectClassName} defaultValue={employee.gender} name="gender">
                <option value="">-</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="undisclosed">Undisclosed</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Nationality">
              <Input defaultValue={employee.nationality} name="nationality" />
            </FieldGroup>
            <FieldGroup label="Marital status">
              <select className={nativeSelectClassName} defaultValue={employee.maritalStatus} name="maritalStatus">
                <option value="">-</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="undisclosed">Undisclosed</option>
              </select>
            </FieldGroup>
            <FieldGroup
              description="Device code already registered on the attendance (fingerprint/face) device. Separate from employee number. / رمز جهاز الحضور (بصمة/وجه) — مختلف عن رقم الموظف."
              help={resolveHrFieldHelp("attendanceCode")}
              label="Attendance Code / رمز الحضور"
            >
              <Input defaultValue={employee.attendanceCode} maxLength={50} name="attendanceCode" placeholder="Attendance device code" />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("phone")} label="Phone">
              <Input defaultValue={employee.phone} name="phone" />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("email")} label="Email">
              <Input defaultValue={employee.email} name="email" type="email" />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("emergencyContactName")} label="Emergency contact name">
              <Input defaultValue={employee.emergencyContactName} name="emergencyContactName" />
            </FieldGroup>
            <FieldGroup help={resolveHrFieldHelp("emergencyContactPhone")} label="Emergency contact phone">
              <Input defaultValue={employee.emergencyContactPhone} name="emergencyContactPhone" />
            </FieldGroup>
            <FieldGroup label="Address line 1">
              <Input defaultValue={employee.addressLine1} name="addressLine1" />
            </FieldGroup>
            <FieldGroup label="Address line 2">
              <Input defaultValue={employee.addressLine2} name="addressLine2" />
            </FieldGroup>
            <FieldGroup label="City">
              <Input defaultValue={employee.city} name="city" />
            </FieldGroup>
          </FormGrid>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}
