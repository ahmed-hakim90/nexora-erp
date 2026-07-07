# Form Guidelines

## Related Documents

- **[Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)** — supreme UX standard (parent)
- [UI Guidelines](UI_GUIDELINES.md)
- [UX Guidelines](UX_GUIDELINES.md)
- [Inline Editing Standard](INLINE_EDITING_STANDARD.md)
- [Edit Mode v2 Standard](EDIT_MODE_V2_STANDARD.md)
- [Lookup Guidelines](LOOKUP_GUIDELINES.md)
- [Coding Standards](../07-development/CODING_STANDARDS.md)

## Standards

Forms use React Hook Form with Zod validation at boundaries.

From the Enterprise Design System:

- Use `RecordFormDialog`, `RecordFormSection`, and shared form field components from `src/shared/ui`.
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

See [UI Guidelines](UI_GUIDELINES.md) section 18 (Forms) for component-level detail.
