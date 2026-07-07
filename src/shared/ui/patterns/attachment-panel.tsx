"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { Download, FileText, Upload } from "lucide-react";

import { Button } from "../primitives";
import { cn } from "../utils";

export type AttachmentItem = Readonly<{
  fileName: string;
  href?: string;
  id: string;
  mimeType?: string;
  sizeLabel?: string;
  status?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  version?: number | string;
}>;

export function AttachmentPanel({
  attachments,
  emptyMessage = "No attachments yet.",
  onUpload,
  title = "Attachments",
  uploadProgress,
}: Readonly<{
  attachments: readonly AttachmentItem[];
  emptyMessage?: string;
  onUpload?: (files: FileList) => void | Promise<void>;
  title?: string;
  uploadProgress?: number | null;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !onUpload) return;
    void onUpload(files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <section className="space-y-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium">{title}</h2>
        {onUpload ? (
          <>
            <input
              className="sr-only"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
              ref={inputRef}
              type="file"
            />
            <Button onClick={() => inputRef.current?.click()} size="sm" type="button" variant="secondary">
              <Upload aria-hidden className="me-2 size-4" />
              Upload
            </Button>
          </>
        ) : null}
      </div>

      {onUpload ? (
        <div
          className={cn(
            "rounded-lg border border-dashed p-6 text-center transition-colors",
            isDragging
              ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5"
              : "border-[hsl(var(--border))] bg-[hsl(var(--surface-muted))]/40",
          )}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload aria-hidden className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Drag and drop files here</p>
          <p className="mt-1 text-xs text-muted-foreground">or use Upload to browse files</p>
          {typeof uploadProgress === "number" ? (
            <div className="mx-auto mt-4 max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                <div
                  className="h-full rounded-full bg-[hsl(var(--accent))] transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{uploadProgress}% uploaded</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {attachments.map((attachment) => (
            <AttachmentRow attachment={attachment} key={attachment.id} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AttachmentRow({ attachment }: Readonly<{ attachment: AttachmentItem }>) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{attachment.fileName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[attachment.status, attachment.sizeLabel, attachment.uploadedBy, attachment.uploadedAt]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {attachment.version ? (
            <p className="mt-0.5 text-xs text-muted-foreground">Version {attachment.version}</p>
          ) : null}
        </div>
      </div>
      {attachment.href ? (
        <a
          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-[hsl(var(--muted))]"
          href={attachment.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Download aria-hidden className="size-4" />
          Download
        </a>
      ) : null}
    </li>
  );
}

export function AttachmentPreview({
  children,
  title = "Preview",
}: Readonly<{
  children: ReactNode;
  title?: string;
}>) {
  return (
    <div className="rounded-lg border bg-[hsl(var(--surface-muted))]/40 p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
