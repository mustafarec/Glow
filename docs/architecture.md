# Glow MVP architecture

## Architecture map

The checked Archify source and its standalone interactive map are the visual source of truth for the current MVP boundary and the planned production boundaries:

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

The maps deliberately distinguish implemented components (`implemented`, `mock-first`) from production work (`planned`). Supabase Auth, snapshot/RLS, consent-gated private media, the authenticated staging AI boundary, and durable staging generation jobs are implemented; a real external AI provider and App Store billing remain planned.

## Existing repository

The repository was empty at the start of implementation: no source files, package manifest, Git metadata, or test setup existed. There is no legacy behavior to preserve.

## Chosen shape

- Expo + React Native + TypeScript with React Navigation.
- React Native Reusables primitives with NativeWind provide the shared Button, Text, Card, Badge, and Separator foundation; Glow's compatibility layer keeps screen contracts stable while the visual system evolves.
- A small `AppStore` owns the current demo/user state and persists non-secret state through a storage adapter. Guest state uses AsyncStorage; authenticated state uses a user-scoped Supabase snapshot with a local cache fallback. Screens consume actions rather than writing storage directly.
- Domain logic is pure TypeScript. It does not import React Native, Expo, or a provider SDK.
- `ImageAnalysisProvider`, `ImageGenerationProvider`, and `RecommendationProvider` are the only AI seams. The mock provider is the default implementation.
- `GenerationJob` is asynchronous even in mock mode. It has `queued`, `processing`, `completed`, and `failed` states; credit reservation/refund stays in domain code.
- Images use private URI metadata in the app layer. Local/data image URIs are excluded from the snapshot seam; the Supabase media adapter uploads consented bytes to user-owned paths, returns signed URLs, and persists only storage metadata.
- AI requests use a mode-gated adapter. `MOCK` stays local; `STAGING` and `PRODUCTION` invoke the `ai` Edge Function with path-only inputs, while the function verifies the bearer JWT and owner selfie paths before returning the current staging contract.
- Analytics accepts event names and safe properties only; raw image bytes and URLs are excluded.

## Decisions locked by the map

- `app/` owns route composition and screen interaction; screens do not call storage or provider SDKs directly.
- `AppStore` remains the application-flow coordinator. It may call domain functions and provider interfaces, but domain rules stay framework-free.
- `AsyncStorage` is a temporary local guest/offline-cache adapter. It is not a production boundary for secrets or shared user data.
- The AI adapter remains mode-gated: the server contract, authenticated ownership checks, deterministic job creation, and persisted staging lifecycle are implemented, while real provider integration, timeout policy, and authoritative failure/refund settlement remain production gates.
- Supabase Auth, the user-scoped snapshot/RLS seam, and signed-URL private media are implemented and live-verified in the configured development project; the normalized selfie table and private Storage policies enforce the same owner boundary.
- Billing is an external verification boundary. The mobile client may request a purchase, but entitlement truth must come from verified store receipts/webhooks.

## Implementation order after the mock MVP

1. **Completed:** Add an authenticated session and a Supabase-backed persistence adapter behind the existing store boundary. Live owner/non-owner checks passed in the configured development project.
2. **Completed:** Add consent-gated private selfie upload through user-scoped paths and signed URLs, owner metadata, signed-URL refresh, and delete-all cleanup.
3. **Completed in staging:** Move analysis and generation calls behind an authenticated `ai` Edge Function boundary. Inputs are path-only, provider keys stay server-side, and the existing `queued → processing → completed|failed` lifecycle remains behind the adapter.
4. **Completed in staging:** Persist the generation job id, provider job id, status transitions, and owner scope server-side. A deterministic job UUID makes retried requests converge on one row. See the [job lifecycle map](./glow-generation-job.lifecycle.html).
5. Connect a real AI provider with timeout, retry, and authoritative failure/refund policy.
6. Add store billing receipt verification and webhook reconciliation. Drive `Glow+` and credit balances from verified entitlements, not client-supplied values.
7. Add production rate limits, safe analytics, error reporting, cancellation policy, and release checks only after the previous boundaries are testable.

Each step must preserve the mock mode, update the Archify JSON when topology changes, pass Archify validation/delivery, then pass the app typecheck, tests, export, and primary-flow smoke test.

## Trust boundaries

The mobile client may hold public Supabase configuration and user-scoped session state. It must never hold service-role keys, AI keys, payment secrets, or privileged mutation logic. Production AI/payment work belongs in Supabase Edge Functions or an equivalent server boundary.

## Deliberate MVP ceilings

- Mock mode uses local persistence and deterministic placeholder images. Authenticated mode syncs only sanitized JSON state; local/data image URIs and in-flight jobs stay out of that snapshot while consented selfies use the separate private media adapter.
- The first recommendation engine is a transparent profile/goal heuristic, not a learned model.
- Store billing is represented by entitlement and purchase interfaces; no external payment provider is faked.
- The timeline records selected looks and photos but does not judge attractiveness or progress.

These ceilings preserve the product flow while a real provider and authoritative billing settlement are unavailable. The staging function persists a deterministic `generation_jobs` row and advances it on polling; provider callbacks and billing reconciliation remain production gates.
