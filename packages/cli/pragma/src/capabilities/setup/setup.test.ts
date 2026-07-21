/**
 * `pragma setup` + its sub-verbs — now synthesized as summon generators routed
 * through the shared `execute` seam (accumulate → recap → execute-with-progress),
 * exactly like `create`.
 *
 * Never spawns the real LSP installer (bunx) — every LSP path is exercised only
 * under `--dry-run` / plan-first, which MOCK the exec — and never writes outside
 * isolated HOME/cwd temps. Covers: completions (exact emitScripts output /
 * preview-accurate dry-run / undo reversal / no-shell warn), the MCP recap gate
 * (auto-confirm writes, decline writes nothing), skills (empty → EMPTY_RESULTS,
 * symlink effect carries an undo), the run-all wizard previewing every detected
 * step, the lazy-React guard (a `--yes` run mounts no Ink), the mixed-noun
 * routing, and MCP plan-first with the sub-verbs absent from the catalog.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execute } from "@canonical/summon-core";
import { dryRun, type Effect, type Task } from "@canonical/task";
import { runTask } from "@canonical/task/node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emitScripts } from "../../kernel/completion/emitScripts.js";
import { asPragmaError } from "../../kernel/error/fromTaskError.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { projectCli } from "../../testing/helpers/projectCli.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { capabilities } from "../index.js";
import { buildSetupPlan } from "./operations/setupGenerator.js";
import { composeSkills, detectSkills } from "./operations/setupSkills.js";
import { setupModule } from "./setup.verb.js";
import { completionScriptPath } from "./shell.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const YES = { dryRun: false, undo: false, yes: true };
const DRY = { dryRun: true, undo: false, yes: false };
const UNDO = { dryRun: false, undo: true, yes: false };

const verbOf = (v: string): VerbSpec =>
  setupModule.verbs.find((s) => (s.path[1] ?? s.path[0]) === v) as VerbSpec;
const setupSelfVerb = verbOf("setup");
const completionsVerb = verbOf("completions");

const roots: string[] = [];
const tmp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

let prevHome: string | undefined;
let prevShell: string | undefined;
beforeEach(() => {
  prevHome = process.env.HOME;
  prevShell = process.env.SHELL;
  process.env.HOME = tmp("pragma-setup-home-");
  process.env.SHELL = "/usr/bin/zsh";
});
afterEach(() => {
  process.env.HOME = prevHome;
  process.env.SHELL = prevShell;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

describe("setup completions", () => {
  it("writes exactly emitScripts(capabilities)[shell]", async () => {
    const path = completionScriptPath("zsh");
    const outcome = await executeVerb(
      completionsVerb,
      {},
      YES,
      bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
    );
    expect(outcome.exitCode).toBe(0);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf-8")).toBe(emitScripts(capabilities).zsh);
  });

  it("bakes the completion config (minChars + per-family opt-out) into the emitted script", async () => {
    // Proves the reconciled `detectCompletions(cwd)` reads `completion` config
    // and threads {minChars, disabledFamilies} into `emitScripts` — a silent
    // regression if the fold had dropped autocomplete's config-threading for
    // setup's argument-free detect.
    const cwd = tmp("pragma-setup-proj-");
    writeFileSync(
      join(cwd, "pragma.config.ts"),
      "export default { completion: { minChars: 5, families: { block: false } } };\n",
    );
    const path = completionScriptPath("zsh");
    const outcome = await executeVerb(
      completionsVerb,
      {},
      YES,
      bootRuntime(FLAGS, cwd),
    );
    expect(outcome.exitCode).toBe(0);
    const written = readFileSync(path, "utf-8");
    // The installed script is EXACTLY the config-baked emit (minChars 5, the
    // `block` family scrubbed) — the config was threaded end to end.
    expect(written).toBe(
      emitScripts(capabilities, {
        minChars: 5,
        disabledFamilies: ["block"],
      }).zsh,
    );
    // Both knobs actually moved the output: it differs from the default emit
    // (minChars), and from the minChars-only emit (the family opt-out).
    expect(written).not.toBe(emitScripts(capabilities).zsh);
    expect(written).not.toBe(emitScripts(capabilities, { minChars: 5 }).zsh);
  });

  it("--dry-run previews the write against the detected shell, writing nothing", async () => {
    const path = completionScriptPath("zsh");
    const outcome = await executeVerb(
      completionsVerb,
      {},
      DRY,
      bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
    );
    expect(outcome.stdout).toContain("Write file");
    expect(outcome.stdout).toContain(path);
    // The confirm gate / answer prompts are never part of a plan.
    expect(outcome.stdout).not.toContain("Prompt");
    expect(existsSync(path)).toBe(false);
  });

  it("warns and writes nothing when no shell is detected", async () => {
    process.env.SHELL = "";
    const outcome = await executeVerb(
      completionsVerb,
      {},
      YES,
      bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
    );
    expect(outcome.exitCode).toBe(0);
    expect(existsSync(completionScriptPath("zsh"))).toBe(false);
  });

  it("--undo reverses the write", async () => {
    const path = completionScriptPath("zsh");
    const cwd = tmp("pragma-setup-proj-");
    await executeVerb(completionsVerb, {}, YES, bootRuntime(FLAGS, cwd));
    expect(existsSync(path)).toBe(true);
    await executeVerb(completionsVerb, {}, UNDO, bootRuntime(FLAGS, cwd));
    expect(existsSync(path)).toBe(false);
  });
});

describe("setup mcp — recap gate", () => {
  it("auto-confirms the detected harness under --yes (writes the pragma server)", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true }); // makes Cursor detected
    const configPath = join(cwd, ".cursor", "mcp.json");

    const outcome = await executeVerb(
      verbOf("mcp"),
      {},
      YES,
      bootRuntime(FLAGS, cwd),
    );
    expect(outcome.exitCode).toBe(0);
    expect(existsSync(configPath)).toBe(true);
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.mcpServers?.pragma?.command).toBe("pragma");
  });

  it("a declined recap gate writes nothing (clean GENERATOR_CANCELLED)", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true });
    const configPath = join(cwd, ".cursor", "mcp.json");

    const { generator } = await buildSetupPlan(
      bootRuntime(FLAGS, cwd),
      "mcp",
      "both",
    );
    // A handler that declines EVERYTHING (incl. execute's "Proceed?" gate) must
    // fail the run cleanly — the GENERATOR_CANCELLED code the boundary renders
    // as a plain "Cancelled." — and write nothing.
    const task = execute(generator, { prompt: async () => false, params: {} });
    await expect(
      runTask(task as Task<unknown>, { promptHandler: async () => false }),
    ).rejects.toMatchObject({ code: "GENERATOR_CANCELLED" });
    expect(existsSync(configPath)).toBe(false);
  });
});

describe("setup mcp — scope & dedup", () => {
  // Isolate PATH so a `claude`/`codex` on the host PATH can't inject harnesses
  // via a `process` signal — detection is driven only by the dirs each test makes.
  let prevPath: string | undefined;
  beforeEach(() => {
    prevPath = process.env.PATH;
    process.env.PATH = tmp("pragma-scope-path-");
  });
  afterEach(() => {
    process.env.PATH = prevPath;
  });

  it("writes both VS Code and Cline keys into one .vscode/mcp.json (7a dedup)", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".vscode"), { recursive: true }); // VS Code (dir signal)
    // Cline is detected by its extension (NOT the .vscode dir), so install a fake
    // one under the isolated HOME — both harnesses then resolve to the SAME
    // .vscode/mcp.json, which is what the two-level dedup write must handle. The
    // extension is matched by its `package.json` manifest, so write one.
    const clineExt = join(
      process.env.HOME ?? "",
      ".vscode",
      "extensions",
      "saoudrizwan.claude-dev-1.0.0",
    );
    mkdirSync(clineExt, { recursive: true });
    writeFileSync(join(clineExt, "package.json"), "{}");
    const outcome = await executeVerb(
      verbOf("mcp"),
      {},
      YES,
      bootRuntime(FLAGS, cwd),
    );
    expect(outcome.exitCode).toBe(0);
    const config = JSON.parse(
      readFileSync(join(cwd, ".vscode", "mcp.json"), "utf-8"),
    );
    // VS Code writes under `servers`, Cline under `mcpServers` — the two-level
    // dedup makes two writes to one file, each preserving the other's key.
    expect(config.servers?.pragma?.command).toBe("pragma");
    expect(config.mcpServers?.pragma?.command).toBe("pragma");
  });

  it("--local writes the project config and skips a global-only harness", async () => {
    const cwd = tmp("pragma-setup-proj-");
    const home = process.env.HOME ?? "";
    mkdirSync(join(cwd, ".cursor"), { recursive: true }); // project scope
    mkdirSync(join(cwd, ".windsurf"), { recursive: true }); // global scope
    await executeVerb(
      verbOf("mcp"),
      { local: true },
      YES,
      bootRuntime(FLAGS, cwd),
    );
    expect(existsSync(join(cwd, ".cursor", "mcp.json"))).toBe(true);
    expect(
      existsSync(join(home, ".codeium", "windsurf", "mcp_config.json")),
    ).toBe(false);
  });

  it("--global writes a global harness's home config, skipping project harnesses", async () => {
    const cwd = tmp("pragma-setup-proj-");
    const home = process.env.HOME ?? "";
    mkdirSync(join(cwd, ".windsurf"), { recursive: true }); // global scope
    mkdirSync(join(cwd, ".cursor"), { recursive: true }); // project scope
    await executeVerb(
      verbOf("mcp"),
      { global: true },
      YES,
      bootRuntime(FLAGS, cwd),
    );
    const windsurfHome = JSON.parse(
      readFileSync(
        join(home, ".codeium", "windsurf", "mcp_config.json"),
        "utf-8",
      ),
    );
    expect(windsurfHome.mcpServers?.pragma?.command).toBe("pragma");
    expect(existsSync(join(cwd, ".cursor", "mcp.json"))).toBe(false);
  });

  // The `--scope <enum>` values (project/global/both) resolve independently of
  // the `--global`/`--local` boolean sugars above — a distinct resolveScope arm.
  it("--scope project (the enum) writes the project config, skipping a global harness", async () => {
    const cwd = tmp("pragma-setup-proj-");
    const home = process.env.HOME ?? "";
    mkdirSync(join(cwd, ".cursor"), { recursive: true }); // project scope
    mkdirSync(join(cwd, ".windsurf"), { recursive: true }); // global scope
    await executeVerb(
      verbOf("mcp"),
      { scope: "project" },
      YES,
      bootRuntime(FLAGS, cwd),
    );
    expect(existsSync(join(cwd, ".cursor", "mcp.json"))).toBe(true);
    expect(
      existsSync(join(home, ".codeium", "windsurf", "mcp_config.json")),
    ).toBe(false);
  });

  it("--scope global (the enum) writes the home config, skipping a project harness", async () => {
    const cwd = tmp("pragma-setup-proj-");
    const home = process.env.HOME ?? "";
    mkdirSync(join(cwd, ".windsurf"), { recursive: true }); // global scope
    mkdirSync(join(cwd, ".cursor"), { recursive: true }); // project scope
    await executeVerb(
      verbOf("mcp"),
      { scope: "global" },
      YES,
      bootRuntime(FLAGS, cwd),
    );
    expect(
      existsSync(join(home, ".codeium", "windsurf", "mcp_config.json")),
    ).toBe(true);
    expect(existsSync(join(cwd, ".cursor", "mcp.json"))).toBe(false);
  });
});

describe("setup mcp — customize opt-in gate (Item 6)", () => {
  it("gates the per-file multiselect behind an explicit customize=true", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true }); // ⇒ one MCP target group
    const { generator } = await buildSetupPlan(
      bootRuntime(FLAGS, cwd),
      "mcp",
      "both",
    );
    const customize = generator.prompts.find((p) => p.name === "customize");
    const targets = generator.prompts.find((p) => p.name === "mcpTargets");
    // The gate is an opt-in confirm that defaults to NOT customizing.
    expect(customize?.type).toBe("confirm");
    expect(customize?.default).toBe(false);
    // The per-file multiselect only surfaces after an explicit yes — so the
    // "all" default configures every deduped file without an extra question.
    expect(targets?.when?.({})).toBe(false);
    expect(targets?.when?.({ customize: false })).toBe(false);
    expect(targets?.when?.({ customize: true })).toBe(true);
  });
});

describe("setup (run-all wizard) — scope threading", () => {
  // Isolate PATH so an ambient `claude`/`codex` can't inject a harness via a
  // `process` signal — detection is driven only by the dirs each test makes.
  let prevPath: string | undefined;
  beforeEach(() => {
    prevPath = process.env.PATH;
    process.env.PATH = tmp("pragma-runall-path-");
  });
  afterEach(() => {
    process.env.PATH = prevPath;
  });

  /** Seed a discoverable skill so the project-band skills step is offerable. */
  const seedSkill = (cwd: string): void => {
    const dir = join(cwd, ".pragma", "skills", "s");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "SKILL.md"),
      "---\nname: s\ndescription: A skill.\n---\n",
    );
  };

  it("--local omits the global-band completions + lsp steps, keeping project steps", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true }); // project-band MCP target
    seedSkill(cwd); // project-band skills step
    const outcome = await executeVerb(
      setupSelfVerb,
      { local: true },
      DRY,
      bootRuntime(FLAGS, cwd),
    );
    expect(outcome.exitCode).toBe(0);
    const plan = outcome.stdout ?? "";
    // The global-band steps are gone under --local (the bug: they used to run).
    expect(plan).not.toContain(completionScriptPath("zsh"));
    expect(plan).not.toContain("terrazzo-lsp-extension");
    // The project-band steps remain: MCP into .cursor, skills into .agents/skills.
    expect(plan).toContain("mcp.json");
    expect(plan).toContain(".agents/skills");
  });

  it("--global omits the project-band skills step, keeping global steps", async () => {
    const cwd = tmp("pragma-setup-proj-");
    seedSkill(cwd); // WOULD be offered under the default `both`
    const outcome = await executeVerb(
      setupSelfVerb,
      { global: true },
      DRY,
      bootRuntime(FLAGS, cwd),
    );
    expect(outcome.exitCode).toBe(0);
    const plan = outcome.stdout ?? "";
    // The global-band steps are present under --global.
    expect(plan).toContain(completionScriptPath("zsh"));
    expect(plan).toContain("terrazzo-lsp-extension");
    // The project-band skills step is gone (the bug: it used to run under --global).
    expect(plan).not.toContain(".agents/skills");
  });
});

