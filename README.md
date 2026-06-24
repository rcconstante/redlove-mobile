# RedLOVE Today Mobile

React Native and Expo mobile client for the RedLOVE Today dating platform.

This app ports the existing `RedLovetoday-web` user flows to native iOS and Android while preserving the existing backend API contracts. The current implementation is typed, route-complete for the implemented mobile screens, and wired to the web backend through the service layer in `src/services`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | React Native 0.81 + Expo SDK 54 |
| Routing | Expo Router typed routes |
| Language | TypeScript 5.9 |
| State | React Context plus local screen state |
| API | Fetch-based typed service layer |
| UI | Native components, shared UI primitives, `StyleSheet` |
| Media rendering | `expo-image` |
| App chrome | Native icon primitives, `expo-status-bar`, `expo-splash-screen` |

## Backend Contract

Set `EXPO_PUBLIC_API_URL` to the web backend origin before running against a real environment. The API client normalizes the URL to `/api` and sends requests with `credentials: 'include'` to preserve the existing session-cookie backend contract.

The mobile code must not change backend routes, database schema, auth rules, permissions, premium rules, Guardian permissions, media contracts, or payment contracts without a matching backend change.

## Current Native Gaps

These are not stale code issues; they are explicit production gaps that still need native dependencies, backend support, or store-policy decisions before App Store / Google Play release.

| Area | Current State | Production Requirement |
| --- | --- | --- |
| Native auth persistence | Uses the existing session-cookie API contract. No native secure session persistence package is installed. | Add a native cookie/session strategy or token contract with secure storage after backend alignment. |
| Store app identifiers | `app.json` does not yet define final `ios.bundleIdentifier` or `android.package`. EAS build/submit profiles are present in `eas.json`. | Add final app identifiers, signing credentials, and release channels before store submission. |
| Push notifications | In-app polling and notification inbox are implemented. Device push registration is not implemented. | Add `expo-notifications`, push token registration, backend delivery, and opt-in handling. |
| Background calls | Native WebRTC call UI and signaling are implemented for foreground app sessions. Incoming calls still depend on polling while the app is running. | Add production push/call notifications and validate killed/background call behavior on physical devices. |
| Store payments | Premium and credit screens are wired to PayPal backend endpoints. | Add Apple/Google-compliant IAP products and entitlement reconciliation, or obtain an approved policy exception. |
| Verification parity | The web profile page supports selfie verification through `/api/verification/status` and `/api/verification/submit`. | Add the same mobile verification flow or intentionally remove it from the release scope. |
| Profile visit notifications | The web layout polls `/api/profile-visits/notifications` for live visit toasts. | Add the mobile equivalent if profile visit alerts are part of the release scope. |
| Guardian parity | Mobile implements dashboard, users, reports, and user detail. The web Guardian console has additional staff, verification moderation, support inbox, bot user, cleanup, notify, and conversation tools. | Decide whether Guardian is internal-web-only or port the remaining tools. |

## Implemented Mobile Routes

### Auth and Onboarding

| Feature | Route |
| --- | --- |
| Login | `/(auth)/login` |
| Register | `/(auth)/register` |
| Forgot password | `/(auth)/forgot-password` |
| Reset password | `/(auth)/reset-password` |
| Onboarding photo | `/(onboarding)/photo` |
| Onboarding interests | `/(onboarding)/interests` |
| Onboarding welcome | `/(onboarding)/welcome` |

### Core App

| Feature | Route |
| --- | --- |
| Landing | `/landing` |
| Discover | `/(tabs)/discover` |
| Match maker | `/(tabs)/match-maker` |
| Likes, sent likes, favorites | `/(tabs)/likes` |
| Matches list | `/(tabs)/matches` |
| Preferences | `/(tabs)/preferences` |
| My profile | `/me` |
| Public profile | `/profile/[id]` |
| Chat | `/chat/[matchId]` |
| Chat media | `/chat/[matchId]/media` |
| Notifications inbox | `/notifications` |
| Media manager | `/me/media` |
| Preferences detail | `/me/preferences` |
| Settings | `/settings` |

### Premium, Content, Legal, Guardian

