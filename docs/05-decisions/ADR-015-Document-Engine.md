# ADR-015: Universal Document Engine

## Status

Accepted

## Context

Most business apps create documents with numbering, lifecycle states, attachments, timelines, comments, and official outputs. Reimplementing document shells in each app creates inconsistent numbering, audit gaps, and incompatible print/report integration.

## Decision

Nexora provides a Universal Document Lifecycle Engine as a platform capability.

The engine owns:

- Document shells and lifecycle commands (draft, submit, approve, reject, return, post, cancel, close, reverse, archive, reprint where applicable).
- Transaction-safe numbering integrated with platform numbering services.
- Timeline, comments, file metadata, references, and print/export hooks.
- Official output snapshots and company branding handoff.

Sprint 06 established the generic business document registry foundation. See [Sprint 06](../09-history/SPRINT_06_BUSINESS_DOCUMENT_FRAMEWORK.md).

Business apps define document types and business rules but consume platform lifecycle commands instead of direct status updates.

## Consequences

- Document number assignment, persistence, workflow transitions, and audit events for one business action must commit atomically when required.
- Apps must not implement local numbering or attachment infrastructure when the platform engine applies.
- Print and report engines consume document snapshots through platform contracts.

## Related Documents

- [Document Engine](../01-platform/DOCUMENT_ENGINE.md)
- [Print Engine](../01-platform/PRINT_ENGINE.md)
- [Financial Foundation](../01-platform/FINANCIAL_FOUNDATION.md)
- [Sprint 06 Business Document Framework](../09-history/SPRINT_06_BUSINESS_DOCUMENT_FRAMEWORK.md)

## Archived Source

Extracted from `docs/platform/04_PLATFORM_ENGINES.md`, `docs/SPRINT6_BUSINESS_DOCUMENT_FRAMEWORK.md`, and `docs/MODULE_GUIDELINES.md` (Document Engine section).
