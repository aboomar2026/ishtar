# ISHTAR 2.0 — Design system audit

23 October 2026. Preserve approved identity and the existing component system. Browser evidence is limited to 1363×936 Chromium; all other viewport/state items below are standards or pending checks, not screenshots of tested behavior.

## Current foundations

| Role | Existing source / value | Direction |
| --- | --- | --- |
| Primary / text | `src/config/brands/ishtar.ts`: `#522B3A` / `#2D2428` | Keep; primary actions use burgundy |
| Background / surface / section | `#FBF5ED` / `#FFFFFF` / `#F5EAE6` | Warm canvas, clear elevated cards |
| Accent / blush / border | `#C79A83` / `#D9B5B4` / `#DFCFCC` | Accent is decoration, not low-contrast body copy |
| Muted / danger / success | `#695760` / `#9F3B42` / `#286647` | Pair status colors with text/icon, not color alone |
| Type | `src/app/layout.tsx`: Tajawal 400/500/700/800/900; El Messiri 400/500/600/700, `display:swap` | Retain Arabic typography; measure font cost before removing weights or changing families |
| Icons | `Icons.tsx`, Phosphor React 2.1.7, including server-compatible adapter | Retain family; target 20–24px main controls, 16–18px supporting icons within adequate targets |
| Fields | `controls.css` shared border/focus/invalid/disabled/autofill/read-only rules | Composite shell owns search ring; avoid another inner rectangle |
| Responsive | `ishtar.css` safe-area bottom padding/nav/sticky CTA; `hero.css` container-relative type/layout | Test actual computed geometry; CSS presence alone is not responsive acceptance |
| Motion | Motion + Embla + decorative SVG; reduced-motion/visibility checks | Keep primary content stable and readable; user can stop nonessential effects |

Proposed reusable scale: spacing 4/8/12/16/24/32/48/64px, fields/cards 12–20px radii, pills for search/status only, explicit semantic overlay/focus/disabled tokens. This is a proposed consolidation, not a token rewrite performed in the audit. Contrast must be measured for actual foreground/background combinations before signoff (normal text 4.5:1, large text 3:1 as applicable).

## Page-by-page review

| Area | Current evidence | Pending work / acceptance |
| --- | --- | --- |
| Header/search | Search focus sample has no inner border/shadow; hero CTA arrow and cart use coherent SVG | Keyboard focus, clear button at narrow width, Android autofill, mobile keyboard and sticky collision |
| Home/hero | Layered photo composition, product rail, real four-slide carousel, effect toggle and truthful benefits | Persistent pause on keyboard content interaction for layout rotation; distinguish layout vs slide controls; measured mobile height/CLS |
| Listings | Product image uses fit with fallback; single-variant quick add, otherwise details navigation | 320px card density, long Arabic titles/prices, sale/new/stock overlap, lazy image failure, no Quick View yet |
| Product | Real sample gallery loaded; zoom Escape restores focus; neutral-photo notice explicitly distinguishes color | Real image-to-variant associations; thumb hit area/swipe; care/size content quality; sticky CTA and 200% text |
| Cart/checkout | Existing current-price/stock and client recovery tests pass | Full browser validation focus, errors, blocked storage/network, remove/quantity states; no new payment/shipping design |
| Admin | Shared icons/fields and DB-backed dashboard already exist | Browser login/CRUD/upload/errors/permissions, table narrow width, form unsaved warnings, notification placement |
| Footer | Missing contact/social blocks are conditionally hidden | Owner-approved support/returns/privacy details; no invented copy |
| Print | SSR draft/final/packing content for 50 synthetic rows passes | A4 PDF pagination, repeated headers/footers, clipping and physical printer acceptance |

## Component state matrix

Use a private/local state harness, not a public `/hero-preview` test route. For each variant capture RTL desktop/mobile and keyboard states.

| Family | Required states / checks |
| --- | --- |
| Input/search/textarea/select | Empty/filled, hover, focus-visible, required, invalid/native validation, readonly, disabled, autofill, loading; single visible ring, clear/error text association |
| Checkbox/radio/toggle | Checked/unchecked/mixed if applicable, focus, disabled/error; adequate target and accessible selected state |
| Button/icon action | Hover/focus/press, pending/disabled/success/error, long label; no clipping or ambiguous chevron direction |
| Dialog/drawer | Open/closed/loading/error; trap focus/Escape/restore, scroll lock, keyboard reachability, no sticky overlay collision |
| Carousel/layout rotation | Manual/autoplay/focus/hover/reduced/background/out-of-view; hidden slides inert and no unrequested keyboard restart |
| Product/stock selection | Available/unavailable/stale/deleted, price change, quantity cap and add feedback; do not fake associated photo |
| Global | Forced colors, 200% text, contrast, 320/375/390/430/768/1024/1440 widths, landscape and touch |

Screenshot evidence: [preview PDP](evidence/preview-pdp-2026-10-23.jpg). The large neutral product photo is intentional `fit` behavior; owner must supply matching color photography before automatic variant switching. Do not infer every existing photo depicts the correct selected color.

No new icon library, animation library, font, 3D runtime or design-system dependency was introduced.
