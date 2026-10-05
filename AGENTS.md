<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Bloome

A soft, feminine, animated web app for tracking daily birth-control pills. Next.js (App Router) + TypeScript, Auth.js (NextAuth), MongoDB with Mongoose, deployed on Vercel.

* **No Tailwind CSS.** Style with CSS Modules and CSS custom properties only.
* The app name lives in one place: `APP_NAME` in `src/lib/shared/config.ts`. Never hard-code it elsewhere.
* A "day" is always a plain `YYYY-MM-DD` string in the user's own timezone. Never store or send a JS `Date` for a calendar day.
* The build plan is split into `architecture.md`, `backend.md`, `design.md`, and `frontend.md`. Follow them in that order and do not build ahead of the prompt you are on.

# mongoose + Turbopack

Mongoose models must be **referenced in function body code** (not just imported) in any file that uses `.populate()` on a ref to that model. Turbopack tree-shakes unused imports, which prevents `mongoose.model()` registration from executing and causes `MissingSchemaError` at runtime.

Always guard model imports with `void ModelName;` after the import block:

```ts
import PillPack from "@/models/PillPack";
import PillLog from "@/models/PillLog";

void PillPack;
void PillLog;
```

# Speak plainly, avoid dense technical shorthand

Explain things in plain, everyday language instead of dense, jargon-packed technical shorthand. This applies generally — not just to bug investigations, and not as a fixed template to fill in every time.

## Why

Left alone, technical explanations tend to compress into shorthand: chained `file.ts:123 -> other.ts:45` traces, arrow notation, variable names standing in for concepts, and multiple ideas packed into one run-on sentence. That's fast to write but hard to read — the reader has to reverse-engineer the code just to follow the explanation of the code.

## How to write

* Say what's going on in plain sentences first. Add `file:line` references or code specifics afterward, only where they genuinely help — as a pointer, not as the explanation itself.
* Don't use a variable, function, or type name as if it were an English word the reader already knows — say what it represents in plain terms the first time it comes up.
* Define jargon (race condition, null vs undefined, guard clause, etc.) in one clause the first time it's used, if it's used at all.
* Prefer short sentences over long ones with multiple clauses joined by commas, slashes, or stacked parentheses.
* No chained arrow traces (`a:1 -> b:2 -> c:3`) as a substitute for prose.

## What NOT to do

* Don't force every response into a fixed shape (e.g. always restating "why it happens" or "how to fix it") regardless of whether that's relevant. If the cause is already obvious, known, or not in question, skip explaining it — answer what was actually asked.
* Don't pad a simple answer with unrequested structure, headers, or extra sections just to look thorough. Match the length and depth of the response to the actual question.
* This is a tone and clarity preference, not a template. Use judgment about what needs explaining and what doesn't.

## Example

Don't write:

> `completeSend:210` now edits `pendingNotificationMessageId` to `[Label] incoming: ${pendingMessage}` and unconditionally `editDraftNotification (editPromptMessageId, "[corrected] ...")`

Write instead:

> Your code now updates two messages instead of one every time a draft is sent — including one that doesn't need updating in this case.

# Page & Component Architecture — split by responsibility, not size

A page that does several different things or hosts distinct tabs/sections must not hold all of that UI and state in one file.

Rules:

* Split when a page has distinct tabs, distinct concerns, or sections with their own fetches, state, and actions (for example a settings page with Profile / Reminders / Packs / Appearance). Size alone is not the trigger; structure is.
* Each tab/section becomes its own reusable component that owns its own data: its `useState`/`useEffect`, fetch functions, and actions live inside that component. The shell page only switches which tab is shown and derives shared flags from `useSession`.
* Folder per tab/section: `src/components/<feature>/<section-name>/`
  * `SectionName.tsx` + `SectionName.module.css` side-by-side in the same folder. The component imports `import styles from "./SectionName.module.css"` — never a parent's stylesheet.
  * No `style={{...}}` inside the component (see Styling); every visual goes to a named class in that same `SectionName.module.css`.
* Mapped blocks are components: any array rendered with `.map(...)` — cards, list items, row templates — must be its own component. Define it as `function SectionCard` (or `DayCell`, `PackCard`, etc.) at the **bottom of the same `SectionName.tsx` file** and use it in the parent's map (`packs.map(p => <PackCard key={p._id} pack={p} />)`). Do not leave raw JSX inline in the map, and do not create a separate `Card.tsx` file per mapped type — the bottom-of-file co-location is the convention.

