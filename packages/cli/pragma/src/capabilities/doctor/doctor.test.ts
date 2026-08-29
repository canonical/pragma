/**
 * `pragma doctor` — the environment checks plus the scoped target rows.
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
import { scopedChecks } from "./checks/targetHealth.js";
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
  it("returns the environment checks plus one row per scoped target", async () => {
    const data = await runChecks(bootRuntime(FLAGS, tmp("pragma-proj-")));
    // Four unscoped environment checks, then the target table in both scopes
    // (all five targets are global, mcp and skills are also project) = 11,
    // plus the two `harnesses` inventory rows, one per scope = 13.
    expect(data.checks).toHaveLength(13);
    expect(data.passed + data.failed + data.available + data.skipped).toBe(13);
    for (const check of data.checks) {
      expect(["pass", "fail", "available", "skip"]).toContain(check.status);
    }
    // Deterministic under the isolated env.
    expect(byName(data, "Node version")?.status).toBe("pass");
    // Nothing built, but the packs are the distribution's own — so the embedded
    // snapshot answers reads and the check passes, naming what it is reading.
    const pkgRefs = byName(data, "pack refs");
    expect(pkgRefs?.status).toBe("pass");
    expect(pkgRefs?.detail).toContain("shipped with the CLI");
    expect(pkgRefs?.remedy).toBeUndefined();
    // Provenance is one ITEM PER PACK, not a comma-joined string in the
    // headline: four packs and two forty-character SHAs on one line was
    // unreadable, and every other multi-part check here already uses items.
    // The headline counts them; the items say which revision each one is.
    expect(pkgRefs?.detail).toContain("packs");
    expect((pkgRefs?.items?.length ?? 0) > 1).toBe(true);
    for (const item of pkgRefs?.items ?? []) {
      expect(item.label).not.toContain(",");
      // A git hash is cut to seven — the length every other tool in this
      // workflow prints, and short enough that four rows stay scannable.
      expect(item.detail ?? "").not.toMatch(/[0-9a-f]{40}/);
    }

    // The scoped rows carry the TARGET IDS verbatim — `mcp`, not "MCP
    // configured" — because the row name IS the fix command's argument. The
    // environment checks stay unscoped. `harnesses` is the ONE scoped row that
    // is not a target: an inventory of the machine, not something to set up, so
    // it sits last in each scope and derives no `fix:`.
    const scoped = data.checks.filter((c) => c.scope !== undefined);
    expect(scoped.map((c) => `${c.scope}:${c.name}`)).toEqual([
      "global:config",
      "global:completions",
      "global:lsp",
      "global:mcp",
      "global:skills",
      "project:mcp",
      "project:skills",
      "global:harnesses",
      "project:harnesses",
    ]);
    // Every row that wants action names the exact command that repairs it,
    // scope included — the bijection, derived rather than authored.
    for (const check of scoped) {
      if (check.status === "fail" || check.status === "available") {
        expect(check.remedy).toBeDefined();
      }
    }
    // The inventory never inflates the failure or the action count: it is only
    // ever `pass` (this scope holds harnesses) or `skip` (it holds none), and it
    // proposes nothing — the `mcp`/`skills` rows own every harness action.
    for (const check of scoped.filter((c) => c.name === "harnesses")) {
      expect(["pass", "skip"]).toContain(check.status);
      expect(check.remedy).toBeUndefined();
    }
    // No harnesses in an empty HOME/cwd, so both mcp rows skip; the project
    // scope is opt-in, so its absence is never a fault.
    expect(
      scoped.find((c) => c.scope === "project" && c.name === "mcp")?.status,
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
    // The fixture pack's own provenance label, not the embedded snapshot's —
    // now carried as an item rather than inline, and passed through WHOLE
    // because it parses as no scheme. An unreadable provenance is still
    // provenance; dropping it would be the one failure this check exists to
    // prevent.
    expect(pkgRefs?.items?.map((item) => item.label)).toContain("fixture");
    expect(pkgRefs?.detail).not.toContain("embedded snapshot");
    await fixture.dispose();
  });
});

describe("doctor — the store check", () => {
  it("a store that fails to boot is an attributable fail, not a crash", async () => {
    const data = await runChecks(throwingStoreRuntime(tmp("pragma-proj-")));
    expect(data.checks).toHaveLength(13);
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
    expect((envelope.data as DoctorData).checks).toHaveLength(13);
  });
});

describe("doctor — the scoped rows can see the GLOBAL scope", () => {
  it("reports a configured global-scope entry as configured, not missing", async () => {
    // The regression this closes: detection recorded only each harness's
    // DEFAULT scope, so a server registered by `setup mcp --global` was invisible
    // and doctor reported it not-configured forever. The rows now come from the
    // same target table `setup` writes through, enumerated in BOTH scopes, so the
    // two surfaces cannot disagree about what they looked at.
    const cwd = tmp("pragma-doctor-proj-");
    mkdirSync(join(cwd, ".windsurf"), { recursive: true }); // ⇒ Windsurf detected
    const home = process.env.HOME ?? "";
    const wsDir = join(home, ".codeium", "windsurf");
    mkdirSync(wsDir, { recursive: true });
    // Exactly what a global-scope `setup mcp` writes: no `cwd`, so the entry is
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

    const rows = await scopedChecks(bootRuntime(FLAGS, cwd), "pragma");
    const global = rows.find((r) => r.name === "mcp" && r.scope === "global");
    expect(global?.status).toBe("pass");
    expect(
      global?.items?.some((i) => i.label.includes("mcp_config.json")),
    ).toBe(true);
    // ...and the project scope stays an opt-in skip, never a fault.
    const project = rows.find((r) => r.name === "mcp" && r.scope === "project");
    expect(project?.status).toBe("skip");
  });
});

describe("doctor — the harness inventory", () => {
  const VERBOSE: GlobalFlags = { ...FLAGS, verbose: true };
  const inventory = (rows: Awaited<ReturnType<typeof scopedChecks>>) => ({
    global: rows.find((r) => r.name === "harnesses" && r.scope === "global"),
    project: rows.find((r) => r.name === "harnesses" && r.scope === "project"),
  });

  it("lists ONLY detected harnesses by default, by name and with their location", async () => {
    const cwd = tmp("pragma-doctor-proj-");
    mkdirSync(join(cwd, ".vscode"), { recursive: true }); // ⇒ VS Code detected

    const rows = await scopedChecks(bootRuntime(FLAGS, cwd), "pragma");
    const { global, project } = inventory(rows);

    // The project scope holds the hit — by NAME, with the file it resolves to.
    expect(project?.status).toBe("pass");
    expect(project?.detail).toBe("1 detected · 0 registered");
    expect(project?.items?.map((i) => i.label)).toEqual(["VS Code"]);
    expect(project?.items?.[0]?.status).toBe("available");
    expect(project?.items?.[0]?.detail).toContain("detected, not registered");
    expect(project?.items?.[0]?.detail).toContain(".vscode/mcp.json");

    // Nothing detected in the global scope, and that is a skip — not a fault.
    expect(global?.status).toBe("skip");
    expect(global?.detail).toBe("no harnesses detected");
    expect(global?.items).toBeUndefined();
  });

  it("--verbose lists every registry harness, undetected ones as a NON-failing skip", async () => {
    const cwd = tmp("pragma-doctor-proj-");
    mkdirSync(join(cwd, ".vscode"), { recursive: true });

    const rows = await scopedChecks(bootRuntime(VERBOSE, cwd), "pragma");
    const { global, project } = inventory(rows);

    // Every harness the registry knows, in both scopes.
    expect(project?.items).toHaveLength(12);
    expect(global?.items).toHaveLength(12);
    expect(project?.detail).toBe("1 detected · 0 registered · 12 known");

    // `types.ts` forbids inflating the failure count: a machine that simply
    // does not have Cursor is not a broken machine.
    for (const check of [global, project]) {
      expect(["pass", "skip"]).toContain(check?.status);
      for (const item of check?.items ?? []) {
        expect(item.status).not.toBe("fail");
        expect(["pass", "available", "skip"]).toContain(item.status);
      }
    }

    const cursor = project?.items?.find((i) => i.label === "Cursor");
    expect(cursor?.status).toBe("skip");
    expect(cursor?.detail).toBe("not detected");
  });

  it("says where a harness DOES keep its config, rather than omitting it", async () => {
    // `vscode` is `scope: "project"`, so it can NEVER carry a global entry. A
    // verbose global listing that silently dropped it would read as a bug in
    // the listing; the row says why instead. The mirror case is Windsurf, which
    // is `scope: "global"` and keeps nothing per project.
    //
    // The sentence states the FACT, not the partition: `no Global band` named
    // an internal word for the answer instead of giving it.
    const rows = await scopedChecks(
      bootRuntime(VERBOSE, tmp("pragma-doctor-proj-")),
      "pragma",
    );
    const { global, project } = inventory(rows);

    const vscodeGlobal = global?.items?.find((i) => i.label === "VS Code");
    expect(vscodeGlobal?.detail).toBe(
      "keeps no global config — it is per-project only",
    );
    expect(vscodeGlobal?.status).toBe("skip");

    const windsurfProject = project?.items?.find((i) => i.label === "Windsurf");
    expect(windsurfProject?.detail).toBe(
      "keeps no per-project config — it is global only",
    );
    expect(windsurfProject?.status).toBe("skip");
  });

  it("reports a harness whose pragma entry is current as registered", async () => {
    const cwd = tmp("pragma-doctor-proj-");
    mkdirSync(join(cwd, ".vscode"), { recursive: true });
    // Byte-for-byte what a project-scope `setup mcp` writes for VS Code: its
    // `servers` key, and the `cwd` a project registration pins.
    writeFileSync(
      join(cwd, ".vscode", "mcp.json"),
      JSON.stringify({
        servers: { pragma: { command: "pragma", args: ["mcp", "serve"], cwd } },
      }),
    );

    const rows = await scopedChecks(bootRuntime(FLAGS, cwd), "pragma");
    const { project } = inventory(rows);
    expect(project?.detail).toBe("1 detected · 1 registered");
    const vscode = project?.items?.find((i) => i.label === "VS Code");
    expect(vscode?.status).toBe("pass");
    expect(vscode?.detail).toContain("registered");
    expect(vscode?.detail).not.toContain("not registered");
  });

  it("reports two harnesses sharing ONE file by their own keys, not by the file", async () => {
    // The co-detection case. `.vscode/mcp.json` is written under TWO keys —
    // VS Code's `servers` and Cline's `mcpServers` — and registering pragma
    // for VS Code alone leaves the FILE half-configured, which `detectMcp`
    // aggregates to `drifted` (correctly: a write is still owed). That
    // aggregate is not either harness's standing, and reporting it per harness
    // said both had a stale entry when one was current and the other had none.
    const cwd = tmp("pragma-doctor-proj-");
    mkdirSync(join(cwd, ".vscode"), { recursive: true });
    // Cline is detected ONLY by its installed extension, in the same directory
    // that also proves VS Code is installed — so the two co-detect.
    mkdirSync(
      join(
        process.env.HOME as string,
        ".vscode",
        "extensions",
        "saoudrizwan.claude-dev-3.20.0",
      ),
      { recursive: true },
    );
    writeFileSync(
      join(
        process.env.HOME as string,
        ".vscode",
        "extensions",
        "saoudrizwan.claude-dev-3.20.0",
        "package.json",
      ),
      "{}",
    );
    // Only VS Code's key is registered; Cline's `mcpServers` is absent.
    writeFileSync(
      join(cwd, ".vscode", "mcp.json"),
      JSON.stringify({
        servers: { pragma: { command: "pragma", args: ["mcp", "serve"], cwd } },
      }),
    );

    const rows = await scopedChecks(bootRuntime(FLAGS, cwd), "pragma");
    const { project } = inventory(rows);
    expect(project?.detail).toBe("2 detected · 1 registered");

    const vscode = project?.items?.find((i) => i.label === "VS Code");
    expect(vscode?.status).toBe("pass");
    expect(vscode?.detail).toContain("registered — ");
    expect(vscode?.detail).not.toContain("differs");

    const cline = project?.items?.find((i) => i.label === "Cline");
    expect(cline?.status).toBe("available");
    expect(cline?.detail).toContain("detected, not registered");
    expect(cline?.detail).not.toContain("differs");
  });
});

describe("doctor — a blocked skill link path is never reported as current", () => {
  it("distinguishes a hand-placed real directory from a link that is correct", async () => {
    // Detection marks both `skipped` — there is nothing to do to either — so
    // the row counted the blocked path as healthy and said "links current"
    // where no link exists at all.
    const cwd = tmp("pragma-doctor-proj-");
    const skillDir = join(cwd, ".pragma", "skills", "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A test skill.\n---\n",
    );
    // A hand-placed directory sitting exactly where the link would go.
    mkdirSync(join(cwd, ".agents", "skills", "my-skill"), { recursive: true });

    const rows = await scopedChecks(bootRuntime(FLAGS, cwd), "pragma");
    const row = rows.find((r) => r.name === "skills" && r.scope === "project");
    expect(row?.status).not.toBe("pass");
    expect(row?.detail).toContain("real directory");
    // And the remedy is the one that settles it — rerunning setup skips it.
    expect(row?.remedy).toMatch(/Move or delete/);
  });
});

describe("doctor — an EMPTY skills root is not diagnosed as an ABSENT one", () => {
  it("reports an existing but empty project skills root as holding none", async () => {
    // doctor publishes a DIAGNOSIS, so a wrong one is worse than a vague one:
    // the shared skip line told the user `.pragma/skills` "is absent" while
    // they were looking at the directory. Both surfaces read the same
    // `rootExists` the detection already carries.
    const cwd = tmp("pragma-doctor-proj-");
    mkdirSync(join(cwd, ".pragma", "skills"), { recursive: true });

    const rows = await scopedChecks(bootRuntime(FLAGS, cwd), "pragma");
    const row = rows.find((r) => r.name === "skills" && r.scope === "project");
    expect(row?.status).toBe("skip"); // still nothing to reconcile...
    expect(row?.detail).toContain("is empty"); // ...for the true reason
    expect(row?.detail).not.toContain("does not exist");
  });

  it("still reports a missing project skills root as absent", async () => {
    const rows = await scopedChecks(
      bootRuntime(FLAGS, tmp("pragma-doctor-proj-")),
      "pragma",
    );
    const row = rows.find((r) => r.name === "skills" && r.scope === "project");
    expect(row?.status).toBe("skip");
    expect(row?.detail).toContain("does not exist");
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

    const rows = await scopedChecks(bootRuntime(FLAGS, cwd), "pragma");
    const check = rows.find((r) => r.name === "mcp" && r.scope === "global");
    expect(check?.status).toBe("available");
    expect(check?.detail).toContain("not registered");
    // The fix is the target's own invocation, derived from the row's id + scope.
    expect(check?.remedy).toBe("pragma setup mcp");
  });
});
