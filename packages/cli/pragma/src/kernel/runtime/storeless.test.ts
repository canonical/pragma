import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { configModule } from "../../capabilities/config/index.js";
import { infoModule } from "../../capabilities/info/index.js";
import { sourcesModule } from "../../capabilities/sources/index.js";
import { executeVerb } from "../project/cli/dispatch.js";
import type { GlobalFlags, VerbSpec } from "../spec/types.js";
import { bootRuntime } from "./boot.js";

const NO_MUT = { dryRun: false, undo: false, yes: false };
const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};

const infoVerb = infoModule.verbs[0] as VerbSpec;
const showVerb = configModule.verbs[0] as VerbSpec;
const sourcesStatusVerb = sourcesModule.verbs[0] as VerbSpec;

/** A needs-store READ verb whose body never touches the store — so a `booted`
 * flag flipping to true proves the *dispatcher* booted it for `needsStore`. */
const needsStoreVerb: VerbSpec = {
  path: ["fixture", "needs-store"],
  summary: "A store-backed read.",
  params: [],
  output: {
    formatters: {
      plain: (d) => JSON.stringify(d),
      llm: (d) => JSON.stringify(d),
      json: (d) => JSON.stringify(d),
    },
  },
  capability: {
    needsStore: true,
    mutates: false,
    mcp: { expose: false, reason: "test fixture" },
  },
  run: async () => ({ ok: true }),
};

const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-storeless-"));

describe("storeless guarantee — the store never boots for storeless verbs (PROTECTED)", () => {
  it("info does not construct the store", async () => {
    const runtime = bootRuntime(FLAGS, freshCwd());
    await executeVerb(infoVerb, {}, NO_MUT, runtime);
    expect(runtime.store.booted).toBe(false);
  });

  it("config show does not construct the store", async () => {
    const runtime = bootRuntime(FLAGS, freshCwd());
    await executeVerb(showVerb, {}, NO_MUT, runtime);
    expect(runtime.store.booted).toBe(false);
  });

  it("sources status does not construct the store", async () => {
    const runtime = bootRuntime(FLAGS, freshCwd());
    const outcome = await executeVerb(sourcesStatusVerb, {}, NO_MUT, runtime);
    expect(outcome.exitCode).toBe(0);
    expect(runtime.store.booted).toBe(false);
  });

  // There was a `__complete does not construct the store` case here. It
  // dispatched `capabilities/meta/complete.verb.ts` through `executeVerb` — a
  // spec for a token `bin.ts` answers at argv[0], before the command tree
  // exists, so that dispatch never happens in production. Both halves of what it
  // claimed survive it, and both are stronger: the DISPATCHER not booting for
  // a `needsStore: false` verb is the three cases above, and the real
  // `__complete` path's storelessness is `completion/safety.test.ts`'s "an
  // entity __complete resolves from the index, never constructs the store",
  // which mocks `createStore` to THROW rather than reading a `booted` flag.

  it("a needsStore verb DOES construct the store (spy fires)", async () => {
    const runtime = bootRuntime(FLAGS, freshCwd());
    expect(runtime.store.booted).toBe(false);
    const outcome = await executeVerb(needsStoreVerb, {}, NO_MUT, runtime);
    expect(outcome.exitCode).toBe(0);
    expect(runtime.store.booted).toBe(true);
  });
});
