# Enterprise Inline Editing Standard

## Related Documents

- **[Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)** — supreme UX standard (parent)
- [UX Guidelines](UX_GUIDELINES.md)
- [UI Guidelines](UI_GUIDELINES.md)
- [Form Guidelines](FORM_GUIDELINES.md)
- [Lookup Guidelines](LOOKUP_GUIDELINES.md)
- [Operator Experience](../01-platform/OPERATOR_EXPERIENCE.md)
- [Edit Mode v2](EDIT_MODE_V2_STANDARD.md)
- [ERP Page Modal Pattern](../../.cursor/rules/erp-page-modal-patterns.mdc)
- [No Native Date Inputs](../../.cursor/rules/no-native-date-inputs.mdc)
- [Platform UX Constitution Rule](../../.cursor/rules/platform-ux-constitution.mdc)

> **Status:** Child standard of the [Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md) — mandatory for all new and migrated screens.

## Goal

Adopt a single enterprise editing experience across the entire Nexora Platform.

Users should never feel forced to navigate through many pages to edit data. Every profile, document, master record, and transaction should support contextual inline editing while still respecting business ownership, permissions, and audit rules.

This standard applies to:

- Platform
- HR
- Finance
- SCM / Inventory / Purchasing
- Manufacturing
- CRM
- Commerce
- Fleet
- Projects
- Service Center
- POS

No new module should introduce standalone edit pages unless business workflow explicitly requires a wizard or document lifecycle.

---

## Global UX Principle

**Everything looks editable. Not everything is directly editable.**

When a field belongs to another engine, clicking Edit launches the correct workflow instead of modifying the value directly. The user never needs to know which engine owns the data.

---

## Platform Components

All inline editing must use shared platform components from `src/shared/ui`:

| Component | Purpose |
| --- | --- |
| `EditableField` | Single-field inline editing with unified modes and keyboard behavior |
| `EditableSectionCard` | Profile/detail section shell with header actions and independent edit scope |
| `useEditableField` | Save state, validation, optimistic update orchestration |

### `EditableField` Modes

Every editable field uses the same behavior:

| Mode | Behavior |
| --- | --- |
| `display` | Default read surface with editable affordance |
| `hover` | Pointer/focus affordance before activation |
| `editing` | Active inline editor |
| `saving` | Spinner and disabled editor while persisting |
| `success` | Brief success feedback, then return to display |
| `validation-error` | Inline error badge and tooltip |
| `permission-denied` | Visible field with lock icon and tooltip |
| `read-only` | Visible field, no edit affordance (includes `ownership="readonly"`) |

---

## Inline Editing Types

Every editor must reuse platform components. No HTML native controls.

| Type | Platform Component |
| --- | --- |
| Simple text | `Input` |
| Number | `Input` (`type="number"`) |
| Textarea | `Input` / textarea primitive |
| Entity lookup | `EntityLookup` |
| Date | `DatePicker` / `DatePickerField` |
| Date time | `DatePicker` (`mode="datetime"`) |
| Select | `Select` |
| Multi select | Platform multi-select (module-specific until shared primitive ships) |
| Currency | `Input` with locale formatting |
| Percentage | `Input` with `%` suffix |
| Checkbox | `Checkbox` |
| Switch | `Switch` |
| Tags | Platform tags editor |
| Phone | `Input` with phone formatting |
| Email | `Input` (`type="email"`) |
| Address | Structured address editor |
| Avatar upload | File upload workflow |
| Signature | Signature capture workflow |
| Rich text | Rich text editor |
| Files | File attachment workflow |

---

## Date Rule

Never use `<input type="date">`.

Use the enterprise `DatePicker` everywhere:

- Employee
- Contracts
- Attendance
- Leave
- Payroll
- Finance
- Inventory
- CRM
- Manufacturing
- Projects
- Fleet
- Everything

Form values remain ISO `YYYY-MM-DD`. Display formatting comes from locale and company date format via `EnterpriseUiProvider`.

---

## Entity Rule

Never expose IDs in UI.

Every relation uses `EntityLookup`:

- Department
- Position
- Employee
- Customer
- Vendor
- Warehouse
- Product
- Machine
- Branch
- Company
- Manager
- Everything

Internal IDs are persistence-only. Users always see business labels.

---

## Saving Pattern

```text
Display
  ↓ click
Inline editor
  ↓ validate
Save
  ↓ success toast (platform.feedback)
Optimistic update
  ↓
Refresh only affected section
```

Rules:

- Never reload the full page for a single-field save.
- Use optimistic updates where safe.
- Success feedback goes through `platform.feedback`; apps must not import Sonner directly.
- Server-side validation must repeat critical rules in application services.
- Every save records audit metadata: who, when, old value, new value, reason.

---

## Permission Rule

If the user lacks permission:

- Field remains visible (unless security requires hiding).
- Field renders in `permission-denied` or `read-only` mode.
- Show lock icon and tooltip explaining why.
- Do not rely on frontend-only hiding for sensitive operations.

Use `PermissionAwareField` or `EditableField` with `canEdit={false}` and `permissionMessage`.

---

## Business Ownership Rule

