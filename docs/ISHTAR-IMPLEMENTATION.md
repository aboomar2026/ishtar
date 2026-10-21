# ISHTAR — implementation and verification notes

Source: supplied `src(2).zip`; authority of live GitHub revision not verified. Original source bundle contains Git metadata, removed from deliverable.

## Added
- Registered separate `ishtar` brand profile and selected it in example environment. Set `NEXT_PUBLIC_STORE_BRAND=ishtar` in the actual deployment.
- Official SVG marks and web icons copied directly from approved Ishtar Brand Kit v1, and active favicon/apple icon sourced from profile.
- Applied exact five official kit palette swatches to their semantic roles; derived darker states, surface borders and feedback colors are UI support values, not new official identity colors.
- ISHTAR-specific logo selections for header, mobile, footer, sidebar, printing.
- Unconfirmed contact details suppressed; no imaginary WhatsApp or phone number.
- Removed misleading client-only newsletter fake-success UI only for ISHTAR.

## Known limitations
- Site uses legacy fixed RGBA/HEX decorations in a very large CSS file; a complete visual audit remains necessary for brand consistency.
- Original Tajawal and El Messiri fonts remain as readable fallback typography. Brand Kit contains no licensed font files or final font specifications.
- Live GitHub revision, database, credentials, real products, order submission and admin flows were not verified here.
- Hero/product images are data-driven and may belong to demo content; review in a safe seeded database.
- Do not deploy or run destructive seed/migration commands without authorization.

## Suggested QA
1. `npm ci` and `npm run db:generate` with a nonproduction DB.
2. `npm run typecheck`, `npm run lint`, `npm run build`.
3. Run `npm run dev`, check desktop/mobile storefront and all protected routes with safe fixtures.
4. Verify actual phone/hours/social data before adding to `ishtar.ts`.
5. Confirm site URL and current default branch before merging.
