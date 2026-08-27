/**
 * `pragma doctor` — the environment checks plus the banded target rows.
 *
 * Runs against isolated HOME/cwd/XDG so the harness/config/completion checks are
 * deterministic (no harnesses, no config, no rc files). Covers the shape, a
 * representative pass/fail/available/skip spread, the store check (down via an
 * injected throwing store; up via the canonical fixture), exit 0 despite
 * failures, and the MCP read-only envelope.
 */

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
import { bandedChecks } from "./checks/targetHealth.js";
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
let prevPath: string | undefined;
beforeEach(() => {
  prevHome = process.env.HOME;
  prevXdg = process.env.XDG_CONFIG_HOME;
  prevPath = process.env.PATH;
  // Empty HOME/XDG so `~`-based harness signals, rc files, and the global config
  // are all absent — the harness/config/completion checks become deterministic.
  process.env.HOME = tmp("pragma-doctor-home-");
  process.env.XDG_CONFIG_HOME = tmp("pragma-doctor-xdg-");
  // Point PATH at an empty dir so no harness `process` signal fires off the
  // ambient PATH (e.g. a `claude`/`codex` binary on the CI/dev host) — keeping
  // "no harnesses detected" deterministic regardless of what is installed.
  process.env.PATH = tmp("pragma-doctor-path-");
});
afterEach(() => {
  process.env.HOME = prevHome;
  process.env.XDG_CONFIG_HOME = prevXdg;
  process.env.PATH = prevPath;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

const defaultLayers: ConfigLayers = {
  config: { channel: "normal" },
  origins: {
    tier: "default",
    channel: "default",
    detail: "default",
    packs: "default",
    stories: "default",
    prefixes: "default",
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
  it("returns the environment checks plus one row per banded target", async () => {
    const data = await runChecks(bootRuntime(FLAGS, tmp("pragma-proj-")));
    // Four unbanded environment checks, then the target table in both bands:
    // all five targets are global, mcp and skills are also project.
    expect(data.checks).toHaveLength(11);
    expect(data.passed + data.failed + data.available + data.skipped).toBe(11);
    for (const check of data.checks) {
      expect(["pass", "fail", "available", "skip"]).toContain(check.status);
    }
    // Deterministic under the isolated env.
    expect(byName(data, "Node version")?.status).toBe("pass");
    // Nothing built, but the packs are the distribution's own — so the embedded
    // snapshot answers reads and the check passes, naming what it is reading.
    const pkgRefs = byName(data, "pack refs");
    expect(pkgRefs?.status).toBe("pass");
    expect(pkgRefs?.detail).toContain("embedded snapshot @ ");
    expect(pkgRefs?.remedy).toBeUndefined();

    // The banded rows carry the TARGET IDS verbatim — `mcp`, not "MCP
    // configured" — because the row name IS the fix command's argument. The
    // environment checks stay unbanded.
    const banded = data.checks.filter((c) => c.band !== undefined);
    expect(banded.map((c) => `${c.band}:${c.name}`)).toEqual([
      "global:config",
      "global:completions",
      "global:lsp",
      "global:mcp",
      "global:skills",
      "project:mcp",
      "project:skills",
    ]);
    // Every row that wants action names the exact command that repairs it,
    // band included — the bijection, derived rather than authored.
    for (const check of banded) {
      if (check.status === "fail" || check.status === "available") {
        expect(check.remedy).toBeDefined();
      }
    }
    // No harnesses in an empty HOME/cwd, so both mcp rows skip; the project
    // band is opt-in, so its absence is never a fault.
    expect(
      banded.find((c) => c.band === "project" && c.name === "mcp")?.status,
    ).toBe("skip");
    // No global config in the isolated XDG — an opt-in that is not set up yet.
    expect(byName(data, "config")?.status).toBe("available");
    expect(byName(data, "config")?.remedy).toBe("pragma setup config");
  });
});

describe("doctor — the pack-refs check", () => {
  it("a project with its OWN packs and nothing built is an attributable fail", async () => {
    // The install that must never read healthy: `origins.packs` is "project",
    // so the embedded snapshot is a DIFFERENT graph and every read throws
    // STORE_UNAVAILABLE. Doctor has to say so and name the fix, rather than
    // pass by listing packs it is not actually reading from.
    const cwd = tmp("pragma-unbuilt-");
    writeFileSync(
      join(cwd, "pragma.config.ts"),
      'export default { packs: [{ name: "unbuilt", source: "file:///pragma-never-built" }] };\n',
    );
    const data = await runChecks(bootRuntime(FLAGS, cwd));
    const pkgRefs = byName(data, "pack refs");
    expect(pkgRefs?.status).toBe("fail");
    expect(pkgRefs?.detail).toContain("the store has not been built");
    expect(pkgRefs?.remedy).toBe("pragma sources update");
  });

  it("a project pointed at its own built pack passes, naming that pack", async () => {
    const fixture = await bootFixtureRuntime({ ttl: CANONICAL_TTL });
    const data = await runChecks(fixture.runtime);
    const pkgRefs = byName(data, "pack refs");
    expect(pkgRefs?.status).toBe("pass");
    // The fixture pack's own provenance label, not the embedded snapshot's.
    expect(pkgRefs?.detail).toContain("fixture");
    expect(pkgRefs?.detail).not.toContain("embedded snapshot");
    await fixture.dispose();
  });
});

describe("doctor — the store check", () => {
  it("a store that fails to boot is an attributable fail, not a crash", async () => {
    const data = await runChecks(throwingStoreRuntime(tmp("pragma-proj-")));
    expect(data.checks).toHaveLength(11);
    const store = byName(data, "store");
    expect(store?.status).toBe("fail");
    expect(store?.remedy).toBeTruthy();
  });

  it("a booted store passes with an entity total", async () => {
    const fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: ALL_VISIBLE_CONFIG,
    });
    const data = await runChecks(fixture.runtime);
    const store = byName(data, "store");
    expect(store?.status).toBe("pass");
    expect(store?.detail).toMatch(/entities/);
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
    expect((envelope.data as DoctorData).checks).toHaveLength(11);
  });
});

