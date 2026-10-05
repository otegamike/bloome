# Bloome

A soft, simple web app for tracking daily birth-control pills. Next.js (App Router) + TypeScript, Auth.js (NextAuth v5), MongoDB with Mongoose, deployed on Vercel.

> This app gives no medical advice.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env template and fill in values (never commit real secrets):
   ```bash
   copy .env.example .env.local
   ```
3. Run locally:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. Signed-out visitors are sent to `/login`.

## Environment variables

| Name | Needed for | Notes |
| ---- | ---------- | ----- |
| `MONGODB_URI` | Database | MongoDB Atlas connection string |
| `AUTH_SECRET` | Auth.js | Generate with `openssl rand -base64 32` (or `npx auth secret`) |
| `AUTH_URL` | Auth.js | `http://localhost:3000` locally; your site URL in production |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google login | From Google Cloud Console OAuth client |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web push | Generate with `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | Web push | A `mailto:` contact URL for push services |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push (browser) | Same value as `VAPID_PUBLIC_KEY` |
| `CRON_SECRET` | Reminder scheduler | Long random string; the scheduler sends it as a Bearer token |

Auth uses the Auth.js v5 (`next-auth@5` beta) pattern: config lives in `src/lib/auth.ts` and the route at `src/app/api/auth/[...nextauth]/route.ts` re-exports its `GET`/`POST` handlers. Env names use the `AUTH_` prefix, which v5 infers automatically.

Routing guard uses the Next.js 16 `proxy` convention (`src/proxy.ts`) — the renamed `middleware`. Same redirect rules as the original `middleware.ts` plan.

## VAPID keys

```bash
npx web-push generate-vapid-keys
```

Put the public key in both `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, the private key in `VAPID_PRIVATE_KEY`.

## Scripts

- `npm run dev` — local dev server
- `npm run build` / `npm start` — production build and serve
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — vitest unit tests (date math, cycle derivation)

## Accounts and sign-in

- Email + password and Google sign-in are both supported (Auth.js v5, JWT sessions, no adapter).
- A Google sign-in with a verified email links to an existing account on the same email. If that account was created with a password but never verified its email, linking **removes the stored password hash** — this stops someone from pre-registering your email with their own password and riding along when you sign in with Google. After linking, that account signs in with Google only.
- There is **no password reset in v1**. If you signed up with email + password, keep it safe.

## Reminders

- Set a daily time in settings and opt into browser push. The external scheduler calls `GET /api/cron/reminders` about every minute; users whose local time has passed their reminder time (within a 2-hour grace window) get one generic notification per day: no mention of pills anywhere in the text.
- Only active pill days trigger reminders. Placebo days, days before your first pack, and days you already logged are skipped.
- Scale note: each sweep loads all reminder-enabled users, which is fine for thousands of users. Past that, bucket users by reminder time.

## Vercel deployment

1. Push the repo and import it in Vercel.
2. Set every variable from `.env.example` in the Vercel dashboard (production + preview as needed). `AUTH_URL` must be your site URL.
3. Node runtime: API routes using `bcryptjs`, `mongoose`, or `web-push` already set `export const runtime = "nodejs"`.
4. MongoDB Atlas: allow Vercel to reach the cluster (Atlas Network Access IP allow-list must permit Vercel's addresses, or use Atlas private connectivity).
5. Reminders run through an external scheduler (Hobby plan has no per-minute Vercel cron). Configure e.g. cron-job.org to call `GET https://<domain>/api/cron/reminders` every minute with header `Authorization: Bearer <CRON_SECRET>`.

## iOS push note

iOS delivers web push only to the installed (Home Screen) PWA, not to plain Safari tabs. Install the app via Share → Add to Home Screen before expecting reminders there.

## Icons

`public/icons/` holds the BloomMark-based app art: `icon.svg` plus generated
`icon-192.png`, `icon-512.png`, and `icon-maskable-512.png` (mark at 60% of
the canvas for the maskable safe zone).

## Frontend

The UI is built per `frontend.md` (behavior) and `design.md` (visuals):
Next.js App Router, CSS Modules with tokens in `src/styles/tokens.css`, no
Tailwind, no inline styles, Zustand stores in `src/store`, and a typed client
in `src/client/apiClient.ts`.

### Mock mode

Set `NEXT_PUBLIC_USE_MOCKS=true` in `.env.local` to run the whole UI without
a backend or login. The app serves an in-memory copy (user "Rose", one
Levofem 21+7 pack started 12 days ago with a deliberate gap) that mirrors the
real shapes, status codes, and error bodies. State persists in
`localStorage`, and a subtle "Mock data" pill shows in the header.

- Switch it off with `NEXT_PUBLIC_USE_MOCKS=false` (plus a real
  `MONGODB_URI` and Auth.js env) to run against MongoDB.
- Append `?mockFail=log` to any URL to make the next log save fail once, so
  you can test the optimistic rollback and retry toast.

### QA checklist

- [ ] Register, onboarding with Levofem default, a start date 10 days ago, theme chosen, finish lands on Home with a correct calendar.
- [ ] Tap today: drawn check, toast with Undo, Today card done state; Undo reverses cleanly.
- [ ] Missed days show a dashed open ring; tapping one opens the sheet; "Mark as taken" fills it in and shows "Logged late".
- [ ] Placebo days are striped with a moon and never red; tapping shows the info sheet.
- [ ] Future days toast; days before the first pack are inert.
- [ ] Month navigation by buttons, swipe, and keyboard; "Today" pill appears and returns.
- [ ] Pack strip spans a cycle crossing two months correctly.
- [ ] All three themes look right on Home, Settings, and Onboarding; switching cross-fades with no flash on reload.
- [ ] Reduced motion on: everything still correct, no decorative movement.
- [ ] Keyboard-only: complete login, mark today, open a day sheet, change a setting.
- [ ] Screen reader labels on cells and announcements for mark and undo.
- [ ] Reminders: enable, test notification, disable; blocked, unsupported, and iPhone-not-installed messages appear correctly.
- [ ] Rollback: with `?mockFail=log`, a failed save restores the cell and shows the retry toast.
- [ ] Timezone banner appears when the device timezone differs and can be dismissed.
- [ ] 320px, 360px, 768px, 1024px, and 1440px widths all look right; no horizontal scroll.
- [ ] `npm run typecheck` and `npm run lint` pass; no inline `style`, no Tailwind, no new dependencies.