describe("setup skills", () => {
  it("empty skills raise EMPTY_RESULTS on the direct sub-verb", async () => {
    const cwd = tmp("pragma-setup-proj-");
    await expect(
      executeVerb(verbOf("skills"), {}, YES, bootRuntime(FLAGS, cwd)),
    ).rejects.toMatchObject({ code: "EMPTY_RESULTS" });
  });

  it("detects a created action and composes a symlink carrying an undo", async () => {
    const cwd = tmp("pragma-setup-proj-");
    const skillDir = join(cwd, ".pragma", "skills", "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A test skill.\n---\n",
    );

    const detected = await detectSkills(bootRuntime(FLAGS, cwd));
    expect(detected.available).toBe(true);
    expect(detected.skillCount).toBe(1);
    expect(detected.actions.some((a) => a.action === "created")).toBe(true);

    const { effects } = dryRun(composeSkills(detected));
    const symlinkEffect = effects.find((e) => e._tag === "Symlink") as
      | (Effect & { _tag: "Symlink"; undo?: unknown })
      | undefined;
    expect(symlinkEffect).toBeDefined();
    expect(symlinkEffect?.undo).toBeDefined();
    expect(existsSync(join(cwd, ".agents", "skills", "my-skill"))).toBe(false);
  });
});

describe("setup lsp — missing-binary guard (bunx absent)", () => {
  it("surfaces a NAMED UNSUPPORTED (not INTERNAL_ERROR) when bunx is off PATH", async () => {
    // Drives the REAL composeLsp exec (YES — not a dry-run mock) with `bunx`
    // removed from PATH, so the spawn REJECTS with ENOENT. The reconciled guard
    // at composeLsp's use site names it; without the guard the raw reject
    // collapses to INTERNAL_ERROR ("please report this issue") at the boundary.
    const prevPath = process.env.PATH;
    process.env.PATH = tmp("pragma-empty-path-"); // empty dir ⇒ bunx unresolvable
    let thrown: unknown;
    try {
      await executeVerb(
        verbOf("lsp"),
        {},
        YES,
        bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
      );
    } catch (error) {
      thrown = error;
    } finally {
      process.env.PATH = prevPath;
    }
    expect(thrown).toBeDefined();
    const err = asPragmaError(thrown);
    expect(err.code).toBe("UNSUPPORTED");
    expect(err.code).not.toBe("INTERNAL_ERROR");
    expect(err.message).toContain("bunx");
    expect(err.message).toMatch(/not found on your PATH/i);
    // The recovery is the actionable install hint, not "report this issue".
    expect(err.recovery?.message ?? "").not.toMatch(/report this issue/i);
  });
});

