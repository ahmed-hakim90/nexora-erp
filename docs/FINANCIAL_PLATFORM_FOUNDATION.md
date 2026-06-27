# Financial Platform Foundation

## Purpose

The Financial Platform Foundation provides shared financial infrastructure for future business applications without implementing the Finance application.

It is platform infrastructure for Sales, Purchasing, Inventory, Manufacturing, HR, Service, Rental, and future apps.

## In Scope

- Fiscal years and accounting periods.
- Open, closed, and locked period status.
- Multi-currency metadata, base currency settings, exchange rates, precision, and formatting.
- Tax definitions, tax groups, tax rates, inclusive and exclusive tax calculations.
- Payment methods, payment terms, payment statuses, and payment channels.
- Unified document numbering support with company, branch, fiscal year, prefix, suffix, and gap-policy metadata.
- Financial dimensions for company, branch, department, cost center, project, warehouse, employee, vehicle, customer, and supplier.
- Shared financial event records for future Finance posting.
- Posting lifecycle states: draft, submitted, approved, posted, cancelled, reversed.
- Shared financial permission keys.

## Out Of Scope

- Chart of accounts.
- Customer or supplier management.
- Journal entries.
- General ledger.
- Accounts receivable or payable.
- Cash and banks.
- Financial reports.
- Cost accounting.

## Runtime Contracts

Runtime contracts are exported from `src/platform/financial/public-api.ts`.

Core contracts:

- `FiscalYear`
- `AccountingPeriod`
- `CurrencyDefinition`
- `ExchangeRate`
- `TaxDefinition`
- `TaxRate`
- `TaxGroup`
- `PaymentMethod`
- `PaymentTerms`
- `FinancialNumberingSequence`
- `FinancialDimension`
- `FinancialEvent`
- `PostingLifecycleState`

Runtime helpers are exported from `src/platform/financial/server.ts`:

- `assertAccountingPeriodOpen`
- `formatMoney`
- `calculateTaxLines`
- `previewFinancialDocumentNumber`
- `assertPostingLifecycleTransition`

## Database Foundation

The migration adds platform tables only:

- `financial_fiscal_years`
- `financial_accounting_periods`
- `financial_currencies`
- `financial_currency_settings`
- `financial_exchange_rates`
- `financial_tax_definitions`
- `financial_tax_rates`
- `financial_tax_groups`
- `financial_tax_group_members`
- `financial_payment_methods`
- `financial_payment_terms`
- `financial_dimensions`
- `financial_events`
- `financial_posting_lifecycle_history`

It also extends the existing platform `numbering_sequences` table with:

- `company_id`
- `prefix_template`
- `suffix_template`
- `allow_gaps`
- `metadata`

## Permissions

Shared financial permission definitions live in `src/platform/financial/permissions.ts`.

These permissions are intended for future accounting and finance-related roles, but no roles or Finance app workflows are implemented in this foundation.

## Compatibility

Existing business document numbering remains compatible with the legacy `numbering_sequences` table and current generation function.

The new financial event foundation records standard posting-intent events only. It does not create journals, ledgers, receivables, payables, bank entries, or reports.

