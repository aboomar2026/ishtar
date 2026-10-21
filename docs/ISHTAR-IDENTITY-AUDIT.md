# ISHTAR — repository identity audit

Date: 2026-10-21. Follow-up to Phase 4 after the inherited README was found to still describe the former store.

## Corrected

- Rewrote the root README around ISHTAR, its actual implementation status, setup, variables, routes and remaining QA. Removed the broken `docs/BRAND_PROFILES.md` reference and unsupported claims that ISHTAR runtime checks had passed.
- Renamed the package and both lockfile root names to `ishtar-storefront`; changed the example local database name to `ishtar` without changing any real connection.
- Made ISHTAR the fallback brand when the brand variable is absent or unrecognized. Explicit alternative profile selections remain supported.
- Made seed admin/product/banner branding use the active profile. Removed the inherited free-delivery threshold promise from demo promo copy. The seed was not executed, and existing database records were not updated.
- Made CSV filenames use the active brand key and Telegram test copy / demo banner alternative text use active-brand copy. The Telegram test script was not executed.
- Isolated ISHTAR browser cart, shipping and recent orders under its own namespace. Kept the four original profiles' existing storage keys. Old demo carts/addresses are not silently imported into ISHTAR.
- New ISHTAR demo-media public IDs use `ishtar/demo/`. Other profiles keep their prior public IDs, and local-source path handling still recognizes legacy IDs. Existing media URLs/database rows were not migrated or deleted.
- Replaced the old store name embedded in all ten demo-product SVGs with `ISHTAR DEMO`. New demo SKUs use an ISHTAR prefix.
- New ISHTAR order IDs use `ISHTAR-`; their invoice IDs retain that namespace to avoid collisions with existing legacy invoices on the same day. Existing orders/invoices/SKUs are not rewritten, and tracking still accepts historical IDs. Removed the legacy tracking placeholder.
- Replaced the generic app icon with the official ISHTAR favicon and linked the existing ISHTAR web manifest in document metadata.
- Retitled inherited QA notes for the current repository and labeled them as inherited, unverified baseline material. Added explicit historical-state notes to the Phase 2–4 reports.
- Marked the old root content-update script as Saad-only and made it refuse other profile selections. It is not an ISHTAR migration and was not run.

## Remaining old names — intentional

The full tracked text tree was searched, including package metadata, scripts, seed content, documentation, environment examples and SVG text. Old names remain only in:

- Preserved alternative brand profiles and their assets, selectors and registry aliases.
- Compatibility branches for browser storage, existing Cloudinary IDs and legacy order/invoice identifiers.
- The explicitly guarded legacy Saad data utility.
- Historical phase notes and documentation explaining those retained compatibility areas.

Removing these references blindly would damage the retained multi-brand support or existing media/storage compatibility. They are not the current store identity.

## Verification

- Existing dependency-free brand check: **28/28 pass**.
- Parsed package/lockfile metadata and confirmed all three project names match.
- Exercised the storage helper with five mocked brand selections: ISHTAR keys are separate; all four existing profiles retain their original keys.
- Exercised new/legacy order and invoice numbering with mocked brand selections, including distinct invoice namespaces.
- Checked that alternative brand-profile files and assets were not modified.
- Checked the source diff for whitespace issues with CRLF line endings accepted.

App startup, TypeScript, lint, build, rendered metadata, browser/functional testing and print previews remain deferred. This audit is not production acceptance. No real database, media account, Telegram message or deployment was changed.
