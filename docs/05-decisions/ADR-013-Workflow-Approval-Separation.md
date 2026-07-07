# ADR-013: Workflow and Approval Separation

## Status

Accepted

## Context

Business processes require both state transitions (workflow) and human decision gates (approval). Combining them in app code or UI leads to inconsistent audit, policy enforcement, and concurrency handling.

## Decision

Workflow and Approval are separate platform engines with distinct responsibilities:

- **Workflow Engine** models business process states, transitions, guards, history, terminal states, version checks, and idempotent transition commands.
- **Approval Engine** models approval policies, steps, routing, delegation, escalation, reassignment, self-approval prevention, approval queues, and idempotent approval decisions.

Approval decisions must never be implemented as direct status updates. They must go through approval application services so policy, workflow, audit, notifications, and concurrency checks remain consistent.

The Approval Engine integrates with the Workflow Engine but owns policy and decision behavior separately.

## Consequences

- Apps register workflow definitions and approval policies through platform contracts.
- UI components must not encode transition or approval logic.
- Workflow guards may require approval completion before transitions proceed.
- Both engines require audit events and permission checks at the application layer.

## Related Documents

- [Workflow Engine](../01-platform/WORKFLOW.md)
- [Approval Engine](../01-platform/APPROVAL.md)
- [Modular Monolith](../04-architecture/MODULAR_MONOLITH.md) (Workflow and Approval sections)
- [Security](../01-platform/SECURITY.md)

## Archived Source

Extracted from `docs/ARCHITECTURE.md` (Workflow Engine Strategy, Approval Engine Strategy). Canonical runtime detail: [Runtime](../01-platform/RUNTIME.md).
