# Glow MVP plan

## Product slice

The shippable slice is onboarding → selfie guidance/upload → mock analysis → Glow Blueprint → ranked recommendations → credit-aware mock generation → before/after result → save/share. Home, Try, Timeline, Profile, Glow Goal, Paywall, Credits, purchase history, settings, and privacy/delete-data are reachable from the same shell.

## Data model

The production entities are `users`, `profiles`, `glow_profiles`, `user_preferences`, `selfies`, `analysis_results`, `recommendations`, `recommendation_feedback`, `generated_looks`, `generation_jobs`, `glow_goals`, `timeline_entries`, `subscriptions`, `credit_wallets`, `credit_transactions`, `purchases`, `share_cards`, and `analytics_events`. User-owned tables have RLS keyed by `auth.uid()`; image objects are private and referenced by storage paths, not public URLs.

## Navigation map

`OnboardingStack` handles welcome, goal/focus, selfie instructions, selfie upload, analysis loading, and blueprint. `MainTabs` contains Home, Try, Glow, Timeline, and Profile. A root stack pushes recommendation detail, category selection, generation loading/result, compare, saved looks, goal selection, paywall, credits, purchase history, settings, and privacy/delete-data.

## Provider contracts

`ImageAnalysisProvider.analyze(input)` returns structured styling signals. `RecommendationProvider.recommend(profile, goal)` returns ranked suggestions. `ImageGenerationProvider.generate(input)` returns an asynchronous job and `getJob(jobId)` returns lifecycle updates. The mock versions return realistic fixtures, delay completion, and can be forced to fail for refund testing.

## Monetization

Feature limits and generation costs are configuration, not screen constants. Free users receive one profile, three preview generations, the basic timeline, and the Glow Type card. Glow+ unlocks premium recommendations and higher limits; consumables pay for generative work. A failed job refunds a reserved credit exactly once. The UI shows subscription state, balance, and price/cost before a user commits.

## Validation order

1. Validate and deliver `docs/glow-architecture.architecture.json` with Archify whenever the system boundary changes.
2. Typecheck and run pure domain tests.
3. Run the Expo web bundle to catch navigation/render errors.
4. Smoke the primary flow in the browser or simulator.
5. Only then connect the remaining real storage, AI, and App Store billing adapters. Auth and the first RLS-backed state seam are already connected behind the store boundary.

## Identity/data-perimeter slice status

- Supabase client uses only `EXPO_PUBLIC_SUPABASE_URL` plus the publishable key and persists sessions with the SDK's AsyncStorage adapter.
- Email magic links, Apple/Google OAuth launch, callback handling, sign-out, and auth-change rehydration are wired through `src/services/auth.ts`.
- Guest state and signed-in state use separate scopes. A stale account load cannot overwrite a newer account because hydration is generation-guarded.
- `0002_identity_state_snapshot.sql` adds a transitional user-owned JSON snapshot with RLS. The adapter falls back to the signed-in user's local cache when remote persistence is unavailable.
- Remote snapshots exclude local/data image URIs and in-flight jobs. The existing migration already defines the private `glow-selfies` bucket and owner-scoped Storage policies; signed-URL client usage and normalized-row synchronization are the next slice.
- Live migration and owner/non-owner RLS checks are ready to run once the Supabase project URL is supplied. Keys stay outside the repository; the SQL contract is covered by tests.

## Next implementation slice

The next slice is private media access, not real AI or billing:

1. Apply and verify the existing schema, table RLS, and private Storage policies in a development Supabase project.
2. Add signed-URL upload/download/delete calls through the existing storage boundary without putting secret keys in the Expo bundle.
3. Persist consent and storage paths, then verify owner isolation and delete-all-data behavior.
4. Keep mock mode and the current screen flow working while the live adapter is introduced.

The AI and billing adapters remain explicit follow-up slices. They should not be added as client-side shortcuts because the Archify map treats those services as production security boundaries.