describe("setup — idempotent detection of already-present config", () => {
  // Isolate PATH so an ambient harness can't inject via a `process` signal.
  let prevPath: string | undefined;
  beforeEach(() => {
    prevPath = process.env.PATH;
    process.env.PATH = tmp("pragma-idem-path-");
  });
  afterEach(() => {
    process.env.PATH = prevPath;
  });

  it("mcp: a second run detects the already-configured file (byte-identical rewrite)", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true });
    const configPath = join(cwd, ".cursor", "mcp.json");

    // First run writes the pragma entry.
    await executeVerb(verbOf("mcp"), {}, YES, bootRuntime(FLAGS, cwd));
    const firstBody = readFileSync(configPath, "utf-8");

    // Detection now classifies the group `configured`.
    const { toResult } = await buildSetupPlan(
      bootRuntime(FLAGS, cwd),
      "mcp",
      "both",
    );
    const result = toResult({});
    expect(result.kind).toBe("mcp");
    if (result.kind === "mcp") {
      expect(result.targets.at(0)?.state).toBe("configured");
    }

    // The wizard default-DESELECTS a configured target (so a plain re-run offers
    // it unchecked) — proven on the generated multiselect's default.
    const { generator } = await buildSetupPlan(
      bootRuntime(FLAGS, cwd),
      "mcp",
      "both",
    );
    const multiselect = generator.prompts.find((p) => p.name === "mcpTargets");
    expect(multiselect?.default).toEqual([]); // the only file is configured
    expect(
      (multiselect?.choices ?? []).some((c) =>
        typeof c === "object" && "label" in c
          ? c.label.includes("already configured")
          : false,
      ),
    ).toBe(true);

    // A real second run is idempotent: the file stays byte-identical (the
    // read-modify-write re-merges the SAME pragma entry).
    await executeVerb(verbOf("mcp"), {}, YES, bootRuntime(FLAGS, cwd));
    expect(readFileSync(configPath, "utf-8")).toBe(firstBody);
  });

  it("mcp: a drifted pragma entry (wrong cwd) reads as `drifted` and is updated", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true });
    const configPath = join(cwd, ".cursor", "mcp.json");
    // Seed a stale pragma entry pointing at a different cwd.
    writeFileSync(
      configPath,
      `${JSON.stringify(
        {
          mcpServers: {
            pragma: { command: "pragma", args: ["mcp"], cwd: "/old" },
          },
        },
        null,
        2,
      )}\n`,
    );

    const { toResult, generator } = await buildSetupPlan(
      bootRuntime(FLAGS, cwd),
      "mcp",
      "both",
    );
    const result = toResult({});
    if (result.kind === "mcp") {
      expect(result.targets.at(0)?.state).toBe("drifted");
    }
    // A drifted target stays SELECTED by default (it needs the update).
    const multiselect = generator.prompts.find((p) => p.name === "mcpTargets");
    expect(multiselect?.default).toEqual([configPath]);

    await executeVerb(verbOf("mcp"), {}, YES, bootRuntime(FLAGS, cwd));
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.mcpServers.pragma.cwd).toBe(cwd); // updated to the real cwd
  });

  it("completions: a second run detects the up-to-date script (state=installed)", async () => {
    const cwd = tmp("pragma-setup-proj-");
    const path = completionScriptPath("zsh");
    // First install.
    await executeVerb(completionsVerb, {}, YES, bootRuntime(FLAGS, cwd));
    const firstBody = readFileSync(path, "utf-8");

    // Detection now classifies the installed script `installed`.
    const { toResult } = await buildSetupPlan(
      bootRuntime(FLAGS, cwd),
      "completions",
      "both",
    );
    const result = toResult({});
    if (result.kind === "completions") {
      expect(result.state).toBe("installed");
    }

    // A real second run is idempotent — the byte-identical script survives.
    await executeVerb(completionsVerb, {}, YES, bootRuntime(FLAGS, cwd));
    expect(readFileSync(path, "utf-8")).toBe(firstBody);
  });

  it("completions: a stale script (different body) reads as `stale`", async () => {
    const cwd = tmp("pragma-setup-proj-");
    const path = completionScriptPath("zsh");
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "# stale hand-edited completion\n");
    const { toResult } = await buildSetupPlan(
      bootRuntime(FLAGS, cwd),
      "completions",
      "both",
    );
    const result = toResult({});
    if (result.kind === "completions") {
      expect(result.state).toBe("stale");
    }
  });

  it("lsp: reports `unknown` when the `code` CLI is absent from PATH", async () => {
    // PATH is the isolated empty dir (beforeEach), so `code` is unresolvable:
    // detection cannot enumerate and reports `unknown` (installer still runs).
    const { toResult } = await buildSetupPlan(
      bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
      "lsp",
      "both",
    );
    const result = toResult({});
    expect(result.kind).toBe("lsp");
    if (result.kind === "lsp") {
      expect(result.state).toBe("unknown");
    }
  });
});

