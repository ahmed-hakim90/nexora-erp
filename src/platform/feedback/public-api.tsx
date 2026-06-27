"use client";

import type { ReactNode } from "react";
import { Toaster, toast } from "sonner";

export type PlatformFeedbackId = string | number;

export type PlatformFeedbackSeverity =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading"
  | "progress";

export type PlatformFeedbackSource =
  | "runtime"
  | "notification-center"
  | "background-job"
  | "workflow"
  | "approval"
  | "audit"
  | "ai-action";

export type PlatformFeedbackAction = Readonly<{
  label: ReactNode;
  onSelect: () => void;
}>;

export type PlatformFeedbackOptions = Readonly<{
  id?: PlatformFeedbackId;
  description?: ReactNode;
  duration?: number;
  dismissible?: boolean;
  correlationId?: string;
  source?: PlatformFeedbackSource;
  entity?: Readonly<{
    type: string;
    id?: string;
    label?: string;
  }>;
  action?: PlatformFeedbackAction;
}>;

export type PlatformFeedbackProgressOptions = PlatformFeedbackOptions &
  Readonly<{
    value: number;
    max?: number;
    label?: ReactNode;
  }>;

export type PlatformFeedbackPromiseMessages<TData> = Readonly<{
  loading: ReactNode;
  success: ReactNode | ((data: TData) => ReactNode);
  error: ReactNode | ((error: unknown) => ReactNode);
}>;

export type PlatformFeedbackEngine = Readonly<{
  success(message: ReactNode, options?: PlatformFeedbackOptions): PlatformFeedbackId;
  error(message: ReactNode, options?: PlatformFeedbackOptions): PlatformFeedbackId;
  warning(message: ReactNode, options?: PlatformFeedbackOptions): PlatformFeedbackId;
  info(message: ReactNode, options?: PlatformFeedbackOptions): PlatformFeedbackId;
  loading(message: ReactNode, options?: PlatformFeedbackOptions): PlatformFeedbackId;
  promise<TData>(
    promise: Promise<TData> | (() => Promise<TData>),
    messages: PlatformFeedbackPromiseMessages<TData>,
    options?: PlatformFeedbackOptions,
  ): PlatformFeedbackId;
  progress(message: ReactNode, options: PlatformFeedbackProgressOptions): PlatformFeedbackId;
  dismiss(id?: PlatformFeedbackId): void;
  clear(): void;
}>;

function toSonnerOptions(options: PlatformFeedbackOptions = {}) {
  return {
    action: options.action
      ? {
          label: options.action.label,
          onClick: options.action.onSelect,
        }
      : undefined,
    description: options.description,
    dismissible: options.dismissible,
    duration: options.duration,
    id: options.id,
  };
}

function formatProgress(options: PlatformFeedbackProgressOptions): string {
  const max = options.max ?? 100;
  const boundedValue = Math.min(Math.max(options.value, 0), max);
  const percentage = max > 0 ? Math.round((boundedValue / max) * 100) : 0;

  return `${percentage}%`;
}

export const platformFeedback: PlatformFeedbackEngine = {
  success: (message, options) => toast.success(message, toSonnerOptions(options)),
  error: (message, options) => toast.error(message, toSonnerOptions(options)),
  warning: (message, options) => toast.warning(message, toSonnerOptions(options)),
  info: (message, options) => toast.info(message, toSonnerOptions(options)),
  loading: (message, options) => toast.loading(message, toSonnerOptions(options)),
  promise: (promise, messages, options) => {
    const id = options?.id ?? crypto.randomUUID();

    toast.promise(promise, {
      ...toSonnerOptions({ ...options, id }),
      error: messages.error,
      loading: messages.loading,
      success: messages.success,
    });

    return id;
  },
  progress: (message, options) =>
    toast.loading(message, {
      ...toSonnerOptions(options),
      description: options.label ?? options.description ?? formatProgress(options),
      duration: options.duration ?? Infinity,
    }),
  dismiss: (id) => {
    toast.dismiss(id);
  },
  clear: () => {
    toast.dismiss();
  },
};

export const platform = {
  feedback: platformFeedback,
} as const;

export function PlatformFeedbackProvider() {
  return (
    <Toaster
      closeButton
      richColors
      expand={false}
      position="top-right"
      toastOptions={{
        duration: 5000,
      }}
    />
  );
}
