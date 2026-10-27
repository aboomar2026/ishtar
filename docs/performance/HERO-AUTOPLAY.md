# Public hero autoplay fix — 2026-10-27

The visitor-facing strip showing the current design, play/pause, next design and effect toggle is removed from the DOM and its unused CSS is deleted.

Confirmed causes in the old view: a hovered pointer paused the design timer indefinitely; focusing any hero content set playing=false permanently, even after focus left. A minimum visible fraction also gated tall mobile heroes. The timer itself was reset after each layout change. This made the minute-based cycle easy to stop silently.

The public hero now cycles classic → signature → campaign → classic every 60 seconds. The saved layout determines its starting point. Rendering normalizes legacy fixed/motion:none/autoplay:false settings to public rotation, enabled effects and campaign autoplay, without updating the database or changing profile content/media/links. The admin editor now describes the starting layout and offers calm/lively motion, rather than settings that contradict this storefront policy. Isolated editor previews remain fixed while being edited.

Mouse hover and ordinary touch focus no longer stop the design cycle. A visibly keyboard-focused link is kept stable and rotation automatically resumes when focus leaves. Hidden tabs and system reduced-motion preferences remain respected. Visible decorative effects run normally; invisible scenes/background pages still avoid unnecessary animation work. Scene and campaign visibility observers respond to any visible portion instead of a fragile percentage of a tall mobile section.

The cycle uses one stable interval, cleaned up on pause/unmount and restarted when the starting design explicitly changes. Campaign arrows/dots and its own accessible play control are preserved; they are separate from the removed design/debug strip.

Validation uses the existing production Next/PGlite/Chromium fixture harness, with no real accounts/orders/uploads/provider changes. It includes a real 61-second wait on desktop 1440×1000 and touch mobile 390×844, a moving-effect transform check, three-design loops using controlled clocks, keyboard pause/resume, absent visitor controls, and reduced-motion behavior. Existing navigation, checkout, SEO and cache regressions are also rerun. This verifies behavior, not field Web Vitals or physical-device acceptance.

Local results: hero unit/editor tests 15/15; production Chromium hero/navigation tests 15/15; SEO 7/7; performance/cache regressions 13/13. Lint, TypeScript and production build passed. The real-minute checks observed classic → signature on both foreground desktop and mobile pages; clock-driven tests verified the complete loop.

Commands:

```sh
npm run test:hero
npm run lint
npm run typecheck
npm run build
node node_modules/playwright-core/cli.js install --with-deps chromium
npm run test:navigation
npm run test:seo-integration
npm run test:performance
```
