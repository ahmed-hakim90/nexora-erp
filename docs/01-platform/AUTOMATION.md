# Automation and AI Governance

## Related Documents

- [Workflow Engine](WORKFLOW.md)
- [Approval Engine](APPROVAL.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Automation And AI Governance Engine

Purpose: allow automation and AI assistance without bypassing enterprise controls.

Responsibilities:

- Automation triggers, scheduled automations, event-driven automations, AI action registry, suggest/draft/execute modes, approval gates, permission and data-scope enforcement, prompt/context policy, audit, and idempotency.
