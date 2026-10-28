import assert from "node:assert/strict";
import test from "node:test";
const authPath = require.resolve("../src/features/admin/auth/admin-auth");
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: {
    requireAdmin: async () => {
      throw new Error("LOGIN_REQUIRED");
    },
  },
} as NodeModule;
test("all collection reads and writes require catalog authorization before handling input", async () => {
  const actions = await import(
    "../src/features/collections/collections.actions"
  );
  for (const invoke of [
    () => actions.searchCollectionProducts("هدية"),
    () => actions.saveCollectionAction({}),
    () => actions.saveProductGroupsAction("product", [], []),
    () => actions.saveProductComplementsAction("product", []),
  ])
    await assert.rejects(invoke, /LOGIN_REQUIRED/);
});