describe("setup (run-all wizard)", () => {
  it("--dry-run previews every DETECTED step (completions + lsp + mcp), writing nothing", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true }); // harness detected
    const outcome = await executeVerb(
      setupSelfVerb,
      {},
      DRY,
      bootRuntime(FLAGS, cwd),
    );
    expect(outcome.exitCode).toBe(0);
    const plan = outcome.stdout ?? "";
    expect(plan).toContain(completionScriptPath("zsh")); // completions step
    expect(plan).toContain("terrazzo-lsp-extension"); // lsp step (exec, mocked)
    expect(plan).toContain("mcp.json"); // mcp step
    expect(plan).not.toContain("Prompt"); // recap gate / multiselects filtered
    // Nothing is written by a preview.
    expect(existsSync(completionScriptPath("zsh"))).toBe(false);
    expect(existsSync(join(cwd, ".cursor", "mcp.json"))).toBe(false);
  });

  it("omits skills gracefully when none are discovered (no mid-wizard EMPTY_RESULTS)", async () => {
    // A run-all in a project with no skills must NOT throw — it just doesn't
    // offer the skills step. Reaching a clean plan proves the graceful degrade.
    const outcome = await executeVerb(
      setupSelfVerb,
      {},
      DRY,
      bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("terrazzo-lsp-extension"); // lsp still there
  });
});

