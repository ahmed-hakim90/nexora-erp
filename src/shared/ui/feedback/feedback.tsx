import type { ReactNode } from "react";

function FeedbackPanel({
  title,
  message,
  tone = "neutral",
}: Readonly<{
  title: string;
  message?: string;
  tone?: "neutral" | "success" | "danger" | "warning";
}>) {
  const toneClass = {
    neutral: "border",
    success: "border-[hsl(var(--success))]",
    danger: "border-[hsl(var(--danger))]",
    warning: "border-[hsl(var(--warning))]",
  }[tone];

  return (
    <section className={`rounded-md ${toneClass} bg-[hsl(var(--surface))] p-4`}>
      <h2 className="font-medium">{title}</h2>
      {message ? <p className="mt-1 text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}

export function LoadingState() {
  return <FeedbackPanel message="Please wait." title="Loading" />;
}

export function SkeletonBlock() {
  return <div aria-hidden="true" className="h-24 animate-pulse rounded-md bg-[hsl(var(--muted))]" />;
}

export function EmptyState({ message = "Nothing to show yet." }: Readonly<{ message?: string }>) {
  return <FeedbackPanel message={message} title="Empty" />;
}

export function ErrorState({ message = "Something went wrong." }: Readonly<{ message?: string }>) {
  return <FeedbackPanel message={message} title="Error" tone="danger" />;
}

export function PermissionDeniedState() {
  return <FeedbackPanel message="You do not have permission to access this area." title="Permission denied" tone="warning" />;
}

export function OfflineState() {
  return <FeedbackPanel message="Network connectivity appears unavailable." title="Offline" tone="warning" />;
}

export function MaintenanceState() {
  return <FeedbackPanel message="This area is temporarily unavailable." title="Maintenance" tone="warning" />;
}

export function SuccessState({ message = "Action completed." }: Readonly<{ message?: string }>) {
  return <FeedbackPanel message={message} title="Success" tone="success" />;
}

export function ConfirmationDialog({
  title,
  children,
}: Readonly<{ title: string; children?: ReactNode }>) {
  return <FeedbackPanel message={typeof children === "string" ? children : undefined} title={title} />;
}

export function DeleteDialog() {
  return <FeedbackPanel message="Confirm deletion or cancellation according to module policy." title="Delete confirmation" tone="danger" />;
}

export function UnsavedChangesDialog() {
  return <FeedbackPanel message="You have unsaved changes." title="Unsaved changes" tone="warning" />;
}
