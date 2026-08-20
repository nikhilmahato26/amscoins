# Community Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Community section to the authenticated client app where a signed-in user can open a page and tap through to join the ASM Coins Instagram group, WhatsApp channel, and Telegram group.

**Architecture:** The three community URLs are supplied at build time via `VITE_`-prefixed environment variables (matching how the client already reads config through `import.meta.env`). A small `config/community.ts` module reads and normalizes them (mirroring the existing `config/payment.ts` derive/isConfigured pattern). A new lazy-loaded, auth-gated `CommunityPage` renders one card per channel, hiding any channel whose URL is unset. The page is reached from a new `/app/community` route and a new entry in the single-source nav (`navLinks.ts`), which both the desktop `SideNav` and mobile drawer consume automatically.

**Tech Stack:** React 19, Vite 8, TypeScript 6 (strict, `verbatimModuleSyntax` → `import type`), Tailwind 3 with the project's `asm-*` design tokens, `framer-motion`, `lucide-react`, `react-router` 7.

## Global Constraints

- Run all frontend commands from `client/` (paths below are relative to `client/`). — from `amscoins/CLAUDE.md`
- Import via the `@/` alias (`@/*` → `client/src/*`); no deep relative paths. — from `amscoins/CLAUDE.md`
- TypeScript strict flags are on: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`. Use `import type` for type-only imports. — from `amscoins/CLAUDE.md`
- Mobile-first: design at a **375px base**, then scale up. — from `amscoins/CLAUDE.md`
- Protected app routes MUST be wrapped in `RequireAuth role="user"`; do not bypass it. — from `amscoins/CLAUDE.md`
- Task 0 adds **Vitest + Testing Library + jsdom** to `client/`. From Task 2 onward, logic and component tasks are test-driven (write failing test → run `npm run test` → implement → green). Icon/route/nav wiring tasks that Vitest cannot meaningfully assert use `npm run build` (type-check) + `npm run lint` + a manual dev-server check. — decided for this plan.
- Community links are configured in env, never hard-coded in source. — from the feature request.
- Vitest test files live next to the code they test as `*.test.ts` / `*.test.tsx`; the Playwright e2e suite stays in `tests-e2e/` and MUST be excluded from the Vitest run. — verified in `client/playwright.config.ts` (`testDir: 'tests-e2e'`).

---

### Task 0: Install and configure Vitest + Testing Library

**Files:**
- Modify: `client/package.json` (add dev deps + `test` / `test:run` scripts)
- Create: `client/vitest.config.ts`
- Create: `client/src/test/setup.ts`
- Modify: `client/tsconfig.app.json` (add `vitest/globals` + jest-dom types)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `npm run test` — runs Vitest in watch mode; `npm run test:run` — single CI-style pass.
  - A jsdom test environment with `@testing-library/jest-dom` matchers auto-registered, the `@` alias resolved, and `tests-e2e/` excluded.
  - Later tasks rely on being able to author `*.test.ts(x)` files beside source and run them with `npm run test:run`.

- [ ] **Step 1: Install dev dependencies**

Run from `client/`:
```bash
cd client && npm install -D vitest@^3 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14
```
Expected: installs complete with no peer-dependency errors (React 19 is supported by `@testing-library/react` v16).

- [ ] **Step 2: Add test scripts to `client/package.json`**

In the `"scripts"` block, add these two entries (keep the existing `dev`/`build`/`lint`/`preview`/`e2e` scripts unchanged):
```json
    "test": "vitest",
    "test:run": "vitest run"
```

- [ ] **Step 3: Create the Vitest config**

Create `client/vitest.config.ts`. It reuses the React plugin and `@` alias from `vite.config.ts`, runs in jsdom, loads the setup file, and excludes the Playwright e2e directory:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'tests-e2e'],
    css: false,
  },
})
```

- [ ] **Step 4: Create the test setup file**

Create `client/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Register test types with TypeScript**

In `client/tsconfig.app.json`, change the `"types"` array so the test globals and jest-dom matchers type-check. Replace:
```json
    "types": ["vite/client"],
```
with:
```json
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
```

- [ ] **Step 6: Add a temporary smoke test to prove the harness works**

Create `client/src/test/harness.test.ts`:
```ts
import { render, screen } from '@testing-library/react'

