# Glow MVP architecture

## Architecture map

The checked Archify source and its standalone interactive map are the visual source of truth for the current MVP boundary and the planned production boundaries:

- [Archify source](./glow-architecture.architecture.json)
- [Interactive architecture map](./glow-architecture.html)
- [Supabase boundary sequence source](./glow-supabase-boundary.sequence.json)
- [Interactive Supabase boundary sequence](./glow-supabase-boundary.sequence.html)

The maps deliberately distinguish implemented components (`implemented`, `mock-first`) from production work (`planned`). The current Supabase Auth and snapshot/RLS seam is implemented; private media signed-URL usage, external AI, and App Store billing remain planned.

## Existing repository

The repository was empty at the start of implementation: no source files, package manifest, Git metadata, or test setup existed. There is no legacy behavior to preserve.

## Chosen shape

- Expo + React Native + TypeScript with React Navigation.
- A small `AppStore` owns the current demo/user state and persists non-secret state through a storage adapter. Guest state uses AsyncStorage; authenticated state uses a user-scoped Supabase snapshot with a local cache fallback. Screens consume actions rather than writing storage directly.
- Domain logic is pure TypeScript. It does not import React Native, Expo, or a provider SDK.
- `ImageAnalysisProvider`, `ImageGenerationProvider`, and `RecommendationProvider` are the only AI seams. The mock provider is the default implementation.
- `GenerationJob` is asynchronous even in mock mode. It has `queued`, `processing`, `completed`, and `failed` states; credit reservation/refund stays in domain code.
- Images use private URI metadata in the app layer. Local/data image URIs are excluded from the current snapshot seam; the future Supabase Storage adapter should issue signed URLs and keep objects owned by the authenticated user.
- Analytics accepts event names and safe properties only; raw image bytes and URLs are excluded.

## Decisions locked by the map

- `app/` owns route composition and screen interaction; screens do not call storage or provider SDKs directly.
- `AppStore` remains the application-flow coordinator. It may call domain functions and provider interfaces, but domain rules stay framework-free.
- `AsyncStorage` is a temporary local guest/offline-cache adapter. It is not a production boundary for secrets or shared user data.
- The AI adapter remains mock-first until a server-side provider contract, job persistence, timeout policy, and failure/refund behavior are verified together.
- Supabase Auth and the user-scoped snapshot/RLS seam are implemented in the current slice; the normalized tables and private Storage policies exist in the migration, while signed-URL client usage remains the next production boundary.
- Billing is an external verification boundary. The mobile client may request a purchase, but entitlement truth must come from verified store receipts/webhooks.

## Implementation order after the mock MVP

1. **Current slice:** Add an authenticated session and a Supabase-backed persistence adapter behind the existing store boundary. The migration and static RLS contract are in place; apply it and verify RLS with a non-owner/owner test pair once a development project is configured.
2. Move analysis and generation calls behind server-side functions. Keep provider keys and job orchestration out of the Expo bundle; preserve the existing `queued → processing → completed|failed` lifecycle.
3. Add private selfie upload/download through signed URLs, explicit consent records, deletion, and cleanup of failed or abandoned jobs.
4. Add store billing receipt verification and webhook reconciliation. Drive `Glow+` and credit balances from verified entitlements, not client-supplied values.
5. Add production rate limits, safe analytics, error reporting, retry/cancellation policy, and release checks only after the previous boundaries are testable.

Each step must preserve the mock mode, update the Archify JSON when topology changes, pass Archify validation/delivery, then pass the app typecheck, tests, export, and primary-flow smoke test.

## Trust boundaries

The mobile client may hold public Supabase configuration and user-scoped session state. It must never hold service-role keys, AI keys, payment secrets, or privileged mutation logic. Production AI/payment work belongs in Supabase Edge Functions or an equivalent server boundary.

## Deliberate MVP ceilings

- Mock mode uses local persistence and deterministic placeholder images. Authenticated mode syncs only sanitized JSON state; local/data image URIs and in-flight jobs are excluded until private Storage/job adapters exist.
- The first recommendation engine is a transparent profile/goal heuristic, not a learned model.
- Store billing is represented by entitlement and purchase interfaces; no external payment provider is faked.
- The timeline records selected looks and photos but does not judge attractiveness or progress.

These ceilings preserve the product flow while real providers and account infrastructure are unavailable.
