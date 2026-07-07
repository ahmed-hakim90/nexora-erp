# UX Guidelines

## Related Documents

- **[Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)** — supreme UX standard for all modules
- [UI Guidelines](UI_GUIDELINES.md)
- [Inline Editing Standard](INLINE_EDITING_STANDARD.md)
- [Edit Mode v2 Standard](EDIT_MODE_V2_STANDARD.md)
- [Operator Experience](../01-platform/OPERATOR_EXPERIENCE.md)
- [Form Guidelines](FORM_GUIDELINES.md)

> **Note:** Canonical content lives here. Previous location: `docs/platform/06_UX_GUIDELINES.md`.  
> This document implements the [Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md) for experience shells and navigation.

Nexora is UX First. The platform must be easy to use before apps multiply.

## UX Foundation Rule

All apps must consume the official UX foundation and experience layer. Apps must not create competing shells, form systems, table frameworks, dashboard frameworks, report layouts, print layouts, feedback systems, or command systems.

## Experience Shells

Approved platform experiences:

- ERP Workspace.
- Self-Service Portal.
- Admin and Marketplace.
- Connector/API surfaces.
- Sandbox.
- Automation.
- AI-assisted flows.

Experience shells own layout, navigation model, search, command palette, notifications, help, user menu, company/branch switching, theme, localization, direction, and feedback placement.

## Navigation Model

Nexora uses intent-based navigation:

- App Launcher for installed apps.
- Contextual Sidebar for the active app.
- Topbar for cross-platform context and utilities.
- Command Palette for high-frequency actions.
- Quick Actions for contextual work.
- Universal Search for records, commands, reports, settings, documents, and dashboards.
- Mobile compact navigation for touch-friendly usage.

Hardcoded global sidebars are not acceptable for the platform target state.

## Interaction Rules

- Prefer lookup/search/select flows over raw ID entry.
- Use contextual inline editing on profile and detail workspaces per [Inline Editing Standard](INLINE_EDITING_STANDARD.md).
- Use command and quick action surfaces for frequent work.
- Keep forms task-oriented and sectioned.
- Use drawers, dialogs, wizards, and sticky actions consistently.
- Provide loading, empty, error, success, warning, offline, maintenance, permission-denied, confirmation, delete, and unsaved-change states through shared platform UX.
- User-facing feedback must go through `platform.feedback`; apps must not import Sonner directly.

## Accessibility And Mobile

Every platform UX pattern must account for:

- Keyboard navigation.
- Screen reader labeling.
- Focus management.
- Color contrast.
- Touch target size.
- Responsive layout.
- Reduced motion where needed.
- RTL and LTR behavior.
- Arabic and English content.

## Raw-ID Avoidance

Raw UUID-first workflows are not acceptable for production UX.

Apps must provide:

- Searchable lookups.
- Human-readable labels and numbers.
- Recent and favorite selections where useful.
- Contextual record previews.
- Permission-filtered selection lists.

## Company Branding

Company branding is a platform concern. Branding must be resolved once and reused by:

- Experience shells.
- Dashboards.
- Reports.
- Print templates.
- Official documents.
- Email and notification templates.

Apps must not duplicate branding resolution logic.

## UX Quality Gate

Before app UI work begins, the app must identify:

- Supported experiences.
- Primary workflows.
- Mobile behavior.
- Accessibility risks.
- RTL/LTR needs.
- Branding surfaces.
- Feedback states.
- Lookup/search patterns.
- Performance budget for list, dashboard, and detail views.
