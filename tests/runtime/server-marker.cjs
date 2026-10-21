// Next enforces this marker during bundling. Standalone Node integration tests
// are server-side too; load an empty marker without selecting React's RSC-only
// runtime (which cannot load next/navigation in a plain Node process).
const id = require.resolve('server-only');
require.cache[id] = { id, filename: id, loaded: true, exports: {} };
