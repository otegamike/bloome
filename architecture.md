# architecture.md — Foundation & Scaffolding Prompt

> **Role:** You are a senior full-stack engineer. Your job in THIS prompt is to lay the foundation of the project: scaffold it, install dependencies, configure tooling, and create the folder structure, shared utilities, and stubs that later prompts (`backend.md`, `design.md`, `frontend.md`) will fill in.
>
> **Do NOT implement product features here.** No calendar UI, no pill logging logic, no real API handlers beyond the stubs listed below. Build the skeleton so the next prompts slot in cleanly.

Run order for the whole project: `architecture.md` → `backend.md` → `design.md` → `frontend.md`.

The project is called **Bloome**. Coding conventions live in **`AGENTS.md`** at the repo root. Place it there first, read it fully before writing any code, and follow it in every step below. Where this file and `AGENTS.md` ever disagree on code style or file organization, `AGENTS.md` wins.

---

## 1. Product summary (context only)

A simple, feminine, animated web app for tracking daily birth-control pills.

- Opens on a **calendar**. The user taps a day to mark a pill as taken.
- Supports **pill packs/presets** (e.g. Levofem). Default cycle is **21 active + 7 placebo days**; other presets and custom cycles are supported.
- User can indicate **pack start**, and the calendar shows **active days vs placebo days**.
- **Missed days** (past active-pill days with no log) render in light red. Placebo days are never "missed".
- Past days can be logged late (catch-up).
- **Browser push notification reminders** at a user-chosen time.
- **Three selectable themes** (soft pastels, rosy/romantic, fresh/airy).
- Login with **email + password** and **Google**.

Non-goals: this is not a medical device and gives no medical advice (no "what to do if you missed a pill" guidance). No social features, no analytics on log data.

---

## 2. Hard constraints (never violate)

1. **Framework:** Next.js (App Router) + TypeScript (strict mode).
2. **Auth:** NextAuth / Auth.js, with Credentials (email+password) and Google providers.
3. **Database:** MongoDB via **Mongoose** (not the raw driver, not Prisma).
4. **Hosting:** Vercel (serverless). Everything must work in that environment.
5. **Styling: NO Tailwind CSS. Do not install, configure, or reference it.** Use **CSS Modules + CSS custom properties** (plus one global stylesheet for tokens/reset). No CSS-in-JS libraries.
6. **Animations:** hand-written CSS (keyframes/transitions, SVG stroke-dashoffset). Do **not** install an animation library at this stage.
7. **Reminders:** Web Push via `web-push`. Scheduling is triggered by an **external scheduler** (e.g. cron-job.org) calling a secured API route. **Do not add a `crons` entry to `vercel.json`** (Hobby plan only allows daily cron).
8. Follow `AGENTS.md` for component structure, styling rules (no inline styles, multiline CSS), state (Zustand), and the `void Model;` guard for Mongoose models.
9. Runtime: any route using `bcryptjs`, `mongoose`, or `web-push` must run on the **Node.js runtime**, never Edge.

---

## 3. Step-by-step tasks

### 3.1 Scaffold

- Create the Next.js app with TypeScript, ESLint, App Router, `src/` directory, import alias `@/*`. **Answer "No" to Tailwind** in any prompt.
- Use the current stable Next.js and React versions. Check the official docs for the current stable Auth.js / `next-auth` setup for the App Router before wiring it; follow whatever the current stable docs say rather than old patterns.
- Add `engines` to `package.json` for the current Node LTS.

### 3.2 Install dependencies

Install the latest stable of each (verify they resolve and peer-dependency-check against the installed Next/React):

**Runtime**
- `next-auth` (Auth.js) — authentication
- `mongoose` — ODM
- `bcryptjs` — password hashing (pure JS, serverless-friendly)
- `zod` — request/response validation, shared between client and server
- `web-push` — push notification sending
- `date-fns` — date math for calendar/cycle calculations
- `clsx` — conditional class names for CSS Modules
- `zustand` — cross-cutting client state (stores in `src/store`)
- `server-only` — guard so server code can never be imported into client bundles

**Dev**
- `typescript`, `@types/node`, `@types/react`, `@types/react-dom`
- `@types/web-push`, and `@types/bcryptjs` only if the installed `bcryptjs` version doesn't ship its own types
- `eslint`, `eslint-config-next`, `prettier`

Do **not** install: `tailwindcss`, `postcss` plugins for Tailwind, `framer-motion`, any UI kit (MUI, Chakra, shadcn, etc.).

### 3.3 Folder structure

Create this structure (empty stubs/placeholders where noted):