test('vitest + jsdom + jest-dom are wired up', () => {
  render(<span>community harness ok</span>)
  expect(screen.getByText('community harness ok')).toBeInTheDocument()
})
```
Note: rename this file to `harness.test.tsx` since it contains JSX. (Create it as `client/src/test/harness.test.tsx`.)

- [ ] **Step 7: Run the smoke test — expect PASS**

Run: `cd client && npm run test:run`
Expected: 1 passed. If it fails on JSX parsing, confirm the file extension is `.tsx`; if it fails on `toBeInTheDocument`, confirm Step 4 setup file and Step 5 types.

- [ ] **Step 8: Delete the smoke test**

```bash
rm client/src/test/harness.test.tsx
```
The setup file (`src/test/setup.ts`) stays — real tests need it.

- [ ] **Step 9: Verify build + lint still pass**

Run: `cd client && npm run build && npm run lint`
Expected: PASS (the new config/setup files type-check and lint clean).

- [ ] **Step 10: Commit**

```bash
git add client/package.json client/package-lock.json client/vitest.config.ts client/src/test/setup.ts client/tsconfig.app.json
git commit -m "chore(test): add Vitest + Testing Library harness to client"
```

---

### Task 1: Add community env variables

**Files:**
- Modify: `client/.env`
- Modify: `client/.env.example`

**Interfaces:**
- Consumes: nothing.
- Produces: three build-time env keys read later by `config/community.ts`:
  - `VITE_COMMUNITY_INSTAGRAM_URL` — full https URL to the Instagram group/profile.
  - `VITE_COMMUNITY_WHATSAPP_URL` — full https URL to the WhatsApp channel/invite.
  - `VITE_COMMUNITY_TELEGRAM_URL` — full https URL to the Telegram group invite.

- [ ] **Step 1: Append the three keys to `client/.env`**

Add these lines to the end of `client/.env` (leave the existing `VITE_API_URL` line untouched). Replace the placeholder URLs with the real community links when known:

```dotenv

# ── Community links ──────────────────────────────────────────────────────────
# Full https URLs. Any left blank hides that channel's card on the Community page.
VITE_COMMUNITY_INSTAGRAM_URL=https://instagram.com/asmcoins
VITE_COMMUNITY_WHATSAPP_URL=https://whatsapp.com/channel/xxxxxxxx
VITE_COMMUNITY_TELEGRAM_URL=https://t.me/asmcoins
```

- [ ] **Step 2: Append the same keys (blank values) to `client/.env.example`**

`.env.example` is the committed template, so values stay empty:

```dotenv

# ── Community links ──────────────────────────────────────────────────────────
# Full https URLs. Any left blank hides that channel's card on the Community page.
VITE_COMMUNITY_INSTAGRAM_URL=
VITE_COMMUNITY_WHATSAPP_URL=
VITE_COMMUNITY_TELEGRAM_URL=
```

- [ ] **Step 3: Verify Vite exposes the vars**

Run: `cd client && npm run dev`
Then in the browser devtools console on the running app, evaluate:
```js
import.meta.env.VITE_COMMUNITY_TELEGRAM_URL
```
Expected: prints the Telegram URL string you set (not `undefined`). Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add client/.env.example
git commit -m "feat(community): add community link env vars"
```
Note: `client/.env` is git-ignored and is not committed — only `.env.example` is tracked.

---

### Task 2: Community config module

**Files:**
- Create: `client/src/config/community.ts`
- Test: `client/src/config/community.test.ts`

**Interfaces:**
- Consumes: `import.meta.env.VITE_COMMUNITY_INSTAGRAM_URL`, `VITE_COMMUNITY_WHATSAPP_URL`, `VITE_COMMUNITY_TELEGRAM_URL` from Task 1.
- Produces:
  - `type CommunityChannelId = 'instagram' | 'whatsapp' | 'telegram'`
  - `interface CommunityChannel { id: CommunityChannelId; label: string; description: string; url: string }`
  - `function communityChannels(): CommunityChannel[]` — returns only channels whose env URL is a non-empty, trimmed `http(s)` string, in the fixed order Instagram → WhatsApp → Telegram.

**TDD note:** `communityChannels()` reads `import.meta.env` at call time, so the test uses `vi.stubEnv()` to control the three vars and `vi.unstubAllEnvs()` in a cleanup hook. Vitest replaces `import.meta.env.VITE_*` values set via `stubEnv`.

- [ ] **Step 1: Write the failing test**

