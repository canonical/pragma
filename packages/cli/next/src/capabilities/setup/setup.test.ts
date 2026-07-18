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

    const { generator } = await buildSetupPlan(bootRuntime(FLAGS, cwd), "mcp");
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
