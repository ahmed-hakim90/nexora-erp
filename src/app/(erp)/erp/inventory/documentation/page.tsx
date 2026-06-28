import { DocumentationWorkspace } from "@/shared/ui";

import { inventoryDocumentationBlueprint } from "../../_documentation/app-documentation-blueprints";
import { InventoryShell } from "../_components/inventory-shell";

export default function InventoryDocumentationPage() {
  return (
    <InventoryShell activeKey="documentation">
      <DocumentationWorkspace blueprint={inventoryDocumentationBlueprint} />
    </InventoryShell>
  );
}
