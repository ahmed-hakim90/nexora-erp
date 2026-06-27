import { MasterDataShell } from "./_components/master-data-shell";
import { PageContainer, PageHeader } from "@/shared/ui";

export default function MasterDataIndexPage() {
  return (
    <MasterDataShell activeKey="master-data">
      <PageContainer>
        <PageHeader
          description="Reusable business master records for future inventory, production, sales, purchase, and accounting modules."
          title="Master Data Foundation"
        />
      </PageContainer>
    </MasterDataShell>
  );
}