Create `client/src/config/community.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import { communityChannels } from './community'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('communityChannels', () => {
  it('returns configured channels in Instagram → WhatsApp → Telegram order', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', 'https://instagram.com/asm')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', 'https://whatsapp.com/channel/x')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/asm')

    const result = communityChannels()

    expect(result.map((c) => c.id)).toEqual(['instagram', 'whatsapp', 'telegram'])
    expect(result[0].url).toBe('https://instagram.com/asm')
  })

  it('omits channels whose URL is empty or whitespace', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', '')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', '   ')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/asm')

    expect(communityChannels().map((c) => c.id)).toEqual(['telegram'])
  })

  it('omits channels whose URL is not http(s)', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', 'javascript:alert(1)')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', 'instagram.com/no-scheme')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/asm')

    expect(communityChannels().map((c) => c.id)).toEqual(['telegram'])
  })

  it('returns an empty array when nothing is configured', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', '')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', '')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', '')

    expect(communityChannels()).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npm run test:run -- community`
Expected: FAIL — Vitest cannot resolve `./community` (module does not exist yet).

- [ ] **Step 3: Write the config module**

Create `client/src/config/community.ts`:

```ts
/**
 * Community channel config, sourced from build-time env (VITE_COMMUNITY_*).
 * Mirrors the derive/isConfigured shape of config/payment.ts: env is the source
 * of truth, and unset/invalid links are simply omitted so the UI never renders
 * a dead card.
 *
 * Env is read inside communityChannels() (not at module load) so the value is
 * always current — this also lets tests drive it with vi.stubEnv().
 */

export type CommunityChannelId = 'instagram' | 'whatsapp' | 'telegram'

export interface CommunityChannel {
  id: CommunityChannelId
  label: string
  description: string
  url: string
}

/** Accepts only a trimmed, non-empty http(s) URL; returns '' otherwise. */
function cleanUrl(raw: string | undefined): string {
  const v = (raw ?? '').trim()
  return /^https?:\/\//i.test(v) ? v : ''
}

const CHANNEL_META: Record<
  CommunityChannelId,
  { label: string; description: string; envKey: string }
> = {
  instagram: {
    label: 'Instagram',
    description: 'Follow for updates, wins and announcements.',
    envKey: 'VITE_COMMUNITY_INSTAGRAM_URL',
  },
  whatsapp: {
    label: 'WhatsApp Channel',
    description: 'Get instant alerts on your phone.',
    envKey: 'VITE_COMMUNITY_WHATSAPP_URL',
  },
  telegram: {
    label: 'Telegram Group',
    description: 'Chat with the community and the team.',
    envKey: 'VITE_COMMUNITY_TELEGRAM_URL',
  },
}

const ORDER: readonly CommunityChannelId[] = ['instagram', 'whatsapp', 'telegram']

/** The configured channels, in display order. Unset/invalid links are omitted. */
export function communityChannels(): CommunityChannel[] {
  const env = import.meta.env as Record<string, string | undefined>
  return ORDER.flatMap((id) => {
    const meta = CHANNEL_META[id]
    const url = cleanUrl(env[meta.envKey])
    if (!url) return []
    return [{ id, label: meta.label, description: meta.description, url }]
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npm run test:run -- community`
Expected: PASS — 4 passed (all `communityChannels` cases green).

- [ ] **Step 5: Type-check + lint**

Run: `cd client && npm run build && npm run lint`
Expected: PASS (no `tsc` or oxlint errors for `src/config/community.ts` or its test).

- [ ] **Step 6: Commit**

```bash
git add client/src/config/community.ts client/src/config/community.test.ts
git commit -m "feat(community): add community channel config module"
```

---

### Task 3: Instagram brand icon

**Files:**
- Modify: `client/src/components/app/icons.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `function InstagramIcon({ className }: { className?: string }): JSX.Element` — exported alongside the existing `WhatsAppIcon` and `TelegramIcon` (both already in this file and reused as-is).

- [ ] **Step 1: Append `InstagramIcon` to `icons.tsx`**

`WhatsAppIcon` and `TelegramIcon` already exist in this file — do not duplicate them. Add only the Instagram glyph after the existing `TelegramIcon` export:

```tsx
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
```

- [ ] **Step 2: Type-check + lint**

Run: `cd client && npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/app/icons.tsx
git commit -m "feat(community): add Instagram brand icon"
```

---

### Task 4: Community page

**Files:**
- Create: `client/src/pages/app/CommunityPage.tsx`
- Test: `client/src/pages/app/CommunityPage.test.tsx`

**Interfaces:**
- Consumes: `communityChannels()` and type `CommunityChannelId` from `@/config/community` (Task 2); `WhatsAppIcon`, `TelegramIcon`, `InstagramIcon` from `@/components/app/icons` (Task 3); `AppShell` from `@/components/app/AppShell`.
- Produces: `export function CommunityPage(): JSX.Element` — consumed by the route in Task 5.

**TDD note:** the test mocks `@/components/app/AppShell` to a pass-through wrapper so the page renders without pulling in auth/router/query context, and stubs the three env vars per case to drive `communityChannels()`.

- [ ] **Step 1: Write the failing test**

Create `client/src/pages/app/CommunityPage.test.tsx`:
```tsx
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CommunityPage } from './CommunityPage'

