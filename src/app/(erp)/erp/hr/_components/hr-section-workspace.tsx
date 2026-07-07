import type { ReactNode } from "react";

import type { BilingualHelp } from "@/shared/ui";
import { PageContainer, PageHeader } from "@/shared/ui";

export function HrSectionWorkspace({
  children,
  description,
  help,
  sections,
  title,
}: Readonly<{
  children?: ReactNode;
  description: string;
  help?: BilingualHelp;
  sections?: readonly { description: string; href?: string; label: string }[];
  title: string;
}>) {
  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader description={description} help={help} title={title} />
      <div className="space-y-6">
        {sections && sections.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <article className="rounded-lg border bg-[hsl(var(--surface))] p-5" key={section.label}>
                <h2 className="font-medium">{section.label}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
              </article>
            ))}
          </section>
        ) : null}
        {children}
      </div>
    </PageContainer>
  );
}
