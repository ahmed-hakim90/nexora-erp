import { DocumentationWorkspace } from "@/shared/ui";

import { manufacturingDocumentationBlueprint } from "../../_documentation/app-documentation-blueprints";
import { ManufacturingShell } from "../_components/manufacturing-shell";

export default function ManufacturingDocumentationPage() {
  return (
    <ManufacturingShell activeKey="documentation">
      <DocumentationWorkspace blueprint={manufacturingDocumentationBlueprint} />
    </ManufacturingShell>
  );
}
