import type { AccessExperience, ActorType } from "@/core/context";
import type { PlatformEventName } from "@/platform/events/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";

export type BusinessProcessKey = string & { readonly __brand: "BusinessProcessKey" };

export type BusinessProcessStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "failed"
  | "archived";

export type ActivityStatus =
  | "planned"
  | "open"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "blocked";

export type AssignmentStatus =
  | "assigned"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled"
  | "expired";

export type TaskStatus =
  | "todo"
  | "in-progress"
  | "blocked"
  | "done"
  | "cancelled";

export type ReminderStatus = "scheduled" | "sent" | "dismissed" | "cancelled";
export type EscalationStatus = "pending" | "triggered" | "resolved" | "cancelled";
export type SlaStatus = "not-started" | "running" | "met" | "breached" | "paused" | "cancelled";

export type BusinessProcessOwner = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  appKey?: string | null;
  experience?: AccessExperience | null;
}>;

export type Activity = Readonly<{
  key: string;
  processKey: BusinessProcessKey;
  title: string;
  status: ActivityStatus;
  actorType?: ActorType;
  actorId?: string | null;
  dueAt?: string | null;
  sourceEventName?: PlatformEventName | null;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type Assignment = Readonly<{
  key: string;
  processKey: BusinessProcessKey;
  assigneeType: "user" | "role" | "team" | "service";
  assigneeId: string;
  status: AssignmentStatus;
  assignedAt: string;
  dueAt?: string | null;
  requiredPermission?: PermissionKey;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type Reminder = Readonly<{
  key: string;
  processKey: BusinessProcessKey;
  targetType: "activity" | "assignment" | "task" | "process";
  targetKey: string;
  remindAt: string;
  status: ReminderStatus;
  channelPreference?: "in-app" | "email" | "sms" | "future-notification";
}>;

export type Task = Readonly<{
  key: string;
  processKey: BusinessProcessKey;
  title: string;
  status: TaskStatus;
  assignmentKey?: string | null;
  dueAt?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type Escalation = Readonly<{
  key: string;
  processKey: BusinessProcessKey;
  targetType: "activity" | "assignment" | "task" | "sla";
  targetKey: string;
  status: EscalationStatus;
  triggerAt: string;
  escalationPolicyKey?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type Sla = Readonly<{
  key: string;
  processKey: BusinessProcessKey;
  name: string;
  status: SlaStatus;
  startsAt?: string | null;
  dueAt: string;
  breachedAt?: string | null;
  pauseReason?: string | null;
}>;

export type BusinessProcess = Readonly<{
  key: BusinessProcessKey;
  owner: BusinessProcessOwner;
  name: string;
  status: BusinessProcessStatus;
  sourceEventName?: PlatformEventName | null;
  activities: readonly Activity[];
  assignments: readonly Assignment[];
  reminders: readonly Reminder[];
  tasks: readonly Task[];
  escalations: readonly Escalation[];
  slas: readonly Sla[];
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type BusinessProcessDefinition = Readonly<{
  key: BusinessProcessKey;
  name: string;
  description: string;
  sourceEventNames: readonly PlatformEventName[];
  allowedStatuses: readonly BusinessProcessStatus[];
  defaultSlaKey?: string | null;
}>;

export function defineBusinessProcessKey(value: string): BusinessProcessKey {
  if (!/^[a-z][a-z0-9.-]*$/.test(value)) {
    throw new Error("Business process keys must be lowercase dot or dash separated identifiers.");
  }

  return value as BusinessProcessKey;
}

export function defineBusinessProcess<TDefinition extends BusinessProcessDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export function createBusinessProcess<TProcess extends BusinessProcess>(
  process: TProcess,
): TProcess {
  return process;
}
