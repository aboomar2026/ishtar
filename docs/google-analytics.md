# Ishtar Google Analytics 4

Property: Ishtar Store — ishtar.live. Account owner: the existing Ishtar Google account.
Web stream: Ishtar Store Web (16282145321). Measurement ID: G-1FCRNEXQY4.
Reporting timezone: Gaza. Currency: ILS.

Set NEXT_PUBLIC_GA_MEASUREMENT_ID in Vercel Production only. The storefront layout passes this ID only when VERCEL_ENV=production. The tag sends data only from ishtar.live/www.ishtar.live automatically with analytics_storage, ad_storage, ad_user_data and ad_personalization permanently denied. Admin pages and Vercel previews do not initialize tracking.

Enhanced Measurement is OFF in GA4. Keep it off: the integration sends page_view manually for App Router navigation and explicit ecommerce events. Turning on automatic history/form/outbound tracking risks duplicates and sensitive query-string or WhatsApp-link collection.

Events: page_view, view_item, add_to_cart, begin_checkout, purchase. Purchase means a successfully placed COD order, not paid/delivered revenue. It is sent in the confirmed checkout path, not when a receipt URL is visited. transaction_id is the order number for deduplication. Order recovery does not retrospectively send an event for an unrelated cart; blocked trackers, cookieless reporting limitations and interrupted sessions can cause undercounting. The operational orders database remains authoritative.

Only product/variant IDs, quantities, prices and the purchase total are mapped into commerce events. Never forward a checkout form, shipping details, customer fields, free-text search or receipt objects. Page URLs omit arbitrary query parameters and fragments. Only restricted UTM campaign values are retained; order/phone/email query parameters are removed. Automatic Google Signals and advertising personalization are disabled.

Privacy disclosure: /privacy, linked in the footer. No consent banner or implicit consent grant. The Google tag loads only after denied defaults are queued and sends cookieless measurements. No analytics consent choice is read or written in localStorage. Existing GA cookies are not read under denied storage; visitors may remove old cookies through browser settings. No URL passthrough or Google Signals. This does not guarantee exact visitor/session counts: cookieless pings support basic measurement/modeling, and modeled reports have Google eligibility thresholds. Operational order records remain authoritative.

For Instagram campaigns, use non-personal labels such as:
https://www.ishtar.live/?utm_source=instagram&utm_medium=social&utm_campaign=november_launch

Validation before enabling: analytics unit tests, checkout-recovery and quick-view regressions; TypeScript, focused ESLint and production Next build. Live validation: verify no consent UI, inspect denied consent and absence of GA cookies, then verify page/product events are sent. Never create a real order just to verify an analytics purchase event.
