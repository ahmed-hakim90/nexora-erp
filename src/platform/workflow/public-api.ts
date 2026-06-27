export type WorkflowStatusKey = string & {
  readonly __brand: "WorkflowStatusKey";
};

export type WorkflowTransitionKey = string & {
  readonly __brand: "WorkflowTransitionKey";
};

export type WorkflowGuardResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string };

export type WorkflowStateDefinition = Readonly<{
  key: WorkflowStatusKey;
  label: string;
  isInitial?: boolean;
  isTerminal?: boolean;
}>;

export type WorkflowTransitionDefinition = Readonly<{
  key: WorkflowTransitionKey;
  from: WorkflowStatusKey;
  to: WorkflowStatusKey;
  label: string;
  requiredPermission?: string;
  guardKeys?: readonly string[];
  hookKeys?: readonly string[];
}>;

export type WorkflowDefinition = Readonly<{
  key: string;
  moduleKey: string;
  entityType: string;
  states: readonly WorkflowStateDefinition[];
  transitions: readonly WorkflowTransitionDefinition[];
}>;

export type WorkflowTransitionCommand = Readonly<{
  tenantId: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
  workflowKey: string;
  transitionKey: WorkflowTransitionKey;
  currentStatus: WorkflowStatusKey;
  metadata?: Record<string, unknown>;
}>;

export type WorkflowTransitionResult = Readonly<{
  from: WorkflowStatusKey;
  to: WorkflowStatusKey;
  transitionKey: WorkflowTransitionKey;
}>;

export function defineWorkflowStatus(value: string): WorkflowStatusKey {
  return value as WorkflowStatusKey;
}

export function defineWorkflowTransition(value: string): WorkflowTransitionKey {
  return value as WorkflowTransitionKey;
}
