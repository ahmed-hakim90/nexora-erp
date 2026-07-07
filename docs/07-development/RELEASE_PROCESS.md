# Release Process

## Related Documents

- [Testing](TESTING.md)
- [Security Checklist](SECURITY_CHECKLIST.md)
- [Platform Freeze v1.0](../05-decisions/ADR-011-Platform-Freeze-V1.md)
- [Implementation Status](../00-overview/IMPLEMENTATION_STATUS.md)

## Continuous Practices

Every release must maintain:

- Strict TypeScript and ESLint passing.
- Platform test suite passing.
- Static migration validation (`npm run validate:migrations`).
- RLS and permission tests for changed tables.
- No regression in ERP/Portal experience separation.

## Module Readiness Gate

A module is production-ready only when the [Module Readiness Checklist](../00-overview/ROADMAP.md#module-readiness-checklist) is satisfied:

- Business purpose and access experience defined.
- Permissions, statuses, workflow, and approval policy registered.
- RLS strategy defined and tested.
- Reports and print requirements use platform engines.
- Module manifest complete with declared dependencies.
- Transaction and idempotency needs addressed.

## Platform Extension After Freeze

After Platform Freeze v1.0, platform changes require one of:

- Bug fix for accepted platform behavior.
- Security or data-boundary hardening.
- Documentation correction.
- Explicitly approved platform extension with tests and documentation.

See [ADR-011](../05-decisions/ADR-011-Platform-Freeze-V1.md).

## Recommended Platform Tag

`platform-v1.0.0-freeze` — marks accepted platform foundation baseline (2026-06-27).

## Documentation Requirement

Architecture or platform contract changes require documentation updates before merge ([ADR-010](../05-decisions/ADR-010-Documentation-Before-Architecture-Change.md)).