Shape to follow:

```
src/components/settings/reminders/Reminders.tsx + Reminders.module.css   // owns its own fetch + save + push opt-in
src/components/settings/packs/Packs.tsx + Packs.module.css               // owns pack list fetch + actions, PackCard at bottom
src/app/settings/page.tsx                                                // slim shell: tab buttons + {activeTab === "packs" && <Packs />} …
```

# Styling — named classes, no inline styles

* Do not use `style={{ ... }}` or `style="..."` in components. New code must never add one.
* Every visual rule is a named class in the `*.module.css` file that sits next to its component. Use `className={styles.myClass}` and the design tokens from `src/styles/tokens.css` (`var(--...)`). Never hard-code colors, spacing, or radii that a token already covers.
* Don't write long CSS blocks in one line like

```css
.dayLabel { display: block; font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
```

Instead format all CSS rules with standard multiline expansion (one property per line), like:

```css
.dayLabel {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

# Reusable Logic — hooks vs colocated

* If a function/parse/normalize/fetch is used by two or more components, extract it to `src/hooks/useX.ts`.
* If it is used by only one tab/section, keep it colocated inside that section's component. Do not create a hook file by default when there is no cross-component reuse.

# Consolidation — one definition, many consumers

When the same branching, validation, or parsing appears in two or more API routes or components, consolidate it. Do not copy the same request-parse → validate → DB → respond logic across routes.

* **Where it lives:**
  * `src/lib/*` is server-only business logic (DB, auth, env, services). Start every file with `import "server-only"` and use `void Model;` for every Mongoose model the file touches.
  * `src/lib/shared/*` is the one exception: pure, framework-free code that both client and server need (date helpers, cycle calculations, config, zod schemas). It must not import server-only code or touch the database.
  * `src/hooks/*` is client/reusable React logic. Do not put server code in hooks.
  * `src/client/*` is client-only, non-React code: the typed API wrapper, the mock layer, and small pure UI helpers (for example calendar grid math). Never import server-only code from it.
  * `src/types/*` is the type source of truth — never re-declare a type that already exists there.
  * `src/store/*` is cross-cutting UI state only.
* Keep extraction separate from writing. Reading and validating a request body is one helper; creating or updating records is another. Do not merge them into one God file.
* **Types follow schemas, schemas follow product:** `src/types/X` and `src/models/X` must agree. Model interfaces do `Omit<SharedType, ids>` and re-add `Types.ObjectId` forms. Reuse canonical types instead of redefining them in another file; alias when needed. Embedded Mongoose sub-schemas are the DB contract.
* **Legacy fields:** keep old fields as `field?: type` and map them in a normalizer for one release, then delete schema + type + all call sites together in the next PR. Do not delete a field from just one layer.

**Checklist for cross-file rewrites:**

1. Search all names first (for example `rg "PillLog"`, `rg "activeDays"`). List every file that reads or writes the shape.
2. Update type (`src/types`) → model/schema (`src/models`) → lib helper (`src/lib`) → routes (zod parse + consistent error handling) → components. Keep `any` out — use `unknown` + `Array.isArray`/`typeof` narrowing.
3. Replace inline fallbacks and empty objects with a shared one. Throw a typed error from `src/lib/*` and handle its `status` in each route's `catch` before the generic `500`.
4. Run `npx tsc --noEmit` and `npx eslint` on changed files. Keep `any` and unused model imports out.

# Global State — Zustand stores

Planned stores follow this shape: `src/store/useThemeStore.ts`, `useAlertStore.ts`, `usePackStore.ts`, `useLogStore.ts`.

* State that is read or mutated from multiple pages/components (packs, logs, theme, alerts, anything truly cross-cutting) goes in a Zustand store at `src/store/useXStore.ts` via `import { create } from 'zustand'`:

  ```ts
  interface XState { items: T[]; isLoading: boolean; error: string | null; fetchItems: () => Promise<void> }
  export const useXStore = create<XState>((set, get) => ({ items: [], ... }))
  ```

* Inside actions use `get()`/`set()` and `useAlertStore.getState().addAlert(...)` for user-visible errors. Consumers select with `useXStore(s => s.items)`.

# Product rules

* "Missed" is never stored. It is worked out on the fly: a past active-pill day with no log. Placebo days are never missed.
* Past days can be logged late; logging a missed day clears its red state.
* Missed days use the light-red token in every theme.
* This app gives no medical advice. Do not add copy about what to do after a missed pill.