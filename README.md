# Fitts

Fitts is an AI-assisted workout tracking app for lifters who want a cleaner training history, faster logging, and useful post-workout recaps without turning their routine into spreadsheet maintenance.

The product is built around structured workout data: programs, reusable templates, performed workouts, exercises, set results, body measurements, and import-friendly history. AI is used where it can reduce friction, such as summarizing longer sessions and turning raw workout logs into readable recaps.

## What It Does

- Track workouts from web and native apps.
- Create and review workout logs with realtime sync.
- Generate optional AI workout recaps with OpenAI.
- Model programs, templates, exercises, sets, and measurements as structured data.
- Preserve performed workout history separately from editable templates.
- Support Strong import workflows and exercise-name mapping.
- Share one typed Convex backend across web and native clients.

## Apps

- `apps/web`: Next.js app for marketing, auth, and workout tracking.
- `apps/native`: Expo app for mobile workout tracking.
- `packages/backend`: Convex backend with schema, queries, mutations, actions, imports, and seed scripts.

## Stack

- TypeScript monorepo managed by Turborepo and pnpm.
- Next.js 16, React 19, and Tailwind CSS v4 for web.
- Expo and React Native for mobile.
- Convex for the realtime backend and database.
- Clerk for authentication.
- OpenAI for optional workout summaries.

## Local Setup

### 1. Install dependencies

```sh
pnpm install
```

### 2. Configure Convex and Clerk

Start Convex setup from the backend package:

```sh
pnpm --filter @packages/backend setup
```

The command logs you into Convex, creates or links a deployment, and waits until required environment variables are configured.

Configure Clerk using the Convex Clerk guide, then add `CLERK_ISSUER_URL` from the Clerk Convex JWT template to the Convex deployment environment variables.

For native login, enable Google and Apple social connections in Clerk.

### 3. Enable AI recaps

AI summaries are optional. To enable them, add `OPENAI_API_KEY` to the Convex deployment environment variables.

Without this key, workout tracking still works and AI recap UI is disabled.

### 4. Configure app env files

Create local env files from the checked-in examples:

- `apps/web/.env.local`
- `apps/native/.env.local`

Use the Convex URL from `packages/backend/.env.local` for:

- `NEXT_PUBLIC_CONVEX_URL`
- `EXPO_PUBLIC_CONVEX_URL`

Add the Clerk publishable keys from the Clerk dashboard to the app env files.

### 5. Run the app suite

```sh
pnpm dev
```

This runs the Convex backend, web app, and native app through Turbo.

## Useful Commands

```sh
pnpm dev
pnpm build
pnpm typecheck
pnpm format
pnpm --filter @packages/backend seed:exercises
pnpm --filter @packages/backend compare:strong-names
pnpm --filter @packages/backend draft:strong-mappings
pnpm --filter @packages/backend seed:exercise-mappings
```

## Data Model

Fitts treats templates and performed workouts as different things.

- Templates are reusable prescriptions that can change over time.
- Starting a template creates a workout snapshot.
- Completed workouts become the historical source of truth.
- Imported Strong sessions can stand alone without template linkage.
- Units are stored canonically while preserving entered or imported units for display fidelity.

See [`docs/data-model.md`](./docs/data-model.md) for the detailed schema notes, entity graph, and Strong import design.

## Deployment

The web app is set up for Vercel. Deploy the frontend and Convex together from `apps/web` with:

```sh
cd ../../packages/backend && npx convex deploy --cmd 'cd ../../apps/web && turbo run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

`apps/web/vercel.json` contains the Vercel build configuration.
