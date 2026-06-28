import { ArrowRight, CheckCircle2, CircleDashed, ExternalLink, PlayCircle, Wand2 } from "lucide-react";

import type {
  DocumentationBlock,
  DocumentationBlueprint,
  DocumentationContentStatus,
  DocumentationSectionDefinition,
} from "@/platform/documentation/public-api";

import { PageActions, PageContainer, PageContent, PageHeader } from "../page";
import { cn } from "../utils";
import { DocumentationHomeButton } from "./documentation-home-button";

const statusLabels: Record<DocumentationContentStatus, string> = {
  draft: "Draft",
  "pending-approval": "Pending approval",
  ready: "Ready",
};

const checklistStatusLabels = {
  complete: "Complete",
  "needs-attention": "Needs attention",
  "not-started": "Not started",
  optional: "Optional",
} as const;

function StatusBadge({ status }: Readonly<{ status: DocumentationContentStatus }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        status === "ready" && "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
        status === "draft" && "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
        status === "pending-approval" && "border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-muted-foreground",
      )}
    >
      {status === "ready" ? <CheckCircle2 aria-hidden className="size-3.5" /> : <CircleDashed aria-hidden className="size-3.5" />}
      {statusLabels[status]}
    </span>
  );
}

function ChecklistStatusBadge({
  status = "not-started",
}: Readonly<{
  status?: "complete" | "needs-attention" | "not-started" | "optional";
}>) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[0.68rem] font-medium",
        status === "complete" && "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
        status === "needs-attention" && "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
        status === "optional" && "border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]",
        status === "not-started" && "border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-muted-foreground",
      )}
    >
      {checklistStatusLabels[status]}
    </span>
  );
}

function BlockTitle({ title }: Readonly<{ title?: string }>) {
  return title ? <h3 className="text-sm font-semibold">{title}</h3> : null;
}

