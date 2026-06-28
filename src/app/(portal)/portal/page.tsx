import { AppShell, PageContainer, PageHeader } from "@/shared/ui";

export default function HrPortalShellPage() {
  return (
    <AppShell
      breadcrumbs={[{ label: "HR Self-Service Portal" }]}
      homeHref="/portal"
      workspace={{ key: "portal", name: "HR Self-Service Portal" }}
      workspaceNav={[{ key: "shell", label: "Overview", href: "/portal", isActive: true }]}
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
