export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[var(--container-page)] space-y-4 p-6" role="status" aria-live="polite">
      <div className="h-8 w-64 animate-pulse rounded-md bg-[hsl(var(--muted))]" />
      <div className="h-4 w-96 animate-pulse rounded-md bg-[hsl(var(--muted))]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="h-28 animate-pulse rounded-lg border bg-[hsl(var(--muted))]" key={index} />
        ))}
      </div>
      <span className="sr-only">Loading finance workspace…</span>
    </div>
  );
}
