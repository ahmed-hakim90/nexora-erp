export type ApprovalDecision = "approve" | "reject" | "return-for-correction";

export type ApprovalActor = Readonly<{
  userId: string;
  delegatedFromUserId?: string;
}>;

export type ApprovalMode = "sequential" | "parallel";

export type ApprovalStepDefinition = Readonly<{
  key: string;
  order: number;
  mode: ApprovalMode;
  requiredApproverRoleKeys?: readonly string[];
  requiredApproverUserIds?: readonly string[];
  allowSelfApproval?: boolean;
  escalationAfterMinutes?: number;
}>;

export type ApprovalPolicyDefinition = Readonly<{
  key: string;
  moduleKey: string;
  entityType: string;
  steps: readonly ApprovalStepDefinition[];
}>;

export type ApprovalSnapshot = Readonly<{
  policyKey: string;
  requestedByUserId: string;
  entityId: string;
  entityType: string;
  moduleKey: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}>;

export type ApprovalDecisionCommand = Readonly<{
  tenantId: string;
  approvalInstanceId: string;
  stepKey: string;
  decision: ApprovalDecision;
  actor: ApprovalActor;
  requestedByUserId: string;
  reason?: string;
}>;
