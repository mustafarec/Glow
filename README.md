# Glow

Glow is a mobile-first, English-first AI styling assistant built around a persistent Personal Glow Profile.

Glow runs through the production Supabase boundary: authenticated users upload consented selfies to private Storage, GPT-5.6 Luna creates the profile and recommendations, and GPT Image 2 creates private previews. Credit allowance, reservation, and failed-job refunds are server-authoritative. Store billing is intentionally disabled until Google Play and App Store verification is connected.

## Run

```bash
npm install
npm run start
```

For a browser preview use `npm run web`. Use `npm run typecheck` and `npm test` before handing off changes.

## Current MVP path

1. Choose a glow goal and focus.
2. Sign in and upload one or more selfies.
3. Review a personalized Glow Blueprint.
4. Open a recommendation and generate a private AI preview.
5. Compare, save, favorite, and share a look.

The app never assigns beauty or attractiveness scores and never sends raw images to analytics. Guest mode uses AsyncStorage; authenticated mode syncs a sanitized state snapshot through Supabase RLS and keeps a per-user offline cache. Selected images remain local until explicit consent, then upload to the private `glow-selfies` bucket through user-scoped paths and signed URLs; local file/data image URIs are not sent to the snapshot. Wallet and entitlement fields are excluded from the client snapshot and read from server-owned tables. The production schema and RLS policies live in `supabase/migrations`.

## Architecture

- `src/domain`: types, credit/entitlement rules, and job state.
- `src/services`: production AI provider, account wallet reader, AI contract, Supabase client, and Auth boundary.
- `src/storage`: guest/user-scoped persistence, the Supabase snapshot adapter, and the consent-gated private media adapter.
- `src/store`: one small authenticated, persisted app store used by the screens.
- `app`: Expo Router stack, tab, and focused product routes.
- `src/components`: reusable visual primitives, not one dashboard component.
- `src/components/ui`: React Native Reusables components generated from the official registry.
- `supabase/migrations`: production-oriented schema and row-level security.
- `supabase/functions/ai`: authenticated, production-only server-side AI request boundary.
- `tests`: pure business-logic tests.

The checked system plan is maintained with Archify: see [`docs/glow-architecture.architecture.json`](docs/glow-architecture.architecture.json) and the [interactive map](docs/glow-architecture.html). Architecture changes are planned in the JSON, validated/delivered, and then implemented in the app.

The shared Glow UI layer is built on [React Native Reusables](https://github.com/founded-labs/react-native-reusables) with NativeWind. The existing screen-facing API remains in `src/components/ui.tsx`, while its buttons, cards, badges, text, and separators use the generated local primitives. Run `npx @react-native-reusables/cli@latest doctor -y` to verify the setup.

## Modes and environment

The app requires `EXPO_PUBLIC_AI_MODE=PRODUCTION` and a valid public Supabase URL/publishable key. It sends action data and owner-scoped Storage paths to the authenticated `ai` Edge Function, never local image URIs or provider secrets. Deploy migrations first, then the function with `supabase functions deploy ai`; the function fails closed unless its server secrets include `AI_MODE=PRODUCTION` and `OPENAI_API_KEY`. Luna handles selfie analysis and recommendations; `gpt-image-2` handles the private preview edit. Real provider keys, service-role keys, payment secrets, and webhook secrets must remain in server-side Edge Functions and are never placed in the mobile bundle. Store billing is not simulated locally. See `.env.example`.
