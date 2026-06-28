"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type LoginResponse = Readonly<{
  error?: string;
  redirectTo?: string;
}>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as LoginResponse;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to sign in.");
      return;
    }

    const requestedPath = new URLSearchParams(window.location.search).get("next");
    const redirectTo = requestedPath?.startsWith("/") ? requestedPath : payload.redirectTo ?? "/erp";

    window.location.assign(redirectTo);
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <section className="space-y-6">
          <Link className="text-sm font-medium text-muted-foreground underline" href="/">
            Nexora Platform
          </Link>
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              ERP access
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
              Sign in to your company workspace.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Login restores your Supabase session and selects your active tenant,
              first company, and main branch for ERP pages.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-surface-elevated p-6 shadow-lg">
          <div className="mb-6 space-y-2">
            <h2 className="text-2xl font-semibold">Login</h2>
            <p className="text-sm text-muted-foreground">
              Use the email and password from your signup.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm font-medium">
              <span>Email</span>
              <input
                autoComplete="email"
                className="w-full rounded-md border bg-background px-3 py-2"
                name="email"
                placeholder="admin@example.com"
                required
                type="email"
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Password</span>
              <input
                autoComplete="current-password"
                className="w-full rounded-md border bg-background px-3 py-2"
                name="password"
                placeholder="Your password"
                required
                type="password"
              />
            </label>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Need a first company?{" "}
            <Link className="font-medium text-primary underline" href="/signup">
              Create workspace
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
