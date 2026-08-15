# Interesting Facts

Expo (React Native) app for the **Interesting Facts** platform — Android, iOS and web.
It consumes the Interesting Facts API at `https://api-interesting-facts-mu.vercel.app`.

## Features

- Feed of facts, search, and fact detail with like/delete
- Create facts with live `@mention` and `#hashtag` autocomplete
- Firebase email/password auth against the API backend
- Profile with avatar picker (API-provided colors/images) and edit
- Toast / error banner / confirmation dialog alert system
- Android hardware back guard + unsaved-changes guard on the create form

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io)
- [Expo Go](https://expo.dev/go) app on your device (dev only)

## Setup

1. Install dependencies

   ```bash
   pnpm install
   ```

2. Create the environment file and fill it in

   ```bash
   cp .env.example .env
   ```

   Required variables:

   | Variable | Description |
   | --- | --- |
   | `EXPO_PUBLIC_API_URL` | Backend API base URL (e.g. `http://localhost:3009` for local dev) |
   | `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
   | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain (`<project>.firebaseapp.com`) |
   | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
   | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
   | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
   | `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase web app ID |

   Get the Firebase values from the Firebase Console > Project Settings > Your apps > SDK setup.

3. Start the app

   ```bash
   npx expo start
   ```

   Scan the QR code with Expo Go (Android or iOS), or press `a` / `i` / `w` for a
   platform-specific target.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm start` | Start the Expo dev server |
| `pnpm android` | Start and open on Android |
| `pnpm ios` | Start and open on iOS |
| `pnpm web` | Start and open on web |
| `pnpm lint` | Run ESLint |
| `pnpm reset-project` | Reset the project to the starter template |

## Building a test APK (Android)

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

The `preview` profile (see `eas.json`) produces an installable APK with internal
distribution. For day-to-day development, Expo Go is enough — an installable IPA
for iOS requires an Apple Developer Program account.

## Project structure

```
app/          file-based routing (expo-router)
src/app/      screens (tabs, auth, fact, edit-profile)
src/components/ reusable UI components
src/data/     API client, auth, hooks and Zustand stores
src/constants/ theme tokens
src/hooks/    theme and color scheme
src/utils/    content parsing and validation
```