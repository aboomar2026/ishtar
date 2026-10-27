# Reproducible baseline

Baseline source: `28a3ac37f93b553aba09ccb7847a77cd00bcbebb`. Initial production build and baseline HTTP run preceded implementation. Node 24.22.1, npm 11.9.0, Next 16.2.7, React 19.2.7, Prisma 6.19.0. Host: AMD EPYC 9V74, 9 exposed logical CPUs, approximately 10 GiB memory. Netlify config uses Node 22 and @netlify/plugin-nextjs; this lab did NOT emulate the adapter, Lambda or CDN.

Commands:

```sh
npm ci --ignore-scripts
npm run db:generate
npm run build
node scripts/performance-benchmark.mjs baseline /tmp/ishtar-performance-baseline.json
# After implementing and rebuilding, with no parallel tests/builds:
node scripts/performance-benchmark.mjs after /tmp/ishtar-performance-after.json
```

Runner always creates a fresh in-memory PGlite database and loopback socket. It uses the repository's 100-product and collection fixtures ONLY there; an externally supplied DATABASE_URL is never a target. No real orders, Telegram messages, Cloudinary uploads, resets or schema writes to the store occur. Run against an idle local build, not alongside another runner/server using its cache.

For each of ten routes: first request plus seven warm requests, full production Next HTTP response with a bot user-agent. Medians are reported; seven warm samples do not justify a p95 or real-user p75 claim. TTFB is time until fetch receives headers; complete time includes consuming HTML. HTML bytes are decoded bytes, not compressed wire transfer. DB statements/duration count Execute/Simple Query protocol messages in the local WASM database, including transaction/control SQL if emitted. Neither time includes remote DB latency. Columns are independent medians, not necessarily one request.

First request per route is not a Netlify function cold start. Requests do not simulate browser Router Cache/prefetch, image download, JavaScript execution or mobile hardware/network. A lower TTFB after a loading boundary can mean an earlier fallback, NOT earlier meaningful product content. Full response time is also shown to make that distinction visible.

Chromium was absent. Playwright installation was attempted but the browser download returned an invalid/truncated archive. Therefore desktop/mobile navigation traces, LCP, CLS, TBT, image visible time, loading duration, request bytes by type, redirects in a browser, INP and visual/keyboard acceptance are **not measured/not verified**. No synthetic values are substituted. Preview HEAD request also has no usable performance evidence in this environment.

Raw baseline samples: [baseline.json](baseline.json). Comparisons: [BENCHMARKS.md](BENCHMARKS.md). Source route graph: [ROUTE-INVENTORY.md](ROUTE-INVENTORY.md).
