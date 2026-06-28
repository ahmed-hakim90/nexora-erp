export type DocumentationContentStatus = "pending-approval" | "draft" | "ready";

export type DocumentationSectionKey =
  | "overview"
  | "before-you-start"
  | "recommended-setup-order"
  | "first-time-setup-guide"
  | "required-master-data"
  | "business-workflow"
  | "sample-data"
  | "common-mistakes"
  | "faq"
  | "best-practices"
  | "dependencies"
  | "health-check"
  | "quick-actions"
  | "interactive-walkthrough";

export type DocumentationSectionDefinition = Readonly<{
  key: DocumentationSectionKey;
  title: string;
  purpose: string;
  status: DocumentationContentStatus;
  blocks?: readonly DocumentationBlock[];
}>;

export type DocumentationDependency = Readonly<{
  appKey: string;
  label: string;
  href: string;
  requirement: "required" | "optional" | "later";
}>;

export type DocumentationAction = Readonly<{
  key: string;
  label: string;
  href?: string;
  isEnabled: boolean;
  reason?: string;
}>;

export type DocumentationBlock =
  | Readonly<{
      type: "paragraph";
      text: string;
    }>
  | Readonly<{
      type: "list";
      title?: string;
      items: readonly string[];
    }>
  | Readonly<{
      type: "checklist";
      title?: string;
      items: readonly DocumentationChecklistItem[];
    }>
  | Readonly<{
      type: "flow";
      title?: string;
      steps: readonly DocumentationFlowStep[];
    }>
  | Readonly<{
      type: "cards";
      title?: string;
      cards: readonly DocumentationCard[];
    }>
  | Readonly<{
      type: "qa";
      title?: string;
      items: readonly DocumentationQuestionAnswer[];
    }>
  | Readonly<{
      type: "actions";
      title?: string;
      actions: readonly DocumentationAction[];
    }>;

export type DocumentationChecklistItem = Readonly<{
  label: string;
  href?: string;
  status?: "complete" | "needs-attention" | "not-started" | "optional";
  detail?: string;
}>;

export type DocumentationFlowStep = Readonly<{
  label: string;
  href?: string;
  description?: string;
}>;

export type DocumentationCard = Readonly<{
  title: string;
  description: string;
  href?: string;
  status?: "required" | "optional" | "needs-attention" | "ready";
  metric?: string;
}>;

export type DocumentationQuestionAnswer = Readonly<{
  question: string;
  answer: string;
}>;

export type DocumentationBlueprint = Readonly<{
  appKey: string;
  appName: string;
  homeHref: string;
  documentationHref: string;
  status: DocumentationContentStatus;
  sections: readonly DocumentationSectionDefinition[];
  dependencies?: readonly DocumentationDependency[];
  quickActions?: readonly DocumentationAction[];
}>;

export const REQUIRED_BUSINESS_APP_DOCUMENTATION_SECTIONS = [
  {
    key: "overview",
    purpose: "Explains what the app does, the business problem it solves, who should use it, and the main concepts.",
    title: "Overview",
  },
  {
    key: "before-you-start",
    purpose: "Lists prerequisites and expected setup time before users begin using the app.",
    title: "Before You Start",
  },
  {
    key: "recommended-setup-order",
    purpose: "Shows a clickable visual checklist for the safest setup order.",
    title: "Recommended Setup Order",
  },
  {
    key: "first-time-setup-guide",
    purpose: "Guides first-time users through the data they must enter, where to enter it, and why it matters.",
    title: "First-Time Setup Guide",
  },
  {
    key: "required-master-data",
    purpose: "Displays required and optional master data with completion status.",
    title: "Required Master Data",
  },
  {
    key: "business-workflow",
    purpose: "Explains the app's end-to-end business workflow as a plain-language flow.",
    title: "Business Workflow",
  },
  {
    key: "sample-data",
    purpose: "Offers approved demo data generation for learning and practice.",
    title: "Sample Data",
  },
  {
    key: "common-mistakes",
    purpose: "Explains common setup and workflow mistakes with simple fixes.",
    title: "Common Mistakes",
  },
  {
    key: "faq",
    purpose: "Answers practical questions in simple language.",
    title: "FAQ",
  },
  {
    key: "best-practices",
    purpose: "Gives recommended business usage patterns, not technical limitations.",
    title: "Best Practices",
  },
  {
    key: "dependencies",
    purpose: "Shows required, optional, and later app dependencies with navigation.",
    title: "Dependencies",
  },
  {
    key: "health-check",
    purpose: "Runs an automatic readiness checklist and points users to fixes.",
    title: "Health Check",
  },
  {
    key: "quick-actions",
    purpose: "Lets users create missing required records directly from documentation.",
    title: "Quick Actions",
  },
  {
    key: "interactive-walkthrough",
    purpose: "Offers a short first-time tour of navigation, pages, buttons, and workflow.",
    title: "Interactive Walkthrough",
  },
] as const satisfies readonly Omit<DocumentationSectionDefinition, "status">[];

export function createDocumentationBlueprint(
  input: Omit<DocumentationBlueprint, "sections" | "status"> &
    Readonly<{
      status?: DocumentationContentStatus;
      sections?: readonly DocumentationSectionDefinition[];
    }>,
): DocumentationBlueprint {
  const status = input.status ?? "pending-approval";

  return {
    ...input,
    sections:
      input.sections ??
      REQUIRED_BUSINESS_APP_DOCUMENTATION_SECTIONS.map((section) => ({
        ...section,
        status,
      })),
    status,
  };
}
