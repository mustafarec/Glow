# Glow production architecture

## Architecture map

The checked Archify sources and their standalone interactive maps are the visual source of truth for the current production boundary and remaining release gates:

- [Archify source](./glow-architecture.architecture.json)
- [Interactive architecture map](./glow-architecture.html)
- [Supabase boundary sequence source](./glow-supabase-boundary.sequence.json)
- [Interactive Supabase boundary sequence](./glow-supabase-boundary.sequence.html)
- [Private selfie media sequence source](./glow-selfie-media.sequence.json)
- [Private selfie media sequence](./glow-selfie-media.sequence.html)
- [Authenticated AI boundary sequence source](./glow-ai-boundary.sequence.json)
- [Authenticated AI boundary sequence](./glow-ai-boundary.sequence.html)
- [Generation job lifecycle source](./glow-generation-job.lifecycle.json)
- [Generation job lifecycle](./glow-generation-job.lifecycle.html)

The maps deliberately distinguish implemented production components from remaining work (`planned`). Supabase Auth, snapshot/RLS, consent-gated private media, the authenticated production AI boundary, durable generation jobs, and server-authoritative credit settlement are implemented in the repository; migration/function deployment and live verification, billing, and provider hardening remain release gates.

## Existing repository

The repository was empty at the start of implementation: no source files, package manifest, Git metadata, or test setup existed. There is no legacy behavior to preserve.

## Chosen shape

- Expo + React Native + TypeScript with React Navigation.
- React Native Reusables primitives with NativeWind provide the shared Button, Text, Card, Badge, and Separator foundation; Glow's compatibility layer keeps screen contracts stable while the visual system evolves.
- A small `AppStore` owns the current user state and persists non-secret state through a storage adapter. Authenticated state uses a user-scoped Supabase snapshot with a local offline cache. Screens consume actions rather than writing storage directly.
- Domain logic is pure TypeScript. It does not import React Native, Expo, or a provider SDK.
- `ImageAnalysisProvider`, `ImageGenerationProvider`, and `RecommendationProvider` are the only AI seams. The production server provider is the only runtime implementation; missing production configuration fails closed.
- `GenerationJob` has `queued`, `processing`, `completed`, and `failed` states; credit allowance, reservation, and exactly-once failure refunds run through authenticated Supabase RPCs.
- Images use private URI metadata in the app layer. Local/data image URIs are excluded from the snapshot seam; the Supabase media adapter uploads consented bytes to user-owned paths, returns signed URLs, and persists only storage metadata.
- AI requests use a production-only adapter that invokes the `ai` Edge Function with path-only inputs. The function verifies the bearer JWT and owner selfie paths before returning the provider-backed contract; a missing or non-production server mode returns an error instead of synthetic data.
- Analytics accepts event names and safe properties only; raw image bytes and URLs are excluded.

## Decisions locked by the map

- `app/` owns route composition and screen interaction; screens do not call storage or provider SDKs directly.
- `AppStore` remains the application-flow coordinator. It may call domain functions and provider interfaces, but domain rules stay framework-free.
- `AsyncStorage` is a temporary local guest/offline-cache adapter. It is not a production boundary for secrets or shared user data.
- The AI adapter is production-only: the server contract, authenticated ownership checks, provider calls, deterministic job creation, persisted lifecycle, and server-side credit settlement are implemented; timeout/retry policy and live deployment verification remain production gates.
- Supabase Auth, the user-scoped snapshot/RLS seam, signed-URL private media, and the server-owned credit schema are implemented; Auth, snapshot/RLS, and private media were live-verified in the configured development project. The new credit RPC migration must be deployed and live-verified before release.
- Billing is an external verification boundary. The mobile client may request a purchase, but entitlement truth must come from verified store receipts/webhooks.

## Implementation order after the production AI slice

1. **Completed:** Add an authenticated session and a Supabase-backed persistence adapter behind the existing store boundary. Live owner/non-owner checks passed in the configured development project.
2. **Completed:** Add consent-gated private selfie upload through user-scoped paths and signed URLs, owner metadata, signed-URL refresh, and delete-all cleanup.
3. **Completed in production:** Move analysis and generation calls behind an authenticated `ai` Edge Function boundary. Inputs are path-only, provider keys stay server-side, and `gpt-5.6-luna` plus `gpt-image-2` run behind the existing `queued → processing → completed|failed` lifecycle.
4. **Completed in production:** Persist the generation job id, provider tracking id, status transitions, and owner scope server-side. A deterministic job UUID makes retried requests converge on one row. See the [job lifecycle map](./glow-generation-job.lifecycle.html).
5. Deploy and live-verify the server-authoritative credit RPCs, then harden the real AI provider boundary with timeout, retry, and rate-limit policy.
6. Add store billing receipt verification and webhook reconciliation. Drive `Glow+` and credit balances from verified entitlements, not client-supplied values.
7. Add production rate limits, safe analytics, error reporting, cancellation policy, and release checks only after the previous boundaries are testable.

Each step must preserve the production-only boundary, update the Archify JSON when topology changes, pass Archify validation/delivery, then pass the app typecheck, tests, export, and primary-flow smoke test.

## Trust boundaries

The mobile client may hold public Supabase configuration and user-scoped session state. It must never hold service-role keys, AI keys, payment secrets, or privileged mutation logic. Production AI/payment work belongs in Supabase Edge Functions or an equivalent server boundary.

## Deliberate MVP ceilings

- The mobile client never fabricates a profile, recommendation, or generated preview. Authenticated mode syncs only sanitized JSON state; local/data image URIs and in-flight jobs stay out of that snapshot while consented selfies use the separate private media adapter.
- The first recommendation engine is a production provider response, not a local heuristic or fixture.
- Store billing is represented by entitlement and purchase interfaces; no external payment provider is faked.
- The timeline records selected looks and photos but does not judge attractiveness or progress.

These ceilings preserve the product flow while store billing reconciliation and further provider hardening are unavailable. The production function persists a deterministic `generation_jobs` row, reserves/refunds credits through server RPCs, and advances jobs on polling; billing reconciliation remains a production gate.
