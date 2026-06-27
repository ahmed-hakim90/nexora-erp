import { AppShell, PageContainer, PageHeader } from "@/shared/ui";

export default function ErpWorkspaceShellPage() {
  return (
    <AppShell
      activeWorkspaceKey="erp"
      breadcrumbs={[{ label: "ERP Workspace" }]}
      sidebarGroups={[
        {
          key: "platform",
          label: "Platform",
          items: [{ key: "shell", label: "Shell placeholder", isActive: true }],
        },
      ]}
      workspaceOptions={[{ key: "erp", label: "ERP Workspace" }]}
    >
      <PageContainer>
        <PageHeader
          description="ERP business modules, navigation, reports, and dashboards are intentionally not implemented."
          title="Platform shell only"
        />
      </PageContainer>
    </AppShell>
  );
}
