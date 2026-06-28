import { DocumentationWorkspace } from "@/shared/ui";

import { financeDocumentationBlueprint } from "../../_documentation/app-documentation-blueprints";
import { FinanceShell } from "../_components/finance-shell";

export default function FinanceDocumentationPage() {
  return (
    <FinanceShell activeKey="documentation">
      <DocumentationWorkspace blueprint={financeDocumentationBlueprint} />
    </FinanceShell>
  );
}