### Owned by current entity → inline save

Examples:

- Name
- Phone
- Email
- Address
- Photo
- Notes
- Emergency contact
- National ID
- Bank account

Set `ownership="entity"` on `EditableField`.

### Owned by another engine → open proper workflow

Set `ownership="cross-engine"` and provide `onWorkflowOpen` or `workflowHref`. No direct database updates from inline editors.

### Display only → readonly

Set `ownership="readonly"` for audit/system fields such as created at, created by, document number, posting status, and last login.

Examples:

| Field | Workflow |
| --- | --- |
| Department | Assignment dialog |
| Position | Assignment dialog |
| Manager | Assignment dialog |
| Shift | Assignment dialog |
| Payroll group | Assignment dialog |
| Cost center | Assignment dialog |
| Salary | Salary package dialog |
| Contract | Contract amendment dialog |
| Leave balance | Leave adjustment document |
| Custody | Custody transaction |
| Performance rating | Performance review |
| Loan | Loan document |
| Advance | Advance document |

Set `ownership="cross-engine"` and provide `onWorkflowOpen`. No direct database updates from inline editors.

---

## Profile Pages

Every profile becomes a workspace:

- Employee
- Customer
- Vendor
- Asset
- Machine
- Product
- Project
- Vehicle
- Branch
- Warehouse
- Company

Rules:

- Every card is editable.
- Every section edits independently.
- Use tabbed or sectioned layout instead of monolithic edit pages.
- List pages still use modal create/edit per [ERP Page Modal Pattern](../../.cursor/rules/erp-page-modal-patterns.mdc).
- Profile/detail routes use `EditableSectionCard` sections.

---

## Section Pattern

Use `EditableSectionCard`:

```text
Card Header
  Title
  Last Updated
  Actions: Edit | History | Audit | Collapse
Body
  Inline editable controls (EditableField grid)
```

Each section:

- Loads independently.
- Saves independently.
- Can show its own audit timeline.
- Supports collapse for long profiles.

---

## Large Forms

Replace huge edit pages with sectioned profile workspaces:

- Overview
- Personal
- Employment
- Payroll
- Attendance
- Documents
- Skills
- Contracts

Each section edits independently. Full-page wizards remain only for complex document lifecycles.

---

## Auto Save

Optional. Allowed only for:

- Notes
- Descriptions
- Comments

Never auto-save:

- Financial values
- Assignment changes
- Contract terms
- Payroll amounts
- Inventory quantities

---

## Audit And History

Every save records:

- Who
- When
- Old value
- New value
- Reason (when business policy requires it)

Every editable card should expose:

- View History
- Compare Versions
- Restore (when allowed)

Reuse `SaveAuditMetadata`, `AuditActivityTimeline`, and platform audit services.

---

## Validation

Validation happens at:

1. Client (immediate feedback)
2. Server (authoritative)
3. Business rules (application services)
4. Permission checks
5. RLS

Nothing bypasses the service layer.

Use `usePlatformFormValidation` patterns for field-level errors with readable labels.

---

## Visual Feedback

Required states:

- Saving spinner
- Success animation
- Error badge
- Validation tooltip
- Unsaved indicator
- Required field marker

Keyboard shortcuts:

| Key | Action |
| --- | --- |
| `Escape` | Cancel edit |
| `Enter` | Save (single-line fields) |
| `Tab` | Next field |

---

## Mobile

Inline editing must work on:

- Desktop
- Tablet
- Mobile

Use responsive layouts. Touch targets must meet platform accessibility minimums.

---

## Performance

- Only the edited section reloads.
- No full page refresh.
- Use optimistic updates where safe.
- Debounce autosave for notes/comments.

---

## Accessibility

Every inline editor must support:

- Keyboard navigation
- ARIA labels
- Screen reader announcements for save/error states
- Focus management on enter/exit edit mode
- Color contrast in light and dark themes

---

## Implementation Rule

This is an enterprise platform standard.

When building or migrating a screen:

1. Inspect existing shared UI in `src/shared/ui`.
2. Use `EditableField` and `EditableSectionCard` for profile/detail surfaces.
3. Use `RecordFormDialog` for list create/edit modals.
4. Route cross-engine fields to the correct workflow dialog.
5. Add or update feature loaders, actions, schemas, and focused tests.
6. Update module documentation when adopting the pattern.

Do not create module-local inline edit primitives.

---

## Migration Priority

1. Profile/detail workspaces (Employee, Product, Customer, Vendor, Asset)
2. Master data cards inside detail views
3. Transaction header fields owned by the document
4. Remaining full-page edit routes → redirect to profile section or list modal

---

## Verification Checklist

Before marking a screen compliant:

- [ ] Uses `EditableField` or justified modal pattern
- [ ] No `<input type="date">`
- [ ] Relations use `EntityLookup`
- [ ] Cross-engine fields open workflows
- [ ] Permission-denied fields are visible with lock/tooltip
- [ ] Saves use `platform.feedback`
- [ ] Audit metadata recorded
- [ ] Section-level refresh only
- [ ] Keyboard shortcuts work
- [ ] Dark mode contrast verified
- [ ] Mobile layout verified
