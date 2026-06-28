"use client";

import { useEffect, useMemo, useState } from "react";

import type { CommandDefinition, NavigationContribution } from "@/platform/navigation/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";
import type { SearchResult } from "@/platform/search/public-api";
import { Input } from "@/shared/ui";
import {
  createWorkspaceSearchRegistry,
  runWorkspaceSearch,
  type WorkspaceAppModel,
} from "@/shared/workspace/public-api";

export function GlobalSearchPanel({
  apps,
  commands,
  navigation,
  context,
}: Readonly<{
  apps: readonly WorkspaceAppModel[];
  commands: readonly CommandDefinition[];
  navigation: readonly NavigationContribution[];
  context: {
    tenantId: string;
    companyId?: string | null;
    branchId?: string | null;
    permissions: readonly string[];
  };
}>) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<readonly SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const commandByKey = useMemo(
    () => new Map(commands.map((command) => [command.key, command])),
    [commands],
  );
  const registry = useMemo(
    () => createWorkspaceSearchRegistry({ apps, commands, navigation }),
    [apps, commands, navigation],
  );

  useEffect(() => {
    let isCurrent = true;

    async function search() {
      if (term.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const page = await runWorkspaceSearch(
        registry,
        {
          branchId: context.branchId,
          companyId: context.companyId,
          experience: "erp",
          limit: 8,
          tenantId: context.tenantId,
          term,
        },
        {
          branchId: context.branchId,
          companyId: context.companyId,
          experience: "erp",
          favoriteEntityIds: apps.filter((app) => app.isFavorite).map((app) => app.key),
          grantedPermissions: new Set(context.permissions as readonly PermissionKey[]),
          recentEntityIds: apps.filter((app) => app.recentActivityCount > 0).map((app) => app.key),
          tenantId: context.tenantId,
        },
      );

      if (isCurrent) {
        setResults(page.records);
        setIsSearching(false);
      }
    }

    void search();

    return () => {
      isCurrent = false;
    };
  }, [apps, context.branchId, context.companyId, context.permissions, context.tenantId, registry, term]);

  return (
    <div className="w-[min(34rem,calc(100vw-3rem))] space-y-3">
      <Input
        aria-label="Search apps, documents, products, reports, production, finance, inventory, manufacturing, settings, users, and commands"
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search apps, commands, navigation..."
        value={term}
      />
      <p className="text-xs text-muted-foreground">
        Search uses platform Search contracts and is scoped by tenant, company, branch, and
        permissions.
      </p>
      {isSearching ? <p className="text-sm text-muted-foreground">Searching...</p> : null}
      {!isSearching && term.trim().length >= 2 && results.length === 0 ? (
        <div className="rounded-md border border-dashed p-4">
          <p className="text-sm font-medium">No results found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Runtime document and record indexes are not connected yet.
          </p>
        </div>
      ) : null}
      {results.length > 0 ? (
        <div className="max-h-80 space-y-1 overflow-auto">
          {results.map((result) => {
            const href = result.href ?? commandByKey.get(result.commandKey ?? "")?.href;
            return (
              <a
                className="block rounded-md border bg-[hsl(var(--surface))] p-3 transition hover:bg-[hsl(var(--muted))]"
                href={href ?? "#"}
                key={`${result.moduleKey}-${result.entityId}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{result.title}</p>
                  <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    {result.type ?? result.entityType}
                  </span>
                </div>
                {result.subtitle ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{result.subtitle}</p>
                ) : null}
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
