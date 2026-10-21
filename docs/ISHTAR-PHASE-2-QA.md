# ISHTAR Phase 2 — Verification checkpoint (2026-10-21)

> Historical phase snapshot. The follow-up identity audit now defaults the resolver to `ishtar`; earlier references to the `saad` fallback describe the previous state.

## Confirmed
- Independent static brand integrity audit: **28/28 PASS**.
- Checks cover brand registration, runtime key wiring, RTL root document, dynamic favicon/theme-color wiring, intended logo variants, approved palette presence, referenced logo asset existence, and missing sample phone number.
- Repeat with `npm run brand:check` (or `node scripts/check-ishtar-brand.mjs` without installing dependencies).

## Blocked / not verified
- `npm ci --offline --ignore-scripts --no-audit --no-fund`: **BLOCKED**, uncached `zod-validation-error@4.0.2` tarball.
- Normal `npm ci` attempted but exceeded the available command timeout: **BLOCKED**.
- TypeScript, lint, production build, Prisma generate and browser-based QA: **NOT TESTED** because dependencies could not be installed.
- No live database or safe test credentials available. Checkout, tracking, admin, invoice, packing slip workflows **NOT TESTED**.

## Important deployment setup
- Existing brand resolver falls back to `saad` when `NEXT_PUBLIC_STORE_BRAND` is not supplied. Set `NEXT_PUBLIC_STORE_BRAND=ishtar` in the intended development/hosting environment. Do not assume the example env file activates the brand in production.
- The approved kit does not specify application font licenses. Current font pairing is provisional and needs visual QA.

## Next practical steps
1. On a machine with package registry access: `npm ci`, `npm run db:generate`, `npm run brand:check`, `npm run typecheck`, `npm run lint`, `npm run build`.
2. Use an isolated nonproduction database with safe fixtures and test storefront/admin functional flows.
3. Capture mobile and desktop screenshots and inspect visual contrast, typography, layout overflow, product gallery and admin tables.
4. Correct only demonstrated defects, re-run checks, and approve deployment separately.

No production data was modified. No deployment, commit or push performed.
