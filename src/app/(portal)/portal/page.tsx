import { AppShell, PageContainer, PageHeader } from "@/shared/ui";

export default function HrPortalShellPage() {
  return (
    <AppShell
      activeWorkspaceKey="portal"
      breadcrumbs={[{ label: "HR Self-Service Portal" }]}
      sidebarGroups={[
        {
          key: "portal",
          label: "Portal",
          items: [{ key: "shell", label: "Shell placeholder", isActive: true }],
        },
      ]}
      workspaceOptions={[{ key: "portal", label: "HR Self-Service Portal" }]}
    >
      <PageContainer>
        <PageHeader
          description="Self-service workflows are intentionally not implemented. This shell remains separate from ERP modules and reports."
          title="Portal shell only"
        />
      </PageContainer>
    </AppShell>
  );
}
