/**
 * `pragma setup` + its sub-verbs — the PR5-coupled environment installer.
 *
 * Never spawns the real LSP installer (bunx) and never writes outside isolated
 * HOME/cwd temps. Covers: the auto-answer handler, completions (exact
 * emitScripts output / preview-accurate dry-run / undo reversal), the mcp gate
 * resolving via an injected prompt handler + auto-confirm, skills
 * (empty → EMPTY_RESULTS, symlink effect carries an undo), the mixed-noun
 * routing wiring, and MCP plan-first with the sub-verbs absent from the catalog.
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
import { setupMcp } from "./operations/setupMcp.js";
import { setupSkills } from "./operations/setupSkills.js";
import { autoAnswerDefaults } from "./promptStrategy.js";
import { setupModule } from "./setup.verb.js";
import { completionScriptPath } from "./shell.js";
import type { SetupResult } from "./types.js";

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

describe("autoAnswerDefaults", () => {
  it("answers a confirm prompt with its declared default", async () => {
    expect(
      await autoAnswerDefaults({
        _tag: "Prompt",
        question: { type: "confirm", name: "a", message: "?", default: true },
      } as Effect & { _tag: "Prompt" }),
    ).toBe(true);
    expect(
      await autoAnswerDefaults({
        _tag: "Prompt",
        question: { type: "confirm", name: "b", message: "?", default: false },
      } as Effect & { _tag: "Prompt" }),
    ).toBe(false);
  });
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

describe("setup mcp — harness gate", () => {
  it("the confirm gate resolves via the injected prompt handler", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true }); // makes Cursor detected
    const configPath = join(cwd, ".cursor", "mcp.json");

    // Decline via a stub handler → nothing is written.
    const declineTask = await setupMcp(bootRuntime(FLAGS, cwd));
    await runTask(declineTask, { promptHandler: async () => false });
    expect(existsSync(configPath)).toBe(false);

    // Accept via a stub handler → the pragma server is written.
    const acceptTask = await setupMcp(bootRuntime(FLAGS, cwd));
    const result = (await runTask(acceptTask, {
      promptHandler: async () => true,
    })) as SetupResult;
    expect(existsSync(configPath)).toBe(true);
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.mcpServers?.pragma?.command).toBe("pragma");
    expect(result.kind === "mcp" && result.configured).toContain("Cursor");
  });

  it("auto-confirms under the default handler (never hangs)", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true });
    // executeVerb with --yes wires autoAnswerDefaults (default true → configured).
    const outcome = await executeVerb(
      verbOf("mcp"),
      {},
      YES,
      bootRuntime(FLAGS, cwd),
    );
    expect(outcome.exitCode).toBe(0);
    expect(existsSync(join(cwd, ".cursor", "mcp.json"))).toBe(true);
  });
});

describe("setup skills", () => {
  it("empty skills raise EMPTY_RESULTS", async () => {
    const cwd = tmp("pragma-setup-proj-");
    await expect(setupSkills(bootRuntime(FLAGS, cwd))).rejects.toMatchObject({
      code: "EMPTY_RESULTS",
    });
  });

  it("plans a symlink whose effect carries an undo (created action)", async () => {
    const cwd = tmp("pragma-setup-proj-");
    const skillDir = join(cwd, ".pragma", "skills", "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A test skill.\n---\n",
    );

    const task = (await setupSkills(
      bootRuntime(FLAGS, cwd),
    )) as Task<SetupResult>;
    const { value, effects } = dryRun(task);
    expect(value.kind).toBe("skills");
    if (value.kind === "skills") {
      expect(value.result.skillCount).toBe(1);
      expect(value.result.actions.some((a) => a.action === "created")).toBe(
        true,
      );
    }
    const symlinkEffect = effects.find((e) => e._tag === "Symlink") as
      | (Effect & { _tag: "Symlink"; undo?: unknown })
      | undefined;
    expect(symlinkEffect).toBeDefined();
    expect(symlinkEffect?.undo).toBeDefined();
    expect(existsSync(join(cwd, ".agents", "skills", "my-skill"))).toBe(false);
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
