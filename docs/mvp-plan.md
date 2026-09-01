# Glow MVP plan

## Product slice

The shippable slice is onboarding → authenticated selfie guidance/upload → production AI analysis → Glow Blueprint → ranked recommendations → credit-aware generation → before/after result → save/share. Home, Try, Timeline, Profile, Glow Goal, Paywall, Credits, purchase history, settings, and privacy/delete-data are reachable from the same shell.

## Data model

The production entities are `users`, `profiles`, `glow_profiles`, `user_preferences`, `selfies`, `analysis_results`, `recommendations`, `recommendation_feedback`, `generated_looks`, `generation_jobs`, `glow_goals`, `timeline_entries`, `subscriptions`, `credit_wallets`, `credit_transactions`, `purchases`, `share_cards`, and `analytics_events`. User-owned tables have RLS keyed by `auth.uid()`; image objects are private and referenced by storage paths, not public URLs.

## Navigation map

`OnboardingStack` handles welcome, goal/focus, selfie instructions, selfie upload, analysis loading, and blueprint. `MainTabs` contains Home, Try, Glow, Timeline, and Profile. A root stack pushes recommendation detail, category selection, generation loading/result, compare, saved looks, goal selection, paywall, credits, purchase history, settings, and privacy/delete-data.

## Provider contracts

`ImageAnalysisProvider.analyze(input)` returns structured styling signals. `RecommendationProvider.recommend(profile, goal)` returns ranked suggestions. `ImageGenerationProvider.generate(input)` returns an asynchronous job and `getJob(jobId)` returns lifecycle updates. The production provider is the only runtime implementation; missing configuration returns an error instead of synthetic data.

## Monetization

Feature limits and generation costs are configuration, not screen constants. A newly authenticated account receives the configured free preview credit allowance once through `ensure_credit_wallet`; the client only displays the verified wallet. Glow+ unlocks premium recommendations and higher limits; consumables pay for generative work after store verification is connected. `reserve_generation_credits` charges atomically and `fail_generation_job_and_refund` restores a failed job exactly once. No local purchase, subscription, grant, reservation, or refund path exists.

## Validation order

1. Validate and deliver `docs/glow-architecture.architecture.json` with Archify whenever the system boundary changes.
2. Typecheck and run pure domain tests.
3. Run the Expo web bundle to catch navigation/render errors.
4. Smoke the primary flow in the browser or simulator.
5. Deploy and live-verify the server-authoritative credit migration/RPCs, then harden the connected production AI provider and add App Store billing adapters. Auth, private media, and the production AI boundary are already connected behind the store boundary.

## Identity/data-perimeter slice status

- Supabase client uses only `EXPO_PUBLIC_SUPABASE_URL` plus the publishable key and persists sessions with the SDK's AsyncStorage adapter.
- Email magic links, Apple/Google OAuth launch, callback handling, sign-out, and auth-change rehydration are wired through `src/services/auth.ts`.
- Guest state and signed-in state use separate scopes. A stale account load cannot overwrite a newer account because hydration is generation-guarded.
- `0002_identity_state_snapshot.sql` adds a transitional user-owned JSON snapshot with RLS. The adapter falls back to the signed-in user's local cache when remote persistence is unavailable.
- Remote snapshots exclude local/data image URIs and in-flight jobs. After explicit consent, the private media adapter uploads selfie bytes through owner-scoped paths, creates signed URLs, persists `public.selfies` metadata, refreshes URLs on hydrate, and removes owned objects/rows during delete-all.
- Live checks against the configured Supabase project passed for Auth, owner/non-owner snapshot RLS, and private Storage ownership/signed URLs. Ephemeral test users, rows, and objects were removed afterward. Keys stay outside the repository; the SQL contract is covered by tests. The server-authoritative credit migration is implemented locally and must be deployed before the authenticated AI smoke test.

## Next implementation slice

The server-side AI boundary is now implemented as a production-only path; its next release slice is:

1. **Completed in production:** Persist provider tracking ids and the existing `queued → processing → completed|failed` lifecycle server-side with owner-scoped reads and deterministic retry convergence.
2. Deploy and verify the credit RPC migration, then harden the connected provider with timeout, retry, and rate-limit policy.
3. Keep provider keys, retries, refunds, and rate limits out of the Expo bundle.
4. Keep consent-gated media, the production-only server adapter, and the current screen flow working while hardening evolves.

The AI and billing adapters remain explicit follow-up slices. They should not be added as client-side shortcuts because the Archify map treats those services as production security boundaries.
