# ADR-018: Enterprise Architecture Freeze v1.0

## Status

Accepted (2026-07-01)

## Context

Platform Freeze v1.0 (ADR-011) and HR & Payroll Architecture Freeze v1.0 established partial baselines. HR Foundation Sprints 1–18 and the Assignment Resolver Design Gate resolved dual source-of-truth risks between Employment Profile and Assignment Engine.

A single constitutional document was required so all future business applications share one ownership, dependency, and lifecycle reference.

## Decision

Adopt **Enterprise Architecture Freeze v1.0** as the permanent architectural baseline for Nexora Platform.

Canonical document: [ENTERPRISE_ARCHITECTURE_FREEZE_V1.md](../01-platform/ENTERPRISE_ARCHITECTURE_FREEZE_V1.md)

## Key Decisions Frozen

1. Nexora is an Enterprise Business Platform; ERP is one application.
2. Platform layers: Kernel → Runtime Engines → Services → Business Foundations → Apps → Experience.
3. Assignment Engine owns organizational relationships; Employment Profile is anchor + cached projection.
4. Payroll Run is the execution unit; Payroll Result owns numbers; Payslip owns presentation; Publication owns visibility.
5. Leave/Absence is a first-class bounded context.
6. `hr_jobs` is canonical; `hr_job_titles` is legacy compatibility only.
7. Templates and Capability Packs are reference bundles — never copied operational data.
8. Platform must not import business features; features consume platform via `public-api`.
9. Workflow owns process state; Approval owns decisions; HR Action owns business intent.
10. Extensions require ADR approval; foundations precede runtime.

## Consequences

- No new feature implementation without compliance to the freeze document.
- Assignment resolver runtime, apply runtime, payroll UI, ESS/MSS, and localization runtime require explicit post-freeze approval.
- Technical debt items in Section 17 of the freeze document are acknowledged and scheduled.

## Related Documents

- [Enterprise Architecture Freeze v1.0](../01-platform/ENTERPRISE_ARCHITECTURE_FREEZE_V1.md)
- [HR & Payroll Architecture Freeze v1.0](../01-platform/HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md)
- [ADR-011 Platform Freeze v1.0](ADR-011-Platform-Freeze-V1.md)
- [HR Architecture Refactor Gate](../../../src/features/hr/architecture-refactor-foundation.ts)
