# Architecture Decisions

This document records approved platform architecture decisions. Major platform changes must be documented here before implementation.

## ADR-0001: `docs/platform` Is The Platform Source Of Truth

Status: Accepted.

Decision: `docs/platform` is the official source of truth for Nexora Platform architecture, implementation order, platform engine boundaries, app framework rules, and readiness gates.

Consequence: implementation work must follow these documents. If root-level docs conflict with `docs/platform`, the platform docs win.

## ADR-0002: Nexora Is An Enterprise Business Platform

Status: Accepted.

Decision: Nexora is an Enterprise Business Platform, not a collection of ERP screens.

Consequence: shared capabilities must be built as platform foundations and engines before broad business app development continues.

## ADR-0003: Modular Monolith First

Status: Accepted.

Decision: Nexora remains a modular monolith in one Next.js App Router project until there is a real operational reason to extract services.

Consequence: strict folder boundaries, public contracts, server-only markers, and import guardrails are required. Extraction candidates must preserve current module contracts.

## ADR-0004: App First Architecture

Status: Accepted.

Decision: Business capabilities become installable apps with manifests, lifecycle, capabilities, dependencies, permissions, routes, navigation, commands, reports, prints, dashboards, settings, and integration contracts.

Consequence: app behavior must be registry-driven. Hardcoded navigation and implicit module enablement are architecture violations.

## ADR-0005: Engine First Architecture

Status: Accepted.

Decision: Shared capabilities belong in reusable platform engines, not business apps.

Consequence: workflow, approvals, document lifecycle, notifications, search, reporting, printing, import/export, jobs, integration, audit, dashboarding, costing, files, testing, automation, and AI governance must expose platform contracts before apps rely on them.

## ADR-0006: Explicit Request Context

Status: Accepted.

Decision: Backend code must receive explicit request context containing actor, user, tenant, company, branch, employee, experience, locale, direction, timezone, source, and correlation ID where available.

Consequence: application services must not reconstruct context from UI state, cookies, headers, or route params.

## ADR-0007: Security Requires Multiple Layers

Status: Accepted.

Decision: Authentication, entitlements, permissions, data scopes, RLS, service-layer authorization, workflow/approval guards, and audit are separate required layers.

Consequence: UI-only authorization is invalid. Service-role access must be isolated behind reviewed platform adapters.

## ADR-0008: UX Foundation Comes Before App UI

Status: Accepted.

Decision: UX primitives, experience shells, accessibility, mobile rules, RTL/LTR, theme, feedback, lookup-first flows, and company branding are platform foundations.

Consequence: apps must not create competing UI frameworks, feedback systems, dashboards, report shells, print layouts, or raw UUID-first workflows.

## ADR-0009: Heavy Workloads Are Platform Workloads

Status: Accepted.

Decision: reports, exports, prints, imports, integrations, notifications, background jobs, dashboards, cost recalculations, and AI execution are bounded, observable, async-capable platform workloads.

Consequence: apps must not implement unbounded browser exports, screenshot printing, or blocking long-running work in interactive requests.

## ADR-0010: Documentation Before Architecture Change

Status: Accepted.

Decision: architecture changes require a `docs/platform` update before implementation.

Consequence: sprints that alter platform phases, public contracts, engine ownership, app lifecycle, security, data access, or UX foundations must update this decision log and affected docs first.
