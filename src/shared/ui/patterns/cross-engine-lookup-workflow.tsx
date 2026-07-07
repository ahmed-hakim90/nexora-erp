"use client";

import { useState } from "react";

import { Button, EntityLookup } from "../primitives";
import type { ProfileFieldDefinition } from "./editable-profile-workspace";

export function CrossEngineLookupWorkflow({
  currentValue,
  field,
  onCancel,
  onSubmit,
}: Readonly<{
  currentValue: unknown;
  field: ProfileFieldDefinition;
  onCancel: () => void;
  onSubmit: (value: string) => Promise<void>;
}>) {
  const [value, setValue] = useState(currentValue ? String(currentValue) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (field.isRequired && !value) {
      setError(`${field.label} is required.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit(value);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save change.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Update {field.label.toLowerCase()} through the owning engine. This dialog stays on the current page.
      </p>
      {field.lookupProviderKey ? (
        <EntityLookup
          label={field.label}
          onValueChange={setValue}
          providerKey={field.lookupProviderKey}
          required={field.isRequired}
          value={value}
        />
      ) : (
        <EntityLookup
          label={field.label}
          onValueChange={setValue}
          options={field.lookupOptions ?? []}
          required={field.isRequired}
          value={value}
        />
      )}
      {error ? (
        <p className="text-sm text-[hsl(var(--danger))]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button disabled={saving} onClick={onCancel} type="button" variant="secondary">
          Cancel
        </Button>
        <Button disabled={saving} onClick={() => void save()} type="button" variant="primary">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
