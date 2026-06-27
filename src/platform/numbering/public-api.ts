export type DocumentNumberScope = Readonly<{
  tenantId: string;
  companyId?: string;
  branchId?: string;
  fiscalYear?: string;
  moduleKey: string;
  documentType: string;
}>;

export type NumberingResetRule = "never" | "fiscal-year" | "calendar-year" | "monthly";

export type NumberingSequenceDefinition = Readonly<{
  key: string;
  scope: DocumentNumberScope;
  prefix: string;
  padding: number;
  resetRule: NumberingResetRule;
  nextValue: number;
}>;

export type GeneratedDocumentNumber = Readonly<{
  value: string;
  sequenceKey: string;
  sequenceValue: number;
}>;