describe("doctor — the banded rows can see the GLOBAL band", () => {
  it("reports a configured global-band entry as configured, not missing", async () => {
    // The regression this closes: detection recorded only each harness's
    // DEFAULT band, so a server registered by `setup mcp --global` was invisible
    // and doctor reported it not-configured forever. The rows now come from the
    // same target table `setup` writes through, enumerated in BOTH bands, so the
    // two surfaces cannot disagree about what they looked at.
    const cwd = tmp("pragma-doctor-proj-");
    mkdirSync(join(cwd, ".windsurf"), { recursive: true }); // ⇒ Windsurf detected
    const home = process.env.HOME ?? "";
    const wsDir = join(home, ".codeium", "windsurf");
    mkdirSync(wsDir, { recursive: true });
    // Exactly what a global-band `setup mcp` writes: no `cwd`, so the entry is
    // not pinned to whatever directory the registration ran from.
    writeFileSync(
      join(wsDir, "mcp_config.json"),
      JSON.stringify({
        mcpServers: { pragma: { command: "pragma", args: ["mcp", "serve"] } },
      }),
    );
    // The row also verifies the command BOOTS, so put a `pragma` on the
    // isolated PATH — otherwise the row correctly fails for a second reason.
    const binDir = process.env.PATH as string;
    writeFileSync(join(binDir, "pragma"), "#!/bin/sh\nexit 0\n");
    chmodSync(join(binDir, "pragma"), 0o755);

    const rows = await bandedChecks(bootRuntime(FLAGS, cwd), "pragma");
    const global = rows.find((r) => r.name === "mcp" && r.band === "global");
    expect(global?.status).toBe("pass");
    expect(
      global?.items?.some((i) => i.label.includes("mcp_config.json")),
    ).toBe(true);
    // ...and the project band stays an opt-in skip, never a fault.
    const project = rows.find((r) => r.name === "mcp" && r.band === "project");
    expect(project?.status).toBe("skip");
  });
});

describe("doctor — an unconfigured opt-in integration is available, not a fault", () => {
  it("a detected harness with no MCP entry reports available with the setup command", async () => {
    // Windsurf is detected (project signal) but nothing is configured. A fresh
    // install lands exactly here, and a fresh install is healthy — so this is
    // the `available` tier, keeping its actionable setup command, and it must
    // never inflate the failure count.
    const cwd = tmp("pragma-doctor-proj-");
    mkdirSync(join(cwd, ".windsurf"), { recursive: true }); // ⇒ Windsurf detected

    const rows = await bandedChecks(bootRuntime(FLAGS, cwd), "pragma");
    const check = rows.find((r) => r.name === "mcp" && r.band === "global");
    expect(check?.status).toBe("available");
    expect(check?.detail).toContain("not configured");
    // The fix is the target's own invocation, derived from the row's id + band.
    expect(check?.remedy).toBe("pragma setup mcp");
  });
});
