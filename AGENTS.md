# AGENTS.md — sevam-web

## Build & Run

- `npm run dev` — start dev server (Next.js 16, App Router)
- `npm run build` — production build
- `npm run lint` — run ESLint (flat config, next/core-web-vitals + typescript)
- No test runner configured yet.

## Architecture

- **Next.js 16 App Router** with React 19 and TypeScript (strict mode).
- Route groups: `app/(customer)/`, `app/(worker)/`, `app/(admin)/` for role-based pages.
- `server/actions/` — server actions; `server/api/` — API routes.
- `lib/db/` — Prisma client (PostgreSQL via Supabase); `lib/hooks/` — custom hooks; `lib/utils/` — shared utilities.
- `components/` — reusable UI (`ui/`, `forms/`, `maps/`). Uses Radix UI, CVA, clsx, tailwind-merge.
- **Auth**: Custom Phone OTP + JWT (jose, HS256). Server actions mint access (15 min) + refresh (30 day) tokens stored in HttpOnly cookies (`sevam_session`, `sevam_refresh`). No Supabase auth SDK. **Payments**: Razorpay. **Maps**: `mapbox-gl`. **SMS**: Twilio. **Push**: Firebase FCM HTTP v1.
- **State**: Zustand (`skipHydration: true`). **Validation**: Zod. **Dates**: date-fns.

## Code Style

- TypeScript strict. Use `import type` for type-only imports.
- Tailwind CSS v4 for styling; combine classes with `cn()` (clsx + tailwind-merge).
- React Server Components by default; add `"use client"` only when needed.
- Path alias `@/*` maps to `./` (repo root, not `./src/*`). Named exports for components; default export for pages/layouts.
- ESLint flat config (`eslint.config.mjs`); no Prettier — rely on editor formatting.
