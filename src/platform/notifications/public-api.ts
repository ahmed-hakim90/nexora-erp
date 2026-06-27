export type NotificationChannel = "in-app" | "email" | "sms" | "whatsapp" | "push";
export type NotificationPriority = "low" | "normal" | "high" | "critical";

export type NotificationIntent = Readonly<{
  channel: NotificationChannel;
  recipientUserId?: string;
  recipientRoleKey?: string;
  recipientPermissionKey?: string;
  templateKey: string;
  tenantId?: string;
  companyId?: string | null;
  branchId?: string | null;
  priority?: NotificationPriority;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
}>;

export type NotificationTemplateDefinition = Readonly<{
  key: string;
  channel: NotificationChannel;
  subject?: string;
  bodyTemplate: string;
  supportsBranding?: boolean;
  locale?: "ar" | "en";
}>;

export type NotificationDelivery = Readonly<{
  id: string;
  templateKey: string;
  channel: NotificationChannel;
  status: "queued" | "sent" | "failed" | "cancelled";
  attempt: number;
  idempotencyKey: string;
}>;

export function defineNotificationTemplate<TTemplate extends NotificationTemplateDefinition>(
  template: TTemplate,
): TTemplate {
  return template;
}
