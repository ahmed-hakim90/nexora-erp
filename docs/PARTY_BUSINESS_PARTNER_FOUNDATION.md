# Party & Business Partner Foundation

## Purpose

The Party & Business Partner Foundation provides one shared platform registry for people and organizations used across Finance, Sales, Purchasing, Inventory, Manufacturing, Service, Rental, CRM, HR, and future applications.

This is not a Finance Customers/Suppliers module. It does not implement balances, credit, payment terms, invoices, AR/AP, sales, purchasing, or CRM processes.

## Core Model

A `Party` is the canonical shared record for a business partner or person.

Supported party roles include:

- Customer
- Supplier
- Employee
- Driver
- Company
- Branch
- Manufacturer
- Distributor
- Carrier
- Service Center
- Vendor
- Government Entity
- Individual

One party may have multiple roles at the same time. For example, ABC Trading can be both a customer and supplier without duplicate party records.

## Foundation Areas

- Party registry.
- Multiple party roles.
- Configurable categories.
- Multiple contacts.
- Unlimited addresses.
- Communication profiles.
- Generic legal identity data.
- Party status.
- Attachment links through the platform file/document engine.
- Notes and append-only timeline events.
- Shared permissions.

## Public API

Runtime contracts are exported from `src/platform/party/public-api.ts`.

Core contracts:

- `Party`
- `PartyRole`
- `PartyCategory`
- `PartyContact`
- `PartyAddress`
- `PartyCommunicationProfile`
- `PartyLegalIdentity`
- `PartyAttachmentLink`
- `PartyTimelineEvent`

Runtime helpers are exported from `src/platform/party/server.ts`:

- `assertUniquePartyRoles`
- `partyHasRole`
- `assertPartyStatusTransition`
- `selectDefaultPartyContact`
- `selectDefaultPartyAddress`

## Database Foundation

The migration adds platform tables only:

- `parties`
- `party_categories`
- `party_roles`
- `party_contacts`
- `party_addresses`
- `party_communication_profiles`
- `party_legal_identities`
- `party_attachments`
- `party_timeline_events`

`party_attachments` references `file_attachments`, so file storage remains owned by the existing platform file/document engine.

## Permissions

Shared party permission definitions live in `src/platform/party/permissions.ts`.

Permissions:

- `party.parties.view`
- `party.parties.create`
- `party.parties.edit`
- `party.parties.delete`
- `party.contacts.manage`
- `party.addresses.manage`
- `party.attachments.manage`
- `party.roles.assign`
- `party.categories.manage`

## Out Of Scope

- AR/AP.
- Credit limits.
- Payment terms.
- Customer balances.
- Supplier balances.
- Invoices.
- Purchasing.
- Sales.
- CRM opportunities.
- Finance logic.

