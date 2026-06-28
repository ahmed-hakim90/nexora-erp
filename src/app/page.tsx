import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Nexora Platform
        </p>
        <h1 className="text-3xl font-semibold">Core foundation skeleton</h1>
        <p className="text-muted-foreground">
          Sprint 1 only creates the platform shell and architecture boundaries.
          Business modules and operational screens are intentionally not
          implemented.
        </p>
        <div className="flex gap-4">
          <Link className="underline" href="/signup">
            Sign up
          </Link>
          <Link className="underline" href="/login">
            Login
          </Link>
          <Link className="underline" href="/erp">
            ERP Workspace shell
          </Link>
          <Link className="underline" href="/portal">
            HR Self-Service shell
          </Link>
        </div>
      </div>
    </main>
  );
}
