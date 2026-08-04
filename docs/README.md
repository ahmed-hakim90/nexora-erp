# Nexora Documentation

Official knowledge base for the Nexora Enterprise Business Platform.

## Constitutional Architecture

**[Nexora Enterprise Blueprint v1.0](00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md)** is the permanent constitutional reference for the entire platform. All Business Apps, Engines, Runtime, UI, SDK, Integrations, and AI Agents must follow it. Detailed companion docs under `01-platform/`, `02-business-apps/`, and `05-decisions/` provide depth; the Blueprint governs them.

## Documentation Philosophy

- **Separate concerns** — Architecture, implementation status, guidelines, decisions, reviews, and historical sprint logs live in different folders. They are not mixed in single files.
- **Single source of truth** — Constitutional authority is [Nexora Enterprise Blueprint v1.0](00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md). Platform detail lives under `docs/01-platform/` and `docs/05-decisions/`. See [ADR-001](05-decisions/ADR-001-Documentation-Source-Of-Truth.md).
- **Preserve decisions** — Architectural decisions are immutable records (ADRs). Implementation evolves; decisions are archived, not silently rewritten.
- **Cross-reference everything** — Every document links to related topics so knowledge is discoverable.
- **No information loss** — Content is moved and reorganized, not summarized away. Duplicates keep the newest accepted version with pointers to archives.

## Where Topics Live

| Topic | Location |
| --- | --- |
| **Constitutional architecture (Blueprint v1.0)** | [00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md](00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md) |
| Vision, product definition, roadmap, status | [00-overview/](00-overview/) |
| Platform engines, kernel, security, data foundations | [01-platform/](01-platform/) |
| Enterprise Architecture Freeze v1.0 (companion) | [01-platform/ENTERPRISE_ARCHITECTURE_FREEZE_V1.md](01-platform/ENTERPRISE_ARCHITECTURE_FREEZE_V1.md) |
| Business apps (Finance, Inventory, HR, …) | [02-business-apps/](02-business-apps/) |
| Commerce (Product Master, Pricing, Marketplace) | [03-commerce/](03-commerce/) |
| Domain model, permissions, API, design principles | [04-architecture/](04-architecture/) |
| Architecture Decision Records (ADRs) | [05-decisions/](05-decisions/) |
| UI/UX, forms, lookups, reports, print, naming | [06-guidelines/](06-guidelines/) — start with [Nexora Platform UX Constitution](06-guidelines/NEXORA_PLATFORM_UX_CONSTITUTION.md) |
| **Platform UX governance (ADR-021)** | [ADR-021](03-architecture/adr/ADR-021_PLATFORM_UX_CONSTITUTION.md), [Review Gate](06-guidelines/PLATFORM_UX_REVIEW_GATE.md), [Migration Tracker](06-guidelines/UX_MIGRATION_TRACKER.md), [Design Review](06-guidelines/DESIGN_REVIEW_PROCESS.md), [Component Policy](06-guidelines/PLATFORM_COMPONENT_POLICY.md) |
| Coding standards, module structure, testing, migrations | [07-development/](07-development/) |
| Architecture and usability reviews | [08-reviews/](08-reviews/) |
| Sprint logs and platform changelog | [09-history/](09-history/) |

## Recommended Reading Order

### New contributors

1. **[Nexora Enterprise Blueprint v1.0](00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md)**
2. [Vision](00-overview/VISION.md)
2. [Design Principles](04-architecture/DESIGN_PRINCIPLES.md)
3. [Platform Overview](01-platform/PLATFORM_OVERVIEW.md)
4. [Modular Monolith](04-architecture/MODULAR_MONOLITH.md)
5. [Module Structure](07-development/MODULE_STRUCTURE.md)
6. [Implementation Status](00-overview/IMPLEMENTATION_STATUS.md)

### Platform engineers

1. **[Nexora Enterprise Blueprint v1.0](00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md)**
2. [Enterprise Architecture Freeze v1.0](01-platform/ENTERPRISE_ARCHITECTURE_FREEZE_V1.md)
2. [Platform Implementation Roadmap](01-platform/PLATFORM_IMPLEMENTATION_ROADMAP.md)
3. [Architecture Decisions](05-decisions/README.md)
3. [Security](01-platform/SECURITY.md)
4. [Data Layer](01-platform/DATA_LAYER.md)
5. [Platform Engines index](01-platform/WORKFLOW.md) (start with Workflow; each engine doc cross-links siblings)

### App developers

1. [App Framework](01-platform/APP_FRAMEWORK.md)
2. [ERP Navigation](02-business-apps/ERP_NAVIGATION.md)
3. **[Nexora Platform UX Constitution](06-guidelines/NEXORA_PLATFORM_UX_CONSTITUTION.md)**
4. [Platform UX Review Gate](06-guidelines/PLATFORM_UX_REVIEW_GATE.md) — mandatory for new screens
5. [UI Guidelines](06-guidelines/UI_GUIDELINES.md)
6. [Form Guidelines](06-guidelines/FORM_GUIDELINES.md)
7. Relevant business app doc under [02-business-apps/](02-business-apps/)

### Implementing code

1. [Developer Implementation Guide](07-development/DEVELOPER_IMPLEMENTATION_GUIDE.md)
2. [Module Structure](07-development/MODULE_STRUCTURE.md)
3. [Coding Standards](07-development/CODING_STANDARDS.md)
4. [Testing](07-development/TESTING.md)
5. [Security Checklist](07-development/SECURITY_CHECKLIST.md)

## Legacy Paths

Files at the old `docs/` root and `docs/platform/` paths remain as **redirect stubs** pointing to canonical locations. Update bookmarks to the new paths.

## Project Repository Structure (Code)

```text
src/
  app/(erp)/          # ERP Workspace routes
  app/(portal)/       # HR Portal routes
  core/               # Shared kernel utilities
  features/           # Business app modules
  platform/           # Platform engines and runtime
  shared/             # UI, workspace, config
  infrastructure/     # Supabase adapters
```

See [Module Structure](07-development/MODULE_STRUCTURE.md) for feature module layout.

## Maintaining Documentation

- Architecture changes require ADR + affected doc updates **before** code changes ([ADR-010](05-decisions/ADR-010-Documentation-Before-Architecture-Change.md)).
- Sprint delivery logs go to [09-history/](09-history/) — not into architecture docs.
- Ideas and future work belong in roadmap/status docs, not in accepted architecture sections.
