# Naming Conventions

## Related Documents

- [Coding Standards](../07-development/CODING_STANDARDS.md)
- [Permission Model](../04-architecture/PERMISSION_MODEL.md)
- [Module Structure](../07-development/MODULE_STRUCTURE.md)

## Permission Keys

Format: `<module>.<resource>.<action>`

Examples:

- `finance.chart-of-accounts.view`
- `inventory.reservations.create`
- `party.parties.edit`

Permission keys must come from module registries — never hardcoded string literals in UI or services.

## Database Tables

- Platform tables: domain-specific prefixes (`financial_*`, `party_*`, platform engine tables).
- Business app tables: app prefix (`finance_*`, `inventory_*`, `manufacturing_*`, `hr_*`).
- Legacy compatibility tables remain documented in ADRs until fully migrated.

## Files and Folders

Feature modules:

```text
src/features/<feature-name>/
  domain/
  application/
  infrastructure/
  presentation/
  permissions/
  routes/
  public-api.ts
  module.manifest.ts
```

## Status and Workflow

- Statuses defined in module-owned registries, not hardcoded strings.
- Workflow transition commands are typed and idempotent.

## Correlation and Context

- Correlation ID header: `x-correlation-id`
- Request context fields: user, tenant, company, branch, employee, experience, locale, timezone, correlation ID

See [Coding Standards](../07-development/CODING_STANDARDS.md) for TypeScript, validation, and review naming rules.
