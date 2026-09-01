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
- Remote snapshots exclude local/data image URIs and in-flight jobs. Private Supabase Storage and normalized-row synchronization are intentionally the next slice.
- This workspace has no configured Supabase project or CLI credentials, so migration execution and owner/non-owner live RLS checks are still pending; the SQL contract is covered by tests.

## Next implementation slice

The next slice is the identity and data perimeter, not real AI or billing:

1. Define the authenticated session boundary and a storage interface that can switch between the current local adapter and Supabase.
2. Add the Supabase client with public configuration only; keep service-role and provider keys server-side.
3. Apply and verify the existing schema/RLS migration in a development Supabase project, including owner isolation and private selfie storage.
4. Rehydrate `AppStore` from the authenticated user without changing the screen-level flow or mock mode.
5. Add tests for sign-out, account switching, delete-all-data, RLS ownership, and a failed generation refund after persistence is remote.

The AI and billing adapters remain explicit follow-up slices. They should not be added as client-side shortcuts because the Archify map treats those services as production security boundaries.
