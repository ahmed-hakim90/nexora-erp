export default function InventoryProductsLoading() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] p-6">
      <div className="mx-auto max-w-[96rem] space-y-6">
        <div className="rounded-lg border bg-[hsl(var(--surface))] p-5 shadow-sm">
          <div className="h-4 w-56 animate-pulse rounded bg-[hsl(var(--muted))]" />
          <div className="mt-4 h-9 w-72 animate-pulse rounded bg-[hsl(var(--muted))]" />
          <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-[hsl(var(--muted))]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="rounded-lg border bg-[hsl(var(--surface))] p-4 shadow-sm" key={index}>
              <div className="h-3 w-24 animate-pulse rounded bg-[hsl(var(--muted))]" />
              <div className="mt-4 h-8 w-16 animate-pulse rounded bg-[hsl(var(--muted))]" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-[hsl(var(--muted))]" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-[hsl(var(--surface))] p-4 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="h-10 animate-pulse rounded bg-[hsl(var(--muted))]" key={index} />
            ))}
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(28rem,0.9fr)]">
          <div className="h-[34rem] rounded-lg border bg-[hsl(var(--surface))] p-4 shadow-sm">
            <div className="h-full animate-pulse rounded bg-[hsl(var(--muted))]" />
          </div>
          <div className="h-[34rem] rounded-lg border bg-[hsl(var(--surface))] p-4 shadow-sm">
            <div className="h-full animate-pulse rounded bg-[hsl(var(--muted))]" />
          </div>
        </div>
      </div>
    </main>
  );
}