```
.
├── AGENTS.md                    # coding conventions (provided; copy to repo root)
├── public/
│   ├── sw.js                    # service worker stub (push + notificationclick handlers added in frontend.md)
│   ├── manifest.webmanifest     # PWA manifest (name from config, theme colors placeholder)
│   └── icons/                   # placeholder icon files (192, 512, maskable) — note in README that real art is TBD
├── src/
│   ├── app/
│   │   ├── layout.tsx           # root layout: sets <html data-theme>, loads global styles, registers nothing yet
│   │   ├── page.tsx             # placeholder home (will become the calendar)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx   # placeholder
│   │   │   └── register/page.tsx# placeholder
│   │   ├── settings/page.tsx    # placeholder
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── health/route.ts          # real: returns { ok: true } and verifies DB connectivity
│   │       ├── register/route.ts        # stub (501) — implemented in backend.md
│   │       ├── packs/route.ts           # stub (501)
│   │       ├── logs/route.ts            # stub (501)
│   │       ├── push/subscribe/route.ts  # stub (501)
│   │       └── cron/reminders/route.ts  # stub (501) — secured with CRON_SECRET in backend.md
│   ├── components/              # empty; filled in frontend.md (folder per feature/section, see AGENTS.md)
│   ├── hooks/                   # empty; client hooks, only when shared by 2+ components
│   ├── store/                   # empty; Zustand stores for cross-cutting state (theme, alerts, packs, logs)
│   ├── lib/                     # SERVER-ONLY code: every file starts with `import "server-only"`
│   │   ├── db.ts                # cached Mongoose connection (see 3.5)
│   │   ├── auth.ts              # Auth.js config (see 3.6)
│   │   ├── env.ts               # zod-validated env access (see 3.4)
│   │   └── shared/              # pure, framework-free code used by client AND server (no `server-only`, no DB)
│   │       ├── config.ts        # APP_NAME, APP_DESCRIPTION, THEMES list, defaults (single place to rename the app)
│   │       ├── dates.ts         # date helpers (see 3.7)
│   │       ├── cycle.ts         # pure cycle-computation function signatures (typed, TODO bodies)
│   │       └── schemas/         # zod schemas shared by client and server (filled in backend.md)
│   ├── models/                  # Mongoose models, empty; filled in backend.md
│   ├── types/
│   │   └── index.ts             # shared TS types (see 3.8)
│   ├── styles/
│   │   ├── globals.css          # reset + base + imports tokens
│   │   └── tokens.css           # custom properties; one block per theme (values defined in design.md)
│   └── middleware.ts            # route protection (see 3.6)
├── .env.example
├── .prettierrc
├── README.md
└── package.json
```

### 3.4 Environment variables

Create `.env.example` (never commit real values) and `src/lib/env.ts` that validates them with zod and throws a clear error at startup if something required is missing.

```
# Database
MONGODB_URI=

# Auth.js
AUTH_SECRET=                 # generate with: openssl rand -base64 32
AUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Web Push (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # same value as VAPID_PUBLIC_KEY

# External scheduler → /api/cron/reminders
CRON_SECRET=                 # long random string; scheduler sends it as a Bearer token
```

Use the variable names the current stable Auth.js docs expect; adjust the names above if they differ and note it in the README.

### 3.5 Mongoose connection (`src/lib/db.ts`)

Implement the standard **cached connection pattern for serverless/hot-reload**: store the connection promise on `globalThis`, reuse it across invocations, disable `bufferCommands` issues by awaiting connect before queries, and export `connectDB()`. Keep it fully typed.

### 3.6 Auth foundation

- Configure Auth.js with **JWT session strategy** and **no database adapter** (the Credentials provider requires JWT, and we manage the `User` model ourselves with Mongoose).
- Providers: `Credentials` (email + password, `authorize` is a stub that returns `null` until `backend.md`) and `Google`.
- Callbacks to scaffold (bodies finished in `backend.md`): `signIn` (upsert/link the Mongoose `User` on Google sign-in, matching by email only when the provider reports the email as verified), `jwt` and `session` (expose the Mongo `userId` on the session).
- Extend the session/JWT types via module augmentation in `src/types`.
- `middleware.ts`: redirect unauthenticated visitors to `/login` for all routes except `/login`, `/register`, `/api/auth/*`, `/api/health`, `/api/register`, `/api/cron/*` (the cron route authenticates with the bearer secret instead), static assets, `sw.js`, and the manifest.

### 3.7 Date & timezone convention (important)

To avoid timezone bugs, **a "day" is always a plain string `YYYY-MM-DD` in the user's own timezone**, never a JS `Date` timestamp, both in the database and in API payloads.

