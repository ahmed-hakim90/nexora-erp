# App Framework

This document defines the approved app framework architecture. It is documentation only and does not implement the App Registry.

## App First Rule

Every business capability must become an app. An app is a governable platform unit, not just a folder or route.

Apps are introduced only after the required platform phases in `02_IMPLEMENTATION_ROADMAP.md` are complete for that app's needs.

## App Contract

Every app must define:

- Stable app key.
- Name, version, category, and ownership.
- Allowed experiences.
- Permissions and permission metadata.
- Statuses and lifecycle metadata.
- Dependencies.
- Navigation contributions.
- Command and quick action contributions.
- Reports and report datasets.
- Print templates and official output rules.
- Dashboard widgets.
- Settings and feature flags.
- Search providers.
- Workflow definitions.
- Approval policies where needed.
- Integration, import/export, automation, and AI action contributions where needed.
- Data classification and sensitivity.

## Public API Rule

Apps expose stable contracts through public APIs and route adapters only.

Apps must not expose:

- Repositories.
- Private infrastructure.
- Internal database rows.
- Server-only clients through browser-safe exports.
- Private domain/application/presentation folders for cross-app consumption.

## Lifecycle Model

Approved app lifecycle states:

- Available.
- Installed.
- Enabled.
- Suspended.
- Archived.
- Upgrading.

Lifecycle rules:

- Dependencies must be declared and validated before enablement.
- Enablement is separate from entitlement and permission.
- Disable, archive, or uninstall must not silently destroy business records.
- App upgrades must preserve data and contract compatibility.
- Lifecycle changes are auditable.

## Experience Model

Apps declare which experiences they support:

- ERP Workspace.
- Self-Service Portal.
- Admin/Marketplace.
- Connector/API.
- Automation.
- AI-assisted flows.
- Sandbox.
- System.

An app that supports multiple experiences must provide experience-specific route adapters, loaders, view models, and navigation contributions. Reusing ERP screens inside the portal is forbidden unless the data contract proves it only loads portal-allowed fields.

## Dependency Model

Dependencies must be explicit and classified:

- Platform dependency: required platform engine or foundation.
- App dependency: required app capability through public contract.
- Reference dependency: stable reference to another app's public read model.
- Workflow dependency: integration through workflow, approval, document, event, or notification contracts.
- Integration dependency: connector or external system contract.

Circular dependencies are forbidden.

## Production Readiness Gate

Before a business app is production-ready, it must prove:

- It has an app manifest and registry entry.
- It declares dependencies, entitlements, permissions, statuses, navigation, commands, reports, prints, dashboards, search, settings, and automations.
- It uses platform context and security services.
- It uses the official UX foundation, experience layer, lookup/search-first patterns, mobile rules, accessibility rules, and company branding.
- It uses workflow and approval engines for lifecycle behavior.
- It uses the universal document lifecycle engine for document shells, numbering, lifecycle, timeline, comments, files, and official snapshots where needed.
- It uses the universal report builder, print template designer, dashboard builder, import/export, and search engines instead of local shortcuts where relevant.
- It has RLS, permission, workflow, app lifecycle, and performance tests.
- It has audit coverage for sensitive actions.
