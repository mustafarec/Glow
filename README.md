# Glow

Glow is a mobile-first, English-first AI styling assistant built around a persistent Personal Glow Profile.

The first release is mock-first so the full onboarding-to-visualization flow can be run without paid AI or payment credentials. Supabase Auth, user-scoped snapshots, consent-gated private selfie media, and an authenticated staging AI boundary are available behind the store boundary; real provider integration and store billing remain later production slices.

## Run

```bash
npm install
npm run start
```

For a browser preview use `npm run web`. Use `npm run typecheck` and `npm test` before handing off changes.

## Current MVP path

1. Choose a glow goal and focus.
2. Upload one or more selfies, or continue with the demo profile.
3. Review a personalized Glow Blueprint.
4. Open a recommendation and generate a mock preview.
5. Compare, save, favorite, and share a look.

The app never assigns beauty or attractiveness scores and never sends raw images to analytics. Guest mode uses AsyncStorage; authenticated mode syncs a sanitized state snapshot through Supabase RLS and keeps a per-user offline cache. Selected images remain local until explicit consent, then upload to the private `glow-selfies` bucket through user-scoped paths and signed URLs; local file/data image URIs are not sent to the snapshot. The production schema and RLS policies live in `supabase/migrations`.

## Architecture

- `src/domain`: types, profile/recommendation rules, credits, entitlements, and job state.
- `src/services`: provider interfaces, mode-gated mock/server adapters, AI contract, Supabase client, and Auth boundary.
- `src/storage`: guest/user-scoped persistence, the Supabase snapshot adapter, and the consent-gated private media adapter.
- `src/store`: one small authenticated, persisted app store used by the screens.
- `app`: Expo Router stack, tab, and focused product routes.
- `src/components`: reusable visual primitives, not one dashboard component.
- `src/components/ui`: React Native Reusables components generated from the official registry.
- `supabase/migrations`: production-oriented schema and row-level security.
- `supabase/functions/ai`: authenticated server-side AI request boundary with a deterministic staging provider.
- `tests`: pure business-logic tests.

The checked system plan is maintained with Archify: see [`docs/glow-architecture.architecture.json`](docs/glow-architecture.architecture.json) and the [interactive map](docs/glow-architecture.html). Architecture changes are planned in the JSON, validated/delivered, and then implemented in the app.

The shared Glow UI layer is built on [React Native Reusables](https://github.com/founded-labs/react-native-reusables) with NativeWind. The existing screen-facing API remains in `src/components/ui.tsx`, while its buttons, cards, badges, text, and separators use the generated local primitives. Run `npx @react-native-reusables/cli@latest doctor -y` to verify the setup.

## Modes and environment

The default mode is `MOCK`. `EXPO_PUBLIC_AI_MODE=STAGING` or `PRODUCTION` selects the authenticated `ai` Supabase Edge Function when the public Supabase configuration is present; the app sends action data and owner-scoped storage paths, never local image URIs or provider secrets. Deploy the function with `supabase functions deploy ai` before selecting a server mode. For real AI, set the Supabase secrets `AI_MODE=PRODUCTION` and `OPENAI_API_KEY`, then use `EXPO_PUBLIC_AI_MODE=PRODUCTION` in the app. Luna handles selfie analysis and recommendations; `gpt-image-2` handles the private preview edit. Real provider keys, service-role keys, payment secrets, and webhook secrets must remain in server-side Edge Functions and are never placed in the mobile bundle. See `.env.example`.
