# Settings, Localization, Theme, and Branding

## Related Documents

- [UX Guidelines](../06-guidelines/UX_GUIDELINES.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Settings, Localization, Theme, Branding, And Feature Flags

Purpose: provide cross-app configuration, user preferences, formatting, and official company identity.

Responsibilities:

- Tenant, company, branch, app, and user settings.
- Feature flags.
- Locale, direction, date/number/currency/quantity/timezone formatting.
- Company branding for shells, dashboards, reports, print templates, documents, and notifications.
