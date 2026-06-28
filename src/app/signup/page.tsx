"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type OnboardingResponse = Readonly<{
  error?: string;
  redirectTo?: string;
}>;

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/onboarding/first-company", {
      body: JSON.stringify({
        companyName: formData.get("companyName"),
        displayName: formData.get("displayName"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as OnboardingResponse;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to create your workspace.");
      return;
    }

    window.location.assign(payload.redirectTo ?? "/erp");
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_440px]">
        <section className="space-y-6">
          <Link className="text-sm font-medium text-muted-foreground underline" href="/">
            Nexora Platform
          </Link>
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              First company onboarding
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
              Create your ERP workspace and first company.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Sign up, create the tenant, company, main branch, and owner role in
              one step so authenticated ERP pages can load with the right context.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-surface-elevated p-6 shadow-lg">
          <div className="mb-6 space-y-2">
            <h2 className="text-2xl font-semibold">Sign up</h2>
            <p className="text-sm text-muted-foreground">
              This creates the first company and makes you the tenant administrator.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm font-medium">
              <span>Your name</span>
              <input
                autoComplete="name"
                className="w-full rounded-md border bg-background px-3 py-2"
                name="displayName"
                placeholder="Hakimo Admin"
                required
                type="text"
              />
            </label>

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
                autoComplete="new-password"
                className="w-full rounded-md border bg-background px-3 py-2"
                minLength={8}
                name="password"
                placeholder="At least 8 characters"
                required
                type="password"
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Company name</span>
              <input
                autoComplete="organization"
                className="w-full rounded-md border bg-background px-3 py-2"
                name="companyName"
                placeholder="Nexora Trading"
                required
                type="text"
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
              {isSubmitting ? "Creating workspace..." : "Create workspace"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="font-medium text-primary underline" href="/login">
              Login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
