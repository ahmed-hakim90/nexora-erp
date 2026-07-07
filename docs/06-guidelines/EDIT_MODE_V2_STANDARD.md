# Enterprise Edit Mode v2

## Related Documents

- **[Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)** — supreme UX standard (parent)
- [Inline Editing Standard](INLINE_EDITING_STANDARD.md)
- [UX Guidelines](UX_GUIDELINES.md)
- [Form Guidelines](FORM_GUIDELINES.md)
- [ERP Page Modal Pattern](../../.cursor/rules/erp-page-modal-patterns.mdc)
- [Platform UX Constitution Rule](../../.cursor/rules/platform-ux-constitution.mdc)

> **Status:** Child standard of the [Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md) — mandatory for all profile and detail workspaces.

## Goal

Users edit almost everything from the current profile/workspace without leaving the page.

Edit Mode v2 is the official Nexora editing experience for:

- Profiles
- Record details
- Workspace details

List pages keep the modal pattern (`RecordFormDialog` + `?create=` / `?edit=`).

---

## Page Modes

Every profile/detail page has exactly two modes.

### View Mode

- Fields render as read-only values.
- One primary action: **Edit**.

### Edit Mode

- The entire page becomes editable.
- Entity and versioned fields edit inline.
- Cross-engine fields show a **Change** button that opens a workflow dialog on the same page.
- Top action bar becomes **Cancel** and **Save Changes**.
- When draft differs from saved record, show **● Unsaved changes**.

---

## Platform Components

Use only shared platform components from `src/shared/ui/patterns`:

| Component | Purpose |
|-----------|---------|
| `EditablePage` | Page shell with View/Edit bar, workflow dialog, unsaved guard |
| `EditableProfileWorkspace` | Profile layout wrapping `EditablePage` |
| `EditableSectionCard` | Section container with collapse |
| `EditableFieldGrid` | Responsive field grid |
| `EditableField` | Single field with ownership behavior |
| `useEditablePage` | Page mode, draft, changed fields, batch save |
| `useEditableField` | Legacy per-field mode fallback |
| `CrossEngineLookupWorkflow` | Generic lookup-based cross-engine dialog |

---

## Field Ownership

| Ownership | UI behavior | Save behavior |
|-----------|-------------|---------------|
| `entity` | Inline edit in Edit Mode | Included in batch save |
| `versioned` | Inline edit in Edit Mode | Included in batch save; backend may create effective-dated version |
| `cross-engine` | **Change** button opens modal | Saved through workflow dialog, never via redirect |
| `readonly` | Muted display with lock when permission denied | Never saved |

Declare ownership on every field. Never hide denied values.

---

## Save and Discard

- **Save Changes** validates all changed fields, then saves in one action.
- Default save strategy: `all-editable` (full editable payload for schema-backed actions).
- Patch endpoints may use `saveStrategy="changed-only"`.
- **Cancel** restores the original record values.
- Leaving the page with unsaved changes shows: **Save Changes**, **Discard**, **Continue Editing**.

Keyboard:

- `Ctrl/Cmd + S` → Save Changes
- `Esc` → Cancel edit (when no workflow dialog is open)
- `Tab` / `Shift + Tab` → Move between fields

---

## Cross-Engine Workflows

Cross-engine edits never navigate away.

Provide `renderWorkflow` on `EditablePage` / `EditableProfileWorkspace`:

```tsx
<EditableProfileWorkspace
  renderWorkflow={(fieldName) => <MyWorkflowPanel fieldName={fieldName} />}
  ...
/>
```

Use `workflowKey` and `workflowTitle` on field definitions. Do not use `workflowHref` or `router.push` for cross-engine edits.

---

## Visual States

| State | Indicator |
|-------|-------------|
| Editable hover | Highlight + edit affordance |
| Changed (unsaved draft) | Blue left border |
| Page dirty | Yellow **Unsaved changes** badge |
| Saved | Platform success feedback |
| Read-only | Muted text |
| Locked | Lock icon + permission message |

---

## Audit

Every saved change should record old value, new value, user, timestamp, correlation ID, and source screen through the platform audit/feedback runtime.

---

## Adoption Checklist

For each profile/detail workspace:

1. Wrap content in `EditableProfileWorkspace` or `EditablePage`.
2. Declare field ownership for every field.
3. Implement `onSave(formData, changedFields)`.
4. Provide `renderWorkflow` for every `cross-engine` field.
5. Remove separate Edit buttons and `/edit` redirects.
6. Keep list pages on the modal pattern.

---

## Business Apps

All business apps must use the same editing experience:

- Finance
- Master Data
- Inventory
- Manufacturing
- Purchasing
- HR
- Future apps (CRM, Fleet, Service, Commerce, etc.)

No module-specific edit mode behavior.