- `src/lib/shared/dates.ts` exports: `toDayString(date, tz)`, `todayInTz(tz)`, `addDays(day, n)`, `diffInDays(a, b)`, `daysInMonth(year, month)`, all operating on day strings.
- Each user stores an IANA timezone (e.g. `Africa/Lagos`) captured from `Intl.DateTimeFormat().resolvedOptions().timeZone` at signup and editable in settings.

### 3.8 Shared types (`src/types/index.ts`)

Define and export (types only, no logic):

```ts
export type DayString = string; // "YYYY-MM-DD"
export type ThemeName = "blush" | "rose" | "peach";
export type LogStatus = "taken" | "skipped";           // "missed" is derived, never stored
export type DayKind = "active" | "placebo" | "outside"; // derived from pack cycle
export type DayState = "taken" | "missed" | "upcoming" | "today" | "placebo" | "skipped" | "outside";

export interface PackPreset { id: string; name: string; activeDays: number; placeboDays: number }
```

Declare `src/lib/shared/cycle.ts` function signatures (bodies throw `Error("not implemented")`):

- `getDayKind(packStart: DayString, activeDays: number, placeboDays: number, day: DayString): DayKind`
- `getDayState(args): DayState` — combines kind, log, and today

### 3.9 Config (`src/lib/shared/config.ts`)

- `APP_NAME = "Bloome"`. It must only be defined here and read from here, including in the manifest, page metadata, and README title.
- `THEMES`: `["blush", "rose", "peach"]`, default `"blush"`.
- `DEFAULT_PRESETS`: Levofem (21 active + 7 placebo), a generic 28-day (21+7), a 24+4, and a continuous (no placebo) preset. Users can also create custom cycles.

### 3.10 PWA & service worker foundation

- `manifest.webmanifest`: name/short_name from config, `display: "standalone"`, `start_url: "/"`, placeholder theme/background colors, icon entries.
- Link the manifest and set `<meta name="theme-color">` in the root layout.
- `public/sw.js`: minimal stub with empty `push` and `notificationclick` listeners (real behavior added in `frontend.md`). Do not register it yet.
- Add a note in the README that iOS delivers web push only to the installed (Home Screen) PWA.

### 3.11 Theming foundation

- Root `<html>` gets `data-theme` set server-side from a `theme` cookie (default `blush`), so there is no flash of the wrong theme.
- `tokens.css` declares the three theme blocks `:root[data-theme="blush"]`, `[data-theme="rose"]`, `[data-theme="peach"]` with **placeholder** custom properties only (names listed in `design.md` later). Include a `prefers-reduced-motion` global rule that disables the animations we'll add.

### 3.12 Tooling

- Strict TypeScript (`"strict": true`, `noUncheckedIndexedAccess`).
- ESLint passes with `next lint` defaults; Prettier config added.
- Add scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`).
- `README.md`: setup steps, env var table, how to generate VAPID keys, how to run locally, and a short **Vercel deployment** section (set env vars, Node runtime, connect MongoDB Atlas with an IP allow-list that permits Vercel, and how to configure the external scheduler: `GET https://<domain>/api/cron/reminders` every minute with header `Authorization: Bearer <CRON_SECRET>`).

---

## 4. Conventions for all later prompts

- Server code in `src/lib`, `src/models`, and route handlers; shared validation schemas in `src/lib/shared/schemas` (zod) used on both sides.
- Never trust the client: all route handlers get the user ID from the session, never from the request body.
- All route handlers validate input with zod and return consistent JSON errors: `{ error: string }` with proper status codes.
- Log data and push subscriptions are sensitive: don't log request bodies, and don't add third-party analytics.
- Keep files small and named by responsibility. Prefer named exports.

---

## 5. Definition of done for this prompt

- [ ] `npm install` succeeds; no Tailwind or animation library in `package.json`.
- [ ] `npm run dev` boots; `/` redirects to `/login` when signed out; placeholder pages render.
- [ ] `GET /api/health` returns `{ ok: true }` and confirms DB connectivity with a real `MONGODB_URI`.
- [ ] `npm run typecheck` and `npm run lint` pass.
- [ ] `.env.example` and README are complete; `APP_NAME` ("Bloome") is defined only in `src/lib/shared/config.ts`.
- [ ] `AGENTS.md` is at the repo root; every file in `src/lib` (outside `shared/`) starts with `import "server-only"`.
- [ ] All stub routes respond `501` with `{ error: "Not implemented" }` (except `health`).
- [ ] Nothing from `backend.md`, `design.md`, or `frontend.md` has been implemented yet.

When finished, summarize what was created and list any deviations (for example env var names changed to match current Auth.js docs) so the next prompt can account for them.
