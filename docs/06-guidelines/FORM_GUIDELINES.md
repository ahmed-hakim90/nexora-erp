# Form Guidelines

## Related Documents

- **[Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)** — supreme UX standard (parent)
- **[Easy Operator Forms Standard](EASY_OPERATOR_FORMS_STANDARD.md)** — labels, layout density, i18n, section order (mandatory)
- [UI Guidelines](UI_GUIDELINES.md)
- [UX Guidelines](UX_GUIDELINES.md)
- [Inline Editing Standard](INLINE_EDITING_STANDARD.md)
- [Edit Mode v2 Standard](EDIT_MODE_V2_STANDARD.md)
- [Lookup Guidelines](LOOKUP_GUIDELINES.md)
- [Coding Standards](../07-development/CODING_STANDARDS.md)

## Standards

Forms use React Hook Form with Zod validation at boundaries.

**Easy operator UX is mandatory.** See [Easy Operator Forms Standard](EASY_OPERATOR_FORMS_STANDARD.md) for Ahmed's standing platform bar:

- Persistent visible labels on every field (`FieldGroup` or `EntityLookup label`) — never placeholder-only.
- Max 3 columns on desktop create forms; create section before filter on list workspaces.
- Full i18n for labels, enums, and statuses in forms and tables.
- Hints on ambiguous numeric defaults.

From the Enterprise Design System:

- Use `RecordFormDialog`, `RecordFormSection`, `FieldGroup`, `FormSection`, and shared form field components from `src/shared/ui`.
- Validation schemas live in feature `application/schemas`.
- Server-side validation must repeat critical rules in application services.
- Form inputs in modals must have visible contrast in dark mode: explicit surface/background, border, text color, focus ring, and clear spacing for checkboxes/switches.

## ERP Page Modal Pattern

- List pages are the primary workspace surface.
- Create and edit open as modal overlays above the list, not as full-page forms.
- Profile and detail workspaces use inline editing per [Inline Editing Standard](INLINE_EDITING_STANDARD.md).
- `/new` redirects to list with `?create=1`; `/[id]/edit` redirects with `?edit=<id>`.
- Closing a modal removes only modal query params and preserves list filters/search/cursor.

## Prohibited Patterns

- Raw UUID text fields for business entity selection.
- Business rule validation only in the browser.
- Hardcoded permission checks in form submit handlers.
- Placeholder-only fields without persistent labels.
- Module-local labeled-field wrappers when `FieldGroup` exists.
- More than 3 columns for mixed operator create forms on desktop.
- English-only enum/status labels in localized UI.

See [UI Guidelines](UI_GUIDELINES.md) section 18 (Forms) for component-level detail.
