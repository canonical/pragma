/**
 * Per-file test setup: answer the npm version lookup as offline.
 *
 * `info` and `upgrade` ask the npm registry for the latest published version
 * (3s limit, silent on failure). Reached for real, the answer depends on the
 * network and on how busy the machine is, so two runs of the same verb can
 * disagree. Every test file therefore sees the lookup report "unreachable",
 * the result the verbs already handle.
 *
 * A file that tests the lookup itself, or the verbs' answer to a reachable
 * registry, calls `vi.unmock("…/shared/registry.js")` and stubs `fetch`.
 * Spawned CLIs are kept offline separately, by `helpers/runCli.ts`.
 */

import { vi } from "vitest";

vi.mock("../capabilities/shared/registry.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  checkRegistryVersion: async () => undefined,
}));
