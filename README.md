# Glow

Glow is a mobile-first, English-first AI styling assistant built around a persistent Personal Glow Profile.

The first release is mock-first so the full onboarding-to-visualization flow can be run without paid AI or payment credentials. Supabase Auth and a user-scoped state snapshot adapter are now available behind the store boundary; private media, server-side AI and store billing remain later production slices.

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

The app never assigns beauty or attractiveness scores and never sends raw images to analytics. Guest mode uses AsyncStorage; authenticated mode syncs a sanitized state snapshot through Supabase RLS and keeps a per-user offline cache. Local file/data image URIs are not sent to that snapshot. The production schema and RLS policies live in `supabase/migrations`.

## Architecture

- `src/domain`: types, profile/recommendation rules, credits, entitlements, and job state.
- `src/services`: provider interfaces, mock implementations, Supabase client, and Auth boundary.
- `src/storage`: guest/user-scoped local persistence and the Supabase snapshot adapter.
- `src/store`: one small authenticated, persisted app store used by the screens.
- `app`: Expo Router stack, tab, and focused product routes.
- `src/components`: reusable visual primitives, not one dashboard component.
- `supabase/migrations`: production-oriented schema and row-level security.
- `tests`: pure business-logic tests.

The checked system plan is maintained with Archify: see [`docs/glow-architecture.architecture.json`](docs/glow-architecture.architecture.json) and the [interactive map](docs/glow-architecture.html). Architecture changes are planned in the JSON, validated/delivered, and then implemented in the app.

## Modes and environment

The default mode is `MOCK`. `EXPO_PUBLIC_AI_MODE` can later select `STAGING` or `PRODUCTION`. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to enable Auth and account-scoped sync; service-role, AI, payment, and webhook secrets must remain in server-side Edge Functions and are never placed in the mobile bundle. See `.env.example`.
