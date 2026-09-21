# Turfly

Turfly is a multi-vendor turf booking marketplace for discovering, reserving, and managing local sports pitches.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/turf-booking` — public marketplace frontend and demo role surfaces
- `artifacts/api-server/src/routes/marketplace.ts` — turf, availability, booking, review, and dashboard API handlers
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/turfs.ts` — Drizzle schema for turfs, blocks, bookings, and reviews
- `artifacts/turf-booking/public/images` — generated demo turf photography

## Architecture decisions

- API contracts are OpenAPI-first and generate the React Query client used by the frontend.
- The first build uses the preconfigured PostgreSQL database with two approved demo turfs and seed-on-first-request data.
- Relative image paths are used for local demo photography so the same UI works in preview and can later move to object storage.
- The UI uses separate demo sessions for player, owner, and admin surfaces; production authentication and marketplace payouts are follow-up work.

## Product

- Players can search approved turfs, filter by location/game/price, view availability, make a booking, and leave reviews after a completed booking.
- Owners can submit listings, manage flexible time blocks, and see booking activity.
- Admins can view marketplace summary metrics and approve or reject turf submissions.

## User preferences

- Use Taste Skill and Impeccable as frontend quality guardrails: avoid generic AI layouts and keep visual hierarchy, accessibility, and responsive polish intentional.

## Gotchas

- Regenerating Orval output recreates `lib/api-zod/src/index.ts` with a wildcard export of generated TypeScript types that collides with generated Zod parameter schemas. Restore the barrel to export only `./generated/api` before running `pnpm run typecheck:libs`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
