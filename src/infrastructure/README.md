# Infrastructure

Root infrastructure contains server-only adapters that are not owned by a business feature.

Business modules must not import this folder directly. Platform adapters expose reviewed contracts through `public-api.ts`.
