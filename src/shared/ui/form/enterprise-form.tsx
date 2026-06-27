import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Dialog, Drawer, Grid, Stack } from "../layout";
import { cn } from "../utils";

export type FormMode = "editable" | "readonly" | "loading";

export type EnterpriseFormState = Readonly<{
  isDirty?: boolean;
  isSubmitting?: boolean;
  isValid?: boolean;
  errorMessage?: string;
}>;

export type EnterpriseFormSchemaAdapter<TValues = unknown> = Readonly<{
  parse?: (values: unknown) => TValues;
  safeParse?: (values: unknown) => unknown;
}>;

export type EnterpriseFormProps<TValues = unknown> = ComponentPropsWithoutRef<"form"> &
  Readonly<{
    title: string;
    mode?: FormMode;
    state?: EnterpriseFormState;
    schema?: EnterpriseFormSchemaAdapter<TValues>;
    children: ReactNode;
  }>;

export function FormShell({
  title,
  mode = "editable",
  state,
  schema,
  className,
  children,
  ...formProps
}: EnterpriseFormProps) {
  const isDisabled = mode !== "editable" || state?.isSubmitting;

  return (
    <form
      aria-busy={mode === "loading" || state?.isSubmitting}
      aria-describedby={state?.errorMessage ? `${formProps.id ?? "enterprise-form"}-error` : undefined}
      className={cn("space-y-4", className)}
      data-schema-ready={schema ? true : undefined}
      noValidate
      {...formProps}
    >
      <header>
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
          {mode === "readonly" ? <span>Read-only mode</span> : null}
          {state?.isDirty ? <span>Unsaved changes</span> : null}
          {state?.isSubmitting ? <span>Submitting...</span> : null}
        </div>
        {state?.errorMessage ? (
          <p className="mt-2 text-sm text-[hsl(var(--danger))]" id={`${formProps.id ?? "enterprise-form"}-error`} role="alert">
            {state.errorMessage}
          </p>
        ) : null}
      </header>
      <fieldset disabled={isDisabled}>{children}</fieldset>
    </form>
  );
}

export function PageForm(props: Parameters<typeof FormShell>[0]) {
  return <FormShell {...props} />;
}

export function DrawerForm(props: Parameters<typeof FormShell>[0]) {
  return (
    <Drawer title={props.title}>
      <FormShell {...props} />
    </Drawer>
  );
}

export function DialogForm(props: Parameters<typeof FormShell>[0]) {
  return (
    <Dialog title={props.title}>
      <FormShell {...props} />
    </Dialog>
  );
}

export function WizardForm({
  steps,
  activeStepKey,
}: Readonly<{
  steps: readonly { key: string; title: string; content: ReactNode }[];
  activeStepKey: string;
}>) {
  const activeStep = steps.find((step) => step.key === activeStepKey) ?? steps[0];

  return (
    <section className="space-y-4">
      <ol className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <li className="rounded-md border px-3 py-2 text-sm" key={step.key}>
            {step.title}
          </li>
        ))}
      </ol>
      {activeStep?.content}
    </section>
  );
}

export function FormSection({
  title,
  description,
  children,
}: Readonly<{ title: string; description?: string; children: ReactNode }>) {
  return (
    <section className="rounded-md border p-4">
      <h3 className="mb-3 font-medium">{title}</h3>
      {description ? <p className="mb-3 text-sm text-muted-foreground">{description}</p> : null}
      <Stack>{children}</Stack>
    </section>
  );
}

export function FormGrid({ children }: Readonly<{ children: ReactNode }>) {
  return <Grid columns={2}>{children}</Grid>;
}

export function FieldGroup({
  label,
  description,
  error,
  isRequired,
  children,
}: Readonly<{
  label: string;
  description?: string;
  error?: string;
  isRequired?: boolean;
  children: ReactNode;
}>) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">
        {label}
        {isRequired ? <span aria-hidden="true"> *</span> : null}
      </span>
      {description ? <span className="block text-muted-foreground">{description}</span> : null}
      {children}
      {error ? <span className="block text-[hsl(var(--danger))]">{error}</span> : null}
    </label>
  );
}

export function PermissionAwareField({
  canEdit,
  canView = true,
  readonlyFallback,
  children,
}: Readonly<{
  canEdit: boolean;
  canView?: boolean;
  readonlyFallback?: ReactNode;
  children: ReactNode;
}>) {
  if (!canView) {
    return <div className="text-sm text-muted-foreground">Hidden by permission</div>;
  }

  return (
    <div aria-disabled={!canEdit}>
      {canEdit ? children : readonlyFallback ?? <div className="text-sm text-muted-foreground">Read-only by permission</div>}
    </div>
  );
}

export function AutosaveStatus({ isSaving }: Readonly<{ isSaving: boolean }>) {
  return <p className="text-sm text-muted-foreground">{isSaving ? "Autosaving..." : "Autosave ready"}</p>;
}

export function DirtyStateIndicator({ isDirty }: Readonly<{ isDirty: boolean }>) {
  return <p className="text-sm text-muted-foreground">{isDirty ? "Unsaved changes" : "No unsaved changes"}</p>;
}

export function FormAttachmentPlaceholder() {
  return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Attachment placeholder</div>;
}

export function FormCommentsPlaceholder() {
  return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Comments placeholder</div>;
}
