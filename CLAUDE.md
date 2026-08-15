# AMScoins — Claude Code Guide

ASM Coins: a mobile-first, time-boxed investment app for Indian retail investors (deposit → pick plan → 36h term → UPI withdraw, admin-approved payouts). See `PRODUCT.md` for full product context.

> Run Claude from **this `amscoins/` directory** (not the parent `AMScoins/`) so `CLAUDE.md`, `.claude/`, and `.mcp.json` load and hooks fire.

## Repository layout
This is a monorepo:
- `client/` — the React 19 + Vite frontend (everything below is relative to `client/`).
- `server/` — the Node.js/Express + MongoDB backend API (own `package.json`, `.env`, tests). See `server/README.md`.

## Commands (frontend — run inside `client/`)
- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b && vite build` (type-checks, then builds)
- `npm run lint` — `oxlint`
- `npm run preview` — preview production build

## Commands (backend — run inside `server/`)
- `npm run dev` — Express API with `--watch`
- `npm test` — Jest + Supertest (in-memory Mongo)
- `npm run seed` — seed investment plans

## Stack
- **React 19** + **Vite 8**, **TypeScript 6** (strict: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` — use `import type` for type-only imports)
- **Tailwind 3** + **shadcn/ui** (style `base-nova`, base color `neutral`, CSS variables, **lucide** icons)
- **react-router 7** for routing; **react-hook-form + zod** for forms/validation
- Animation: **framer-motion**, **gsap**, **lenis**, **embla-carousel**
- Deploy: **Vercel** (SPA rewrite in `vercel.json`)

## Conventions (frontend paths are under `client/`)
- Import via the `@/` alias (`@/*` → `client/src/*`); avoid deep relative paths.
- **UI primitives**: `client/src/components/ui` (shadcn). **Feature components**: `client/src/components/{home,landing,app,sections}`. **Pages**: `client/src/pages/**`.
- Shared utils in `client/src/lib`: `utils.ts` exports `cn`; `format.ts` for formatting.
- Auth: `client/src/auth` (`AuthContext`, `RequireAuth`) + `client/src/services/authService.ts`.
- Mobile-first — design at a **375px base**, then scale up.

## Design & motion
For visual/motion work, use the installed design skills (`impeccable`, `frontend-design`, and the animation skills). Keep motion intentional and mobile-performant.

## Money flows are sensitive
Deposit, referral rewards, UPI withdrawal, payment methods, and admin payout are the sensitive surfaces. **Validate all inputs with zod; never trust client-side amounts** as source of truth. Payouts are human-approved, not automated.

## Don'ts
- Don't commit throwaway screenshot PNGs to the repo root (they're gitignored). Real assets live in `public/` and `src/assets/`.
- Don't bypass `RequireAuth` on protected routes.
- Don't hand-edit shadcn primitives in `src/components/ui` without calling it out.
