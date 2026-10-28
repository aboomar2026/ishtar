# WhatsApp customer contact

Owner-confirmed number: **+970 598 079 482**, stored as `970598079482` in the Ishtar brand profile.

- Product detail: inquiry includes product name, selected SKU and public product URL when configured. Query strings, credentials and fragments are excluded.
- Cart: a general cart/checkout-help message; available even with an empty cart.
- Order confirmation: inquiry includes the confirmed order number; a generic contact remains available for missing orders.
- Tracking: generic help in the tracking form, individual contact for locally saved orders, and order-specific contact in an authenticated tracking result (existing order-number/phone check remains intact).
- Footer: visible contact button, number and WhatsApp social link are activated from the brand profile.

Uses standard `https://wa.me/NUMBER?text=...` external links. WhatsApp opens in a new tab/app and the visitor chooses whether to send. No WhatsApp Business API, paid provider, SDK, background requests or automatic messages. No customer names, phones, addresses, basket contents or tracking credentials are included in the prepared message. Existing checkout, inventory and Telegram paths are unchanged. Existing Ishtar button colors, RTL layout, focus styles and 44px minimum targets are reused.

Validation: `npm run test:whatsapp` checks number normalization, Arabic encoding, contextual messages, URL sanitization and accessible external-link markup. `npm run test:navigation` checks all entry points and footer on desktop and touch-mobile Chromium, including disposable saved/tracked orders, target sizing, overflow and console errors. External providers are intercepted; no live WhatsApp messages or production orders are sent. Physical-device app handoff and receipt at the owner's WhatsApp account require owner verification.
