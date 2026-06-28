import { BookOpen } from "lucide-react";

import { cn } from "../utils";

export function DocumentationHomeButton({
  href,
  label = "Getting Started",
  className,
}: Readonly<{
  href: string;
  label?: "Getting Started" | "Documentation";
  className?: string;
}>) {
  return (
    <a
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]",
        className,
      )}
      href={href}
    >
      <BookOpen aria-hidden className="size-4" />
      {label}
    </a>
  );
}