| Feature | Route |
| --- | --- |
| Premium plans | `/premium` |
| Credit packs | `/premium/credits` |
| Payment history | `/payments/history` |
| Showcase | `/showcase` |
| Download promo | `/download` |
| Ad template | `/ad` |
| Privacy policy | `/(legal)/privacy` |
| Terms of service | `/(legal)/terms` |
| Trust and safety | `/(legal)/trust` |
| Guardian dashboard | `/guardian` |
| Guardian users | `/guardian/users` |
| Guardian reports | `/guardian/reports` |
| Guardian user detail | `/guardian/users/[id]` |

## Feature Status

| Area | Status |
| --- | --- |
| Authentication and onboarding | Mobile screens, guards, validation, and API services implemented. |
| Discover, likes, favorites, matches, chat | Mobile routes and API services implemented. |
| Profile, preferences, settings, delete account | Mobile routes and API services implemented. |
| Media management | Backend service integration, native picker/camera selection, profile media upload, and protected media rendering implemented. |
| Premium plans, credit packs, payment history | Backend service integration implemented; native IAP gap remains. |
| Notifications | Bell, inbox, polling context, and mark-read flows implemented; push gap remains. |
| Calls | Native WebRTC audio/video call UI, ringtone, signaling, ICE polling, and in-chat lifecycle implemented; production background-call delivery remains. |
| Guardian | Dashboard, user list, report list, and user detail routes implemented; advanced web-only Guardian tools are not fully ported. |
| Marketing and legal | Native route coverage implemented. |

## Project Structure

```text
RedLovetoday-mobile/
  assets/
    images/
      logo.png
      adaptive-icon.png
      favicon.png

  src/
    app/
      _layout.tsx
      index.tsx
      (auth)/
      (onboarding)/
      (tabs)/
      (legal)/
      chat/[matchId].tsx
      chat/[matchId]/media.tsx
      guardian/
      me/
      notifications.tsx
      payments/history.tsx
      premium/
      profile/[id].tsx
      settings.tsx
      landing.tsx
      showcase.tsx
      download.tsx
      ad.tsx

    screens/
      app-screens.tsx

    components/
      layout/
      shared/
      ui/

    contexts/
      auth-context.tsx
      notification-context.tsx
      theme-context.tsx

    hooks/
      use-api.ts
      use-auth.ts
      use-media-upload.ts
      use-notifications.ts
      use-online-status.ts
      use-photo-protection.ts
      use-theme.ts
      use-toast.ts

    lib/
      api.ts
      api-endpoints.ts

    services/
      auth.service.ts
      calls.service.ts
      discover.service.ts
      guardian.service.ts
      likes.service.ts
      matches.service.ts
      media.service.ts
      messages.service.ts
      notifications.service.ts
      premium.service.ts
      users.service.ts

    types/
    utils/
    constants/
```

## Navigation

The app starts at `src/app/index.tsx` and redirects based on auth state:

```text
Unauthenticated -> /landing -> auth flow
Authenticated without a profile photo -> /(onboarding)/photo
Authenticated with onboarding complete -> /(tabs)/discover
```

Main authenticated tabs:

| Tab | Icon | Route |
| --- | --- | --- |
| Discover | compass | `/(tabs)/discover` |
| Match Maker | spark | `/(tabs)/match-maker` |
| Likes | heart | `/(tabs)/likes` |
| Matches | chat bubbles | `/(tabs)/matches` |
| Preferences | sliders | `/(tabs)/preferences` |

## Development

```bash
npm install
npm start
npm run android
npm run ios
npm run web
```

Required checks before release:

```bash
npm run typecheck
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
npx expo export --platform web --output-dir <tmp-output-dir>
```

Visual QA should be done on iOS Simulator and Android Emulator with a real backend URL configured. The Codex in-app browser may not load local Expo exports in some environments because local targets can be blocked by the embedded browser client.

## Release Readiness

The app is a strong mobile port foundation and passes static/export checks, but it should not be submitted to App Store or Google Play until the native gaps above are completed and validated on physical devices. Store submission also needs final bundle identifiers, signing credentials, privacy manifest review, permission copy, screenshots, production API configuration, crash reporting, and payment compliance review.