describe("lazy-React discipline (PROTECTED)", () => {
  it("running a --yes setup never loads React or Ink", async () => {
    // A real run through the seam (autoPrompt, no wizard) must not mount Ink.
    await executeVerb(
      completionsVerb,
      {},
      YES,
      bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
    );
    const isReactPkg = (k: string) =>
      /[\\/](react|react-dom|ink|ink-select-input|ink-text-input|ink-spinner)@\d/.test(
        k,
      ) ||
      /[\\/]node_modules[\\/](react|react-dom|ink|ink-select-input|ink-text-input|ink-spinner)[\\/]/.test(
        k,
      );
    const loaded = Object.keys(require.cache ?? {});
    expect(loaded.filter(isReactPkg)).toEqual([]);
  });
});

describe("setup — mixed-noun wiring & MCP surface", () => {
  it("registers a single `setup` command with an action and four sub-verbs", () => {
    const program = projectCli([setupModule]);
    const setups = program.commands.filter((c) => c.name() === "setup");
    expect(setups).toHaveLength(1);
    const setup = setups[0];
    // Self-verb mutation flags land on the parent.
    expect(setup?.options.map((o) => o.long)).toEqual(
      expect.arrayContaining(["--dry-run", "--undo", "--yes"]),
    );
    // The four CLI-only sub-verbs hang under it.
    expect(setup?.commands.map((c) => c.name()).sort()).toEqual([
      "completions",
      "lsp",
      "mcp",
      "skills",
    ]);
  });

  it("exposes only the `setup` tool over MCP; plan-first without confirm", async () => {
    const cwd = tmp("pragma-setup-proj-");
    const mcp = await projectMcp([setupModule], cwd);
    const tools = (await mcp.listTools()).map((t) => t.name);
    expect(tools).toEqual(["setup"]); // sub-verbs are mcp:false

    const plan = await mcp.callTool("setup"); // no confirm → plan-first
    await mcp.cleanup();
    expect(plan.ok).toBe(true);
    expect(plan.meta).toMatchObject({ planOnly: true, confirmRequired: true });
    expect(Array.isArray((plan.data as { plan: unknown }).plan)).toBe(true);
  });
});
