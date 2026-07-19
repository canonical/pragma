/**
 * `pragma doctor` — the nine environment health checks.
 *
 * Runs against isolated HOME/cwd/XDG so the harness/config/completion checks are
 * deterministic (no harnesses, no config, no rc files). Covers the shape, a
 * representative pass/fail/skip spread, the store check (down via an injected
 * throwing store; up via the canonical fixture), exit 0 despite failures, and
 * the MCP read-only envelope.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ConfigLayers } from "../../kernel/config/types.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { createQueryFacade } from "../../kernel/runtime/facade.js";
import type {
  GlobalFlags,
  LazyStore,
  PragmaRuntime,
} from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  ALL_VISIBLE_CONFIG,
  CANONICAL_TTL,
} from "../../testing/fixtures/graph/canonical.js";
import { bootFixtureRuntime } from "../../testing/helpers/fixtureGraph.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { doctorModule } from "./index.js";
import { runChecks } from "./runChecks.js";
import type { DoctorData } from "./types.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const NO_MUT = { dryRun: false, undo: false, yes: false };
const doctorVerb = doctorModule.verbs[0] as VerbSpec;

const roots: string[] = [];
const tmp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

let prevHome: string | undefined;
let prevXdg: string | undefined;
beforeEach(() => {
  prevHome = process.env.HOME;
  prevXdg = process.env.XDG_CONFIG_HOME;
  // Empty HOME/XDG so `~`-based harness signals, rc files, and the global config
  // are all absent — the harness/config/completion checks become deterministic.
  process.env.HOME = tmp("pragma-doctor-home-");
  process.env.XDG_CONFIG_HOME = tmp("pragma-doctor-xdg-");
});
afterEach(() => {
  process.env.HOME = prevHome;
  process.env.XDG_CONFIG_HOME = prevXdg;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

const defaultLayers: ConfigLayers = {
  config: { channel: "normal" },
  origins: {
    tier: "default",
    channel: "default",
    detail: "default",
    packages: "default",
    stories: "default",
    prefixes: "default",
    prompts: "default",
  },
  global: { path: "", exists: false },
  project: { exists: false },
};

/** A runtime whose store fails to boot — for the store-down check path. */
function throwingStoreRuntime(cwd: string): PragmaRuntime {
  const store: LazyStore = {
    get booted() {
      return false;
    },
    async get() {
      throw new Error("store down");
    },
    invalidate() {},
  };
  return {
    cwd,
    version: "9.9.9",
    globalFlags: FLAGS,
    loadConfig: async () => defaultLayers,
    store,
    query: createQueryFacade(store),
  };
}

const byName = (data: DoctorData, name: string) =>
  data.checks.find((c) => c.name === name);

describe("doctor — shape & spread", () => {
  it("returns 9 checks whose tallies sum, each with a valid status", async () => {
    const data = await runChecks(bootRuntime(FLAGS, tmp("pragma-proj-")));
    expect(data.checks).toHaveLength(9);
    expect(data.passed + data.failed + data.skipped).toBe(9);
    for (const check of data.checks) {
      expect(["pass", "fail", "skip"]).toContain(check.status);
    }
    // Deterministic under the isolated env.
    expect(byName(data, "Node version")?.status).toBe("pass");
    // The 3 default-config packages are configured but not locked here → an
    // attributable fail listing them, with the sources-update remedy.
    const pkgRefs = byName(data, "package refs");
    expect(pkgRefs?.status).toBe("fail");
    expect(pkgRefs?.remedy).toBe("pragma sources update");
    expect(pkgRefs?.items?.length).toBe(3);
    // No harnesses in an empty HOME/cwd — attributable fail + skips.
    expect(byName(data, "MCP configured")?.status).toBe("fail");
    expect(byName(data, "Skills symlinked")?.status).toBe("skip");
    expect(byName(data, "MCP commands")?.status).toBe("skip");
    // No project/global config in the isolated XDG.
    expect(byName(data, "pragma config")?.status).toBe("fail");
  });
});

describe("doctor — the store check", () => {
  it("a store that fails to boot is an attributable fail, not a crash", async () => {
    const data = await runChecks(throwingStoreRuntime(tmp("pragma-proj-")));
    expect(data.checks).toHaveLength(9);
    const keStore = byName(data, "ke store");
    expect(keStore?.status).toBe("fail");
    expect(keStore?.remedy).toBeTruthy();
  });

  it("a booted store passes with an entity total", async () => {
    const fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: ALL_VISIBLE_CONFIG,
    });
    const data = await runChecks(fixture.runtime);
    const keStore = byName(data, "ke store");
    expect(keStore?.status).toBe("pass");
    expect(keStore?.detail).toMatch(/entities/);
    await fixture.dispose();
  });
});

describe("doctor — dispatch & MCP", () => {
  it("exits 0 even when checks fail (failures live in the envelope)", async () => {
    const outcome = await executeVerb(
      doctorVerb,
      {},
      NO_MUT,
      bootRuntime(FLAGS, tmp("pragma-proj-")),
    );
    expect(outcome.exitCode).toBe(0);
  });

  it("MCP doctor is read-only and returns the checks envelope", async () => {
    const mcp = await projectMcp([doctorModule], tmp("pragma-proj-"));
    const tools = await mcp.listTools();
    const doctorTool = tools.find((t) => t.name === "doctor");
    expect(
      (doctorTool?.annotations as { readOnlyHint?: boolean } | undefined)
        ?.readOnlyHint,
    ).toBe(true);

    const envelope = await mcp.callTool("doctor");
    await mcp.cleanup();
    expect(envelope.ok).toBe(true);
    expect((envelope.data as DoctorData).checks).toHaveLength(9);
  });
});