function DocumentationBlockRenderer({ block }: Readonly<{ block: DocumentationBlock }>) {
  if (block.type === "paragraph") {
    return <p className="text-sm leading-6 text-muted-foreground">{block.text}</p>;
  }

  if (block.type === "list") {
    return (
      <div className="space-y-2">
        <BlockTitle title={block.title} />
        <ul className="grid gap-2 text-sm text-muted-foreground">
          {block.items.map((item) => (
            <li className="flex gap-2" key={item}>
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-[hsl(var(--success))]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.type === "checklist") {
    return (
      <div className="space-y-3">
        <BlockTitle title={block.title} />
        <div className="grid gap-2">
          {block.items.map((item) => {
            const content = (
              <>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.detail ? <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p> : null}
                </div>
                <ChecklistStatusBadge status={item.status} />
              </>
            );

            return item.href ? (
              <a
                className="flex items-center justify-between gap-3 rounded-lg border bg-[hsl(var(--muted))]/35 p-3 transition-colors hover:border-[hsl(var(--accent))]"
                href={item.href}
                key={item.label}
              >
                {content}
              </a>
            ) : (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border bg-[hsl(var(--muted))]/35 p-3"
                key={item.label}
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "flow") {
    return (
      <div className="space-y-3">
        <BlockTitle title={block.title} />
        <div className="grid gap-2">
          {block.steps.map((step, index) => {
            const body = (
              <div className="rounded-lg border bg-[hsl(var(--muted))]/35 p-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-[hsl(var(--accent))]/10 text-xs font-semibold text-[hsl(var(--accent))]">
                    {index + 1}
                  </span>
                  <h3 className="text-sm font-medium">{step.label}</h3>
                </div>
                {step.description ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p> : null}
              </div>
            );

            return (
              <div className="grid gap-2" key={step.label}>
                {step.href ? (
                  <a className="block transition-colors hover:border-[hsl(var(--accent))]" href={step.href}>
                    {body}
                  </a>
                ) : (
                  body
                )}
                {index < block.steps.length - 1 ? (
                  <ArrowRight aria-hidden className="ms-6 size-4 rotate-90 text-muted-foreground" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "cards") {
    return (
      <div className="space-y-3">
        <BlockTitle title={block.title} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {block.cards.map((card) => {
            const badgeStatus =
              card.status === "ready"
                ? "complete"
                : card.status === "required"
                  ? "needs-attention"
                  : card.status;
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium">{card.title}</h3>
                  {badgeStatus ? <ChecklistStatusBadge status={badgeStatus} /> : null}
                </div>
                {card.metric ? <p className="mt-2 text-2xl font-semibold tabular-nums">{card.metric}</p> : null}
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.description}</p>
              </>
            );

            return card.href ? (
              <a
                className="rounded-lg border bg-[hsl(var(--muted))]/35 p-4 transition-colors hover:border-[hsl(var(--accent))]"
                href={card.href}
                key={card.title}
              >
                {content}
              </a>
            ) : (
              <div className="rounded-lg border bg-[hsl(var(--muted))]/35 p-4" key={card.title}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "qa") {
    return (
      <div className="space-y-3">
        <BlockTitle title={block.title} />
        <div className="grid gap-3">
          {block.items.map((item) => (
            <div className="rounded-lg border bg-[hsl(var(--muted))]/35 p-4" key={item.question}>
              <h3 className="text-sm font-medium">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BlockTitle title={block.title} />
      <div className="flex flex-wrap gap-2">
        {block.actions.map((action) => (
          <a
            aria-disabled={!action.isEnabled}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]",
              !action.isEnabled && "pointer-events-none opacity-60",
            )}
            href={action.href ?? "#"}
            key={action.key}
          >
            {action.label}
            {action.href ? <ExternalLink aria-hidden className="size-3.5" /> : null}
          </a>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ section }: Readonly<{ section: DocumentationSectionDefinition }>) {
  return (
    <article className="scroll-mt-32 rounded-xl border bg-[hsl(var(--surface))] p-5 shadow-sm" id={section.key}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{section.purpose}</p>
        </div>
        <StatusBadge status={section.status} />
      </div>
      {section.blocks && section.blocks.length > 0 ? (
        <div className="mt-5 space-y-5">
          {section.blocks.map((block, index) => (
            <DocumentationBlockRenderer block={block} key={`${section.key}-${block.type}-${index}`} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed bg-[hsl(var(--muted))]/40 p-4 text-sm text-muted-foreground">
          Content is not available yet for this section.
        </div>
      )}
    </article>
  );
}

function DocumentationNavigation({ sections }: Readonly<{ sections: readonly DocumentationSectionDefinition[] }>) {
  return (
    <aside className="rounded-xl border bg-[hsl(var(--surface))] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Documentation Sections</p>
      <nav aria-label="Documentation sections" className="mt-3 grid gap-1">
        {sections.map((section) => (
          <a
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
            href={`#${section.key}`}
            key={section.key}
          >
            {section.title}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function EngineReadinessPanel({ blueprint }: Readonly<{ blueprint: DocumentationBlueprint }>) {
  const readySections = blueprint.sections.filter((section) => section.status === "ready").length;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <article className="rounded-xl border bg-[hsl(var(--surface))] p-5 lg:col-span-2">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]">
            <Wand2 aria-hidden className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Built-in documentation</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {blueprint.appName} includes product documentation inside Nexora, so users can learn setup, workflow,
              health checks, and daily usage without leaving the app.
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-xl border bg-[hsl(var(--surface))] p-5">
        <h2 className="font-semibold">Guided setup status</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Required sections</span>
            <span className="font-medium tabular-nums">{blueprint.sections.length}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Ready sections</span>
            <span className="font-medium tabular-nums">{readySections}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Sample data</span>
            <span className="font-medium">Defined</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Interactive tour</span>
            <span className="font-medium">Defined</span>
          </div>
        </div>
      </article>
    </section>
  );
}

function SetupPreview({ sections }: Readonly<{ sections: readonly DocumentationSectionDefinition[] }>) {
  const setupSections = sections.filter((section) =>
    ["before-you-start", "recommended-setup-order", "first-time-setup-guide", "required-master-data", "health-check", "quick-actions"].includes(section.key),
  );

  return (
    <section className="rounded-xl border bg-[hsl(var(--surface))] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Guided setup framework</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with these sections when configuring the app for the first time.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border bg-[hsl(var(--muted))] px-3 py-2 text-sm font-medium text-muted-foreground"
          disabled
          type="button"
        >
          <PlayCircle aria-hidden className="size-4" />
          Take a 2-minute tour
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {setupSections.map((section, index) => (
          <a
            className="group rounded-lg border bg-[hsl(var(--muted))]/35 p-4 transition-colors hover:border-[hsl(var(--accent))]"
            href={`#${section.key}`}
            key={section.key}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Step {index + 1}
              </span>
              <ArrowRight aria-hidden className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <h3 className="mt-2 font-medium">{section.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{section.purpose}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

function DependencyPanel({ blueprint }: Readonly<{ blueprint: DocumentationBlueprint }>) {
  return (
    <section className="rounded-xl border bg-[hsl(var(--surface))] p-5">
      <h2 className="font-semibold">Dependency and action slots</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use this area to understand app dependencies and jump to the records needed for setup.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border bg-[hsl(var(--muted))]/35 p-4">
          <h3 className="text-sm font-medium">Dependencies</h3>
          {blueprint.dependencies && blueprint.dependencies.length > 0 ? (
            <div className="mt-3 space-y-2">
              {blueprint.dependencies.map((dependency) => (
                <a
                  className="flex items-center justify-between rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm"
                  href={dependency.href}
                  key={dependency.appKey}
                >
                  <span>{dependency.label}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {dependency.requirement}
                    <ExternalLink aria-hidden className="size-3" />
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">This app has no listed dependencies.</p>
          )}
        </div>
        <div className="rounded-lg border bg-[hsl(var(--muted))]/35 p-4">
          <h3 className="text-sm font-medium">Quick Actions</h3>
          {blueprint.quickActions && blueprint.quickActions.length > 0 ? (
            <div className="mt-3 space-y-2">
              {blueprint.quickActions.map((action) => (
                <a
                  aria-disabled={!action.isEnabled}
                  className={cn(
                    "block rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm",
                    !action.isEnabled && "pointer-events-none opacity-60",
                  )}
                  href={action.href ?? "#"}
                  key={action.key}
                >
                  {action.label}
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No quick actions are available yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function DocumentationWorkspace({ blueprint }: Readonly<{ blueprint: DocumentationBlueprint }>) {
  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description="A built-in documentation and guided setup workspace for this business app."
        title={`${blueprint.appName} Documentation`}
      >
        <PageActions>
          <StatusBadge status={blueprint.status} />
          <DocumentationHomeButton href={blueprint.homeHref} label="Documentation" />
        </PageActions>
      </PageHeader>

      <PageContent>
        <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <DocumentationNavigation sections={blueprint.sections} />
          <div className="min-w-0 space-y-4">
            <EngineReadinessPanel blueprint={blueprint} />
            <SetupPreview sections={blueprint.sections} />
            <DependencyPanel blueprint={blueprint} />
            <div className="space-y-4">
              {blueprint.sections.map((section) => (
                <SectionCard key={section.key} section={section} />
              ))}
            </div>
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}
