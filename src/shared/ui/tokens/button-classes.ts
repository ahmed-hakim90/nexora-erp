/**
 * Link/anchor class strings aligned with `Button variant="secondary"`.
 * Use on Next.js `Link` and `<a>` elements where a button element is not valid.
 */
export const secondaryButtonLinkClassName =
  "inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-border bg-[hsl(var(--surface-muted))] px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-[hsl(var(--muted-foreground)/0.35)] hover:bg-[hsl(var(--surface-elevated))]";

export const secondaryButtonLinkSmClassName =
  "inline-flex h-8 items-center justify-center rounded-[var(--radius-md)] border border-border bg-[hsl(var(--surface-muted))] px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-[hsl(var(--muted-foreground)/0.35)] hover:bg-[hsl(var(--surface-elevated))]";

/**
 * Link/anchor/button class string aligned with `Button variant="primary"`.
 * Use on Next.js `Link`, `<a>`, and native `<button>` where shared `Button` is not used.
 */
export const primaryButtonLinkClassName =
  "inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-4 text-sm font-medium text-[hsl(var(--accent-foreground))] shadow-sm transition-colors hover:border-[hsl(var(--primary-600))] hover:bg-[hsl(var(--primary-600))] disabled:pointer-events-none disabled:opacity-50";

/**
 * Native `<input type="file">` classes. The browser "Choose File" control
 * is styled as a secondary button; keep contrast in light and dark themes.
 */
export const fileInputClassName =
  "block w-full rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2 text-sm text-[hsl(var(--foreground))] file:me-3 file:h-9 file:cursor-pointer file:rounded-[var(--radius-md)] file:border file:border-[hsl(var(--border))] file:bg-[hsl(var(--surface-muted))] file:px-3 file:text-sm file:font-medium file:text-foreground file:shadow-sm hover:file:border-[hsl(var(--muted-foreground)/0.35)] hover:file:bg-[hsl(var(--surface-elevated))]";