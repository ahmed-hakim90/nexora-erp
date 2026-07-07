# Notification Engine

## Related Documents

- [Workflow Engine](WORKFLOW.md)
- [Background Jobs](BACKGROUND_JOBS.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Notification Engine

Purpose: provide reusable communication for workflows, approvals, automations, connectors, and user activity.

Responsibilities:

- Notification templates, in-app notifications, recipient resolution, role/user/approver targeting, read state, delivery outbox, retries, and future external channels.