// Isolate the page from AppShell's auth/router/query dependencies.
vi.mock('@/components/app/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('CommunityPage', () => {
  it('renders a join link per configured channel pointing at its env URL', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', 'https://instagram.com/asm')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', 'https://whatsapp.com/channel/x')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/asm')

    render(<CommunityPage />)

    expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute('href', 'https://instagram.com/asm')
    expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', 'https://whatsapp.com/channel/x')
    expect(screen.getByRole('link', { name: /telegram/i })).toHaveAttribute('href', 'https://t.me/asm')
  })

  it('opens each link in a new tab with a safe rel', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', '')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', '')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/asm')

    render(<CommunityPage />)

    const link = screen.getByRole('link', { name: /telegram/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('shows an empty state and no links when nothing is configured', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', '')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', '')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', '')

    render(<CommunityPage />)

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npm run test:run -- CommunityPage`
Expected: FAIL — Vitest cannot resolve `./CommunityPage` (the component does not exist yet).

- [ ] **Step 3: Write the page component**

Create `client/src/pages/app/CommunityPage.tsx`. This mirrors the `AppShell` + framer-motion + `asm-*` token pattern used by `SupportPage.tsx`:

```tsx
import { motion } from 'framer-motion'
import { ExternalLink, Users } from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from '@/components/app/icons'
import { communityChannels } from '@/config/community'
import type { CommunityChannelId } from '@/config/community'

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

const ICON: Record<CommunityChannelId, (props: { className?: string }) => JSX.Element> = {
  instagram: InstagramIcon,
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
}

// Per-channel accent classes (bg tint + icon color), kept inline so no new tokens are needed.
const ACCENT: Record<CommunityChannelId, string> = {
  instagram: 'bg-pink-50 text-pink-600',
  whatsapp: 'bg-asm-green-tint text-asm-greenInk',
  telegram: 'bg-asm-blue-tint text-asm-blue',
}

export function CommunityPage() {
  const channels = communityChannels()

  return (
    <AppShell backTo="/app">
      <motion.div className="flex flex-col gap-5" variants={container} initial="hidden" animate="visible">

        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-asm-blue-tint text-asm-blue">
            <Users className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-[18px] font-extrabold tracking-tight text-asm-navy">Community</h1>
            <p className="text-[12px] text-asm-body">Join our channels to stay in the loop and connect.</p>
          </div>
        </motion.div>

        {/* Channel cards */}
        {channels.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white px-5 py-10 text-center shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]"
          >
            <Users className="size-8 text-asm-muted/40" aria-hidden />
            <p className="text-[13px] font-semibold text-asm-navy">Community links coming soon</p>
            <p className="text-[12px] text-asm-body">Check back shortly — we're setting up our channels.</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {channels.map((c) => {
              const Icon = ICON[c.id]
              return (
                <motion.a
                  key={c.id}
                  variants={fadeUp}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)] transition-shadow hover:shadow-[0_6px_20px_-6px_rgba(16,42,92,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
                >
                  <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${ACCENT[c.id]}`}>
                    <Icon className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-asm-navy">{c.label}</span>
                    <span className="block truncate text-[12px] text-asm-body">{c.description}</span>
                  </span>
                  <ExternalLink className="size-4 shrink-0 text-asm-muted transition-colors group-hover:text-asm-blue" aria-hidden />
                </motion.a>
              )
            })}
          </div>
        )}

      </motion.div>
    </AppShell>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npm run test:run -- CommunityPage`
Expected: PASS — 3 passed (links, new-tab rel, empty state).

- [ ] **Step 5: Type-check + lint**

Run: `cd client && npm run build && npm run lint`
Expected: PASS. (Confirms all imports resolve and JSX types are valid.)

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/app/CommunityPage.tsx client/src/pages/app/CommunityPage.test.tsx
git commit -m "feat(community): add Community page"
```

---

### Task 5: Register the route

**Files:**
- Modify: `client/src/App.tsx`

**Interfaces:**
- Consumes: `CommunityPage` from `./pages/app/CommunityPage` (Task 4).
- Produces: an auth-gated route at path `/app/community`.

- [ ] **Step 1: Add the lazy import**

In `client/src/App.tsx`, add this next to the other `pages/app` lazy imports (e.g. right after the `SupportPage` lazy block near line 58-60):

```tsx
const CommunityPage = lazy(() =>
  import('./pages/app/CommunityPage').then((m) => ({ default: m.CommunityPage }))
)
```

- [ ] **Step 2: Add the route**

Add this `Route` **before** the catch-all `path="/app/*"` route (which currently sits around line 239). Order matters: the `/app/*` placeholder would otherwise swallow `/app/community`.

```tsx
        <Route
          path="/app/community"
          element={
            <RequireAuth role="user">
              <CommunityPage />
            </RequireAuth>
          }
        />
```

- [ ] **Step 3: Type-check + lint**

Run: `cd client && npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual route check**

Run: `cd client && npm run dev`
Log in as a user, then navigate to `/app/community`.
Expected: the Community page renders with a card per configured channel; each card opens the correct link in a new tab. Stop the dev server after checking.

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat(community): register /app/community route"
```

---

### Task 6: Add Community to primary navigation

**Files:**
- Modify: `client/src/components/app/navLinks.ts`

**Interfaces:**
- Consumes: the `/app/community` route from Task 5.
- Produces: a new `AppNavLink` entry surfaced automatically by `SideNav` (desktop rail) and the `AppShell` mobile drawer, which both map over `APP_NAV_LINKS`.

- [ ] **Step 1: Import the `Users` icon and add the nav entry**

`navLinks.ts` already imports `Users` from `lucide-react` (used by the Referral link) — reuse it, do not add a duplicate import. Add the Community entry to the `APP_NAV_LINKS` array, placed just before the `Support` entry:

```ts
  { to: '/app/community', label: 'Community', Icon: Users, end: false },
  { to: '/app/support', label: 'Support', Icon: LifeBuoy, end: false },
```

Note: both `Community` and `Referral` use the `Users` glyph, which is acceptable — they are distinct labels and destinations. If a distinct icon is preferred, swap `Community` to `MessagesSquare` and add it to the existing `lucide-react` import line at the top of the file.

- [ ] **Step 2: Type-check + lint**

Run: `cd client && npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 3: Manual nav check**

Run: `cd client && npm run dev`
Expected: On desktop (lg+), the `SideNav` rail shows a "Community" link; on mobile, the hamburger drawer shows it too. Clicking it lands on `/app/community` and marks the link active. Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/app/navLinks.ts
git commit -m "feat(community): add Community to app navigation"
```

---

## Self-Review

**Spec coverage:**
- "user will see a community section" → Task 4 (page) + Task 6 (nav entry to reach it). ✅
- "when the user opens it it should have the instagram grp, whatsapp channel and telegram grp link" → Task 4 renders one card per channel with Instagram/WhatsApp/Telegram icons + links. ✅
- "so that the user can join" → cards are anchors opening the join URL in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). ✅
- "save the links of community in env" → Task 1 (`.env` + `.env.example`), read via `config/community.ts` in Task 2; no URLs hard-coded in components. ✅

**Placeholder scan:** No TBD/TODO/"add validation"/"handle edge cases" — every code step ships complete code. URL validation is concrete (`cleanUrl` regex). ✅

**Type consistency:** `CommunityChannelId` / `CommunityChannel` / `communityChannels()` are defined in Task 2 and consumed with identical names in Task 4. `InstagramIcon` defined in Task 3, imported in Task 4. `CommunityPage` exported in Task 4, lazy-imported in Task 5. Env key names (`VITE_COMMUNITY_INSTAGRAM_URL` / `_WHATSAPP_URL` / `_TELEGRAM_URL`) match between Task 1 and Task 2. ✅

**Edge cases handled:** unset/invalid env URLs are dropped by `communityChannels()`; the page shows a "coming soon" empty state when none are configured (Task 4). Route ordering vs. the `/app/*` catch-all is called out (Task 5, Step 2).
