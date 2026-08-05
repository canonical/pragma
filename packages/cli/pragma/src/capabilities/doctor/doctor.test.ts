/**
 * `pragma doctor` — the nine environment health checks.
 *
 * Runs against isolated HOME/cwd/XDG so the harness/config/completion checks are
 * deterministic (no harnesses, no config, no rc files). Covers the shape, a
 * representative pass/fail/skip spread, the store check (down via an injected
 * throwing store; up via the canonical fixture), exit 0 despite failures, and
 * the MCP read-only envelope.
 */

import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BIN_NAME } from "../../constants.js";
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
import { checkMcpConfigured } from "./checks/checkMcpConfigured.js";
import { checkSkillsSymlinked } from "./checks/checkSkillsSymlinked.js";
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
    generators: "default",
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
  it("returns 9 checks whose tallies sum, each with a valid status", async () => {
    const data = await runChecks(bootRuntime(FLAGS, tmp("pragma-proj-")));
    expect(data.checks).toHaveLength(9);
    expect(data.passed + data.failed + data.skipped).toBe(9);
    for (const check of data.checks) {
      expect(["pass", "fail", "skip"]).toContain(check.status);
    }
    // Deterministic under the isolated env.
    expect(byName(data, "Node version")?.status).toBe("pass");
    // Nothing built, but the packs are the distribution's own — so the embedded
    // snapshot answers reads and the check passes, naming what it is reading.
    const pkgRefs = byName(data, "pack refs");
    expect(pkgRefs?.status).toBe("pass");
    expect(pkgRefs?.detail).toContain("embedded snapshot @ ");
    expect(pkgRefs?.remedy).toBeUndefined();
    // No harnesses in an empty HOME/cwd — attributable fail + skips.
    expect(byName(data, "MCP configured")?.status).toBe("fail");
    expect(byName(data, "Skills symlinked")?.status).toBe("skip");
    expect(byName(data, "MCP commands")?.status).toBe("skip");
    // No project/global config in the isolated XDG.
    expect(byName(data, "pragma config")?.status).toBe("fail");
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

describe("doctor — MCP checks band by detected harness scope, not check name", () => {
  it("bands a configured GLOBAL-scope harness (Windsurf) as global", async () => {
    // Windsurf is a global-only harness whose MCP config lives in the home band.
    // The old static map tagged every "MCP configured" result PROJECT; the fix
    // derives the band from the harness's real scope, so this reports `global`.
    const cwd = tmp("pragma-doctor-proj-");
    mkdirSync(join(cwd, ".windsurf"), { recursive: true }); // ⇒ Windsurf detected
    const home = process.env.HOME ?? "";
    const wsDir = join(home, ".codeium", "windsurf");
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(
      join(wsDir, "mcp_config.json"),
      JSON.stringify({ mcpServers: { pragma: { command: "pragma" } } }),
    );

    const check = await checkMcpConfigured(cwd);
    expect(check.status).toBe("pass");
    expect(check.detail).toContain("Windsurf");
    expect(check.band).toBe("global"); // NOT the old static "project"
  });
});

describe("doctor — the skills check tests what its name says", () => {
  /**
   * A project with a detected harness (Cursor, whose detector is a project
   * directory), a discoverable skill, and a skills directory in one of three
   * states.
   *
   * The skill lives under `.pragma/skills`, the project root `discoverSkills`
   * reads first, so the check has something to consider linked.
   */
  const project = (state: "absent" | "empty" | "linked"): string => {
    const cwd = tmp("pragma-doctor-skills-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true }); // ⇒ Cursor detected
    const source = join(cwd, ".pragma", "skills", "demo");
    mkdirSync(source, { recursive: true });
    writeFileSync(
      join(source, "SKILL.md"),
      "---\nname: demo\ndescription: A demo skill.\n---\n",
    );
    if (state === "absent") return cwd;
    const skills = join(cwd, ".cursor", "skills");
    mkdirSync(skills, { recursive: true });
    if (state === "linked") symlinkSync(source, join(skills, "demo"));
    return cwd;
  };

  it("fails on an EMPTY skills directory, where it used to pass", async () => {
    // The defect, pinned in the direction it failed. The check tested
    // `existsSync(skillsPath)`, so a `.claude/skills/` with nothing in it —
    // the state of a user whose install never ran — reported a green pass with
    // no remedy. Reproduced against the built binary before the fix:
    // `✓  Skills symlinked   Claude Code`.
    const check = await checkSkillsSymlinked(project("empty"));
    expect(check.status).toBe("fail");
    expect(check.detail).toContain("Cursor");
    expect(check.remedy).toBe(`${BIN_NAME} setup skills`);
  });

  it("fails on an ABSENT skills directory (the case that already worked)", async () => {
    const check = await checkSkillsSymlinked(project("absent"));
    expect(check.status).toBe("fail");
  });

  it("passes once a real symlink is in place", async () => {
    // The other direction, so the check cannot be satisfied by always failing.
    const check = await checkSkillsSymlinked(project("linked"));
    expect(check.status).toBe("pass");
    expect(check.detail).toContain("Cursor");
  });

  it("skips when the project has no skill to link at all", async () => {
    // Not a misconfiguration: `setup skills` would create nothing, so failing
    // would print a remedy that cannot change the answer.
    const cwd = tmp("pragma-doctor-skills-");
    mkdirSync(join(cwd, ".cursor", "skills"), { recursive: true });
    const check = await checkSkillsSymlinked(cwd);
    expect(check.status).toBe("skip");
    expect(check.detail).toBe("no skills to link");
  });
});
