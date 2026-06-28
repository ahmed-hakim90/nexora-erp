"use client";

import { Button } from "@/shared/ui";

export default function InventoryProductsError({
  error,
  reset,
}: Readonly<{
  error: Error;
  reset: () => void;
}>) {
  return (
    <main className="grid min-h-screen place-items-center bg-[hsl(var(--background))] p-6">
      <section className="max-w-xl rounded-lg border bg-[hsl(var(--surface))] p-6 text-center shadow-sm" role="alert">
        <div className="mx-auto grid size-20 place-items-center rounded-lg border bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]">
          <span className="text-2xl font-semibold">!</span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Products workspace could not load</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{error.message}</p>
        <Button className="mt-5" onClick={reset} type="button" variant="primary">
          Retry
        </Button>
      </section>
    </main>
  );
}
