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
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { execute } from "@canonical/summon-core";
import { dryRun, type Effect, type Task } from "@canonical/task";
import { runTask, runUndo } from "@canonical/task/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BIN_NAME } from "../../constants.js";
import { emitScripts } from "../../kernel/completion/emitScripts.js";
import { asPragmaError } from "../../kernel/error/fromTaskError.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { projectCli } from "../../testing/helpers/projectCli.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { capabilities } from "../index.js";
import { detectCompletions } from "./operations/setupCompletions.js";
import { buildSetupRun } from "./operations/setupGenerator.js";
import {
  composeSkills,
  composeSkillsRemoval,
  detectSkills,
  ownedSkillLinks,
} from "./operations/setupSkills.js";
import { setupModule } from "./setup.verb.js";
import { completionScriptPath, detectShell, type ShellId } from "./shell.js";

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

/**
 * The shell this test process is actually running in.
 *
 * Detection reads the PROCESS TREE now, not `$SHELL` — `$SHELL` is the login
 * shell and forcing it proved nothing about the shell in use. So the
 * completions cases assert against whatever shell really started the run, and
 * stand down where that cannot be established (a CI runner with no shell
 * ancestor), rather than asserting a shell nobody is in.
 */
const DETECTED = detectShell();
const SHELL = DETECTED.kind === "detected" ? DETECTED.shell : null;
const withShell = it.skipIf(SHELL === null);

/**
 * A PATH directory carrying a `pragma` stub. The completions target refuses to
 * install a script whose `pragma __complete` cannot be found — an inert script
 * is worse than none — so every PATH these tests build has to satisfy that.
 */
const stubPath = (): string => {
  const dir = tmp("pragma-setup-path-");
  writeFileSync(join(dir, "pragma"), "");
  return dir;
};

let prevHome: string | undefined;
let prevPath: string | undefined;
beforeEach(() => {
  prevHome = process.env.HOME;
  prevPath = process.env.PATH;
  process.env.HOME = tmp("pragma-setup-home-");
  process.env.PATH = stubPath();
});
afterEach(() => {
  process.env.HOME = prevHome;
  process.env.PATH = prevPath;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

describe("setup completions", () => {
  it("sees a Windows `.cmd` shim, so the row does not skip on Windows", async () => {
    // npm installs this CLI as `pragma.cmd` on Windows and never as a bare
    // name, so joining the name onto each PATH directory found nothing: the
    // row skipped with "not on PATH" on a machine where the command runs.
    // Spelled to match a default `PATHEXT` entry exactly: this test runs on a
    // case-sensitive filesystem, while Windows matches `pragma.cmd` against
    // `.CMD` case-insensitively.
    const dir = tmp("pragma-setup-winpath-");
    writeFileSync(join(dir, `${BIN_NAME}.CMD`), "");

    const detected = await detectCompletions(
      dir,
      { kind: "unknown" },
      {
        platform: "win32",
        env: { PATH: dir },
        home: dir,
        isWsl: false,
      },
    );

    expect(detected.binOnPath).toBe(true);
  });

  withShell("writes exactly emitScripts(capabilities)[shell]", async () => {
    const path = completionScriptPath(SHELL as ShellId);
    const outcome = await executeVerb(
      completionsVerb,
      {},
      YES,
      bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
    );
    expect(outcome.exitCode).toBe(0);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf-8")).toBe(
      emitScripts(capabilities)[SHELL as ShellId],
    );
  });

  withShell(
    "bakes the completion config (minChars + per-family opt-out) into the emitted script",
    async () => {
      // Proves the reconciled `detectCompletions(cwd)` reads `completion` config
      // and threads {minChars, disabledFamilies} into `emitScripts` — a silent
      // regression if the fold had dropped autocomplete's config-threading for
      // setup's argument-free detect.
      const cwd = tmp("pragma-setup-proj-");
      writeFileSync(
        join(cwd, "pragma.config.ts"),
        "export default { completion: { minChars: 5, families: { block: false } } };\n",
      );
      const path = completionScriptPath(SHELL as ShellId);
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
        })[SHELL as ShellId],
      );
      // Both knobs actually moved the output: it differs from the default emit
      // (minChars), and from the minChars-only emit (the family opt-out).
      expect(written).not.toBe(emitScripts(capabilities)[SHELL as ShellId]);
      expect(written).not.toBe(
        emitScripts(capabilities, { minChars: 5 })[SHELL as ShellId],
      );
    },
  );

  withShell(
    "--dry-run previews the write against the detected shell, writing nothing",
    async () => {
      const path = completionScriptPath(SHELL as ShellId);
      const outcome = await executeVerb(
        completionsVerb,
        {},
        DRY,
        bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
      );
      // The dry-run renders the PLAN through the verb's formatPlan seam, not the
      // kernel's raw effect dump: one row, the shell it detected, and the script
      // path rendered against the header's roots instead of repeated absolutely.
      expect(outcome.stdout).toContain("Setup plan — global band");
      expect(outcome.stdout).toMatch(
        new RegExp(`completions\\s+install\\s+${SHELL} →`),
      );
      // The confirm gate / answer prompts are never part of a plan.
      expect(outcome.stdout).not.toContain("Prompt");
      expect(existsSync(path)).toBe(false);
    },
  );

  withShell(
    "refuses to install a script whose `pragma` the shell cannot find",
    async () => {
      // The script delegates every name context to `pragma __complete`. With
      // the binary unreachable the file installs cleanly, doctor goes green,
      // and TAB does nothing — so this is a named skip, not a silent write.
      process.env.PATH = tmp("pragma-setup-nobin-"); // no `pragma` in it
      const outcome = await executeVerb(
        completionsVerb,
        {},
        YES,
        bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
      );
      expect(outcome.exitCode).toBe(0);
      expect(outcome.stdout).toContain("cannot find on PATH");
      expect(existsSync(completionScriptPath(SHELL as ShellId))).toBe(false);
    },
  );

  withShell("--undo reverses the write", async () => {
    const path = completionScriptPath(SHELL as ShellId);
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

    // `--local`: the project band is opt-in now, so a bare `setup mcp` would
    // write the HOME config and leave this repository untouched.
    const outcome = await executeVerb(
      verbOf("mcp"),
      { local: true },
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

    const { generator } = await buildSetupRun(
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
    process.env.PATH = stubPath();
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
      { local: true },
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

  it("a GLOBAL entry omits cwd — registrations from two directories are byte-identical", async () => {
    // A per-user server must not be pinned to whatever directory `setup mcp
    // --global` happened to run from (a registration made from ~/Downloads
    // used to serve ~/Downloads forever, and re-running from repo B flipped
    // the machine band to repo B).
    const home = process.env.HOME ?? "";
    const configPath = join(home, ".codeium", "windsurf", "mcp_config.json");
    const register = async (cwd: string): Promise<string> => {
      mkdirSync(join(cwd, ".windsurf"), { recursive: true });
      await executeVerb(
        verbOf("mcp"),
        { global: true },
        YES,
        bootRuntime(FLAGS, cwd),
      );
      return readFileSync(configPath, "utf-8");
    };
    const fromA = await register(tmp("pragma-setup-projA-"));
    const fromB = await register(tmp("pragma-setup-projB-"));
    expect(fromA).toBe(fromB);
    const entry = JSON.parse(fromA).mcpServers?.pragma;
    expect(entry).toEqual({ command: "pragma", args: ["mcp", "serve"] });
    expect(entry).not.toHaveProperty("cwd");
  });

  it("a stale cwd-pinned GLOBAL entry converges: drifted once, configured after", async () => {
    const home = process.env.HOME ?? "";
    const configPath = join(home, ".codeium", "windsurf", "mcp_config.json");
    mkdirSync(join(home, ".codeium", "windsurf"), { recursive: true });
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          pragma: {
            command: "pragma",
            args: ["mcp"],
            cwd: "/home/u/Downloads",
          },
        },
      }),
    );
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".windsurf"), { recursive: true });
    const rt = bootRuntime(FLAGS, cwd);
    const { detectMcp, mcpGroupState } = await import(
      "./operations/setupMcp.js"
    );
    // The pinned entry reads as drift (the omitted cwd is a controlled field).
    const before = await detectMcp(rt, "global");
    expect(mcpGroupState(before, configPath)).toBe("drifted");
    // One write converges it...
    await executeVerb(
      verbOf("mcp"),
      { global: true },
      YES,
      bootRuntime(FLAGS, cwd),
    );
    expect(
      JSON.parse(readFileSync(configPath, "utf-8")).mcpServers.pragma,
    ).toEqual({ command: "pragma", args: ["mcp", "serve"] });
    // ...and it stays `configured` afterwards (no churn on every run).
    const after = await detectMcp(bootRuntime(FLAGS, cwd), "global");
    expect(mcpGroupState(after, configPath)).toBe("configured");
  });

  it("a PROJECT entry still records the project root as cwd", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true });
    await executeVerb(
      verbOf("mcp"),
      { local: true },
      YES,
      bootRuntime(FLAGS, cwd),
    );
    const entry = JSON.parse(
      readFileSync(join(cwd, ".cursor", "mcp.json"), "utf-8"),
    ).mcpServers?.pragma;
    expect(entry.cwd).toBe(cwd);
  });
});

describe("setup mcp — customize opt-in gate (Item 6)", () => {
  it("gates the per-file multiselect behind an explicit customize=true", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true }); // ⇒ one MCP target group
    const { generator } = await buildSetupRun(
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

  it("recaps the files the run KEPT, not the ones it offered", async () => {
    // The note counted every child of the plan row, so narrowing two MCP files
    // down to one still recapped `2 added`: the plan and the result described
    // different work.
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true });
    mkdirSync(join(cwd, ".gemini"), { recursive: true });
    const run = await buildSetupRun(bootRuntime(FLAGS, cwd), "mcp", "project");
    const row = run.plan.rows.find((r) => r.target === "mcp");
    expect(row?.children?.length).toBe(2);
    const kept = row?.children?.[0]?.key as string;

    const applied = run.applied({
      targets: ["project:mcp"],
      customize: true,
      mcpTargets: [kept],
    });
    expect(applied.rows.find((r) => r.target === "mcp")?.outcome?.note).toBe(
      "1 added",
    );
  });
});

describe("setup lsp — per-editor multiselect (child rows)", () => {
  let prevPath: string | undefined;
  let stubDir = "";
  beforeEach(() => {
    prevPath = process.env.PATH;
    stubDir = stubPath();
    // Two VS Code forks on PATH, neither carrying the extension.
    writeFileSync(join(stubDir, "code"), "");
    writeFileSync(join(stubDir, "codium"), "");
    process.env.PATH = stubDir;
  });
  afterEach(() => {
    process.env.PATH = prevPath;
  });

  it("offers one child per detected editor, like the mcp row offers files", async () => {
    const { plan } = await buildSetupRun(
      bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
      "lsp",
      "global",
    );
    const row = plan.rows.find((r) => r.target === "lsp");
    expect(row?.action).toBe("install");
    expect(row?.children?.map((c) => c.key)).toEqual(["code", "codium"]);
    expect(row?.children?.every((c) => c.action === "add")).toBe(true);
  });

  it("marks an editor that already has the extension unchanged", async () => {
    mkdirSync(
      join(
        process.env.HOME ?? "",
        ".vscode",
        "extensions",
        "canonical.terrazzo-lsp-extension-1.2.3",
      ),
      { recursive: true },
    );
    const { plan } = await buildSetupRun(
      bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
      "lsp",
      "global",
    );
    const children = plan.rows.find((r) => r.target === "lsp")?.children;
    expect(children?.find((c) => c.key === "code")?.action).toBe("unchanged");
    expect(children?.find((c) => c.key === "codium")?.action).toBe("add");
  });

  it("gates the per-editor multiselect behind the same customize confirm", async () => {
    const { generator } = await buildSetupRun(
      bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
      "lsp",
      "global",
    );
    const customize = generator.prompts.find((p) => p.name === "customize");
    const editors = generator.prompts.find((p) => p.name === "lspEditors");
    expect(customize?.default).toBe(false);
    // Both pending editors are pre-selected, so the default path installs into
    // every fork without an extra question.
    expect(editors?.default).toEqual(["code", "codium"]);
    expect(editors?.when?.({ customize: false })).toBe(false);
    expect(editors?.when?.({ customize: true })).toBe(true);
  });

  it("sideloads only into the editors the user kept", async () => {
    const { detectLsp, composeLsp } = await import("./operations/setupLsp.js");
    const detected = await detectLsp(tmp("pragma-setup-proj-"));
    const { effects } = dryRun(composeLsp(detected, ["codium"]));
    const execs = effects.filter((e) => e._tag === "Exec") as (Effect & {
      _tag: "Exec";
      command: string;
    })[];
    // The fetch still runs once; the sideload runs for `codium` alone.
    expect(execs.map((e) => e.command)).toEqual(["bun", "codium"]);
  });

  it("composes nothing at all when every editor is deselected", async () => {
    // Not even the package fetch: there is nothing to install it into.
    const { detectLsp, composeLsp } = await import("./operations/setupLsp.js");
    const detected = await detectLsp(tmp("pragma-setup-proj-"));
    const { effects } = dryRun(composeLsp(detected, []));
    expect(effects.some((e) => e._tag === "Exec")).toBe(false);
  });
});

describe("setup (run-all wizard) — scope threading", () => {
  // Isolate PATH so an ambient `claude`/`codex` can't inject a harness via a
  // `process` signal — detection is driven only by the dirs each test makes.
  // A stubbed `code` CLI makes the LSP step's editor detection deterministic.
  let prevPath: string | undefined;
  let editorPath = "";
  beforeEach(() => {
    prevPath = process.env.PATH;
    editorPath = stubPath();
    process.env.PATH = editorPath;
  });
  afterEach(() => {
    process.env.PATH = prevPath;
  });

  /** Put a stub `code` on the isolated PATH so an LSP install is composable. */
  const seedEditorCli = (): void => {
    writeFileSync(join(editorPath, "code"), "");
  };

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
    // A band FILTERS the run-all: the out-of-band targets are still named, as
    // rows saying why they are not in this run, so nothing is silently absent.
    expect(plan).toContain("completions  skip");
    expect(plan).toContain("user-level only — it has no project band");
    // The project-band steps remain: MCP into .cursor, skills into .agents/skills.
    expect(plan).toContain("mcp.json");
    expect(plan).toContain(".agents/skills");
  });

  withShell(
    "--global omits the project-band skills step, keeping global steps",
    async () => {
      const cwd = tmp("pragma-setup-proj-");
      seedSkill(cwd); // WOULD be offered under the default `both`
      seedEditorCli(); // vscode detected ⇒ the LSP install is in the plan
      const outcome = await executeVerb(
        setupSelfVerb,
        { global: true },
        DRY,
        bootRuntime(FLAGS, cwd),
      );
      expect(outcome.exitCode).toBe(0);
      const plan = outcome.stdout ?? "";
      // The global-band steps are present under --global. Paths render against
      // the header's roots, so the row shows `~/.zfunc/_pragma`, not an absolute
      // prefix repeated on every line.
      expect(plan).toMatch(new RegExp(`completions\\s+install\\s+${SHELL} →`));
      expect(plan).toContain("lsp");
      // The project-band skills step is gone (the bug: it used to run under --global).
      expect(plan).not.toContain(".agents/skills");
    },
  );
});

describe("setup skills", () => {
  it("empty skills are a named skip at exit 0, not a failure", async () => {
    // A skip is "nothing to do here, honestly named" — the same semantics
    // doctor gives its skip glyph. Failing the direct sub-verb made a dotfiles
    // script fail on a machine that simply has no skills installed yet, which
    // teaches people to ignore the exit code.
    const cwd = tmp("pragma-setup-proj-");
    const outcome = await executeVerb(
      verbOf("skills"),
      { local: true },
      YES,
      bootRuntime(FLAGS, cwd),
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("skills");
    expect(outcome.stdout).toContain("no project skills");
  });

  it("detects a created action and composes a symlink carrying an undo", async () => {
    const cwd = tmp("pragma-setup-proj-");
    const skillDir = join(cwd, ".pragma", "skills", "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A test skill.\n---\n",
    );

    const detected = await detectSkills(bootRuntime(FLAGS, cwd), "project");
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

  it("classifies a DANGLING symlink as replaced and repairs it (S1-2)", async () => {
    // `existsSync` FOLLOWS a symlink, so a dangling link used to read as
    // "absent" → plan `created` → the real symlink() crashed EEXIST labeled
    // INTERNAL_ERROR ("please report this issue"), leaving the broken link in
    // place — and the dry-run previewed a clean create the run then belied.
    const cwd = tmp("pragma-setup-proj-");
    const skillDir = join(cwd, ".pragma", "skills", "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A test skill.\n---\n",
    );
    const linkDir = join(cwd, ".agents", "skills");
    mkdirSync(linkDir, { recursive: true });
    const linkPath = join(linkDir, "my-skill");
    symlinkSync(join(cwd, "nonexistent-target"), linkPath);

    const detected = await detectSkills(bootRuntime(FLAGS, cwd), "project");
    const action = detected.actions.find((a) => a.linkPath === linkPath);
    expect(action?.action).toBe("replaced");

    // The dry-run preview now PREDICTS the repair: a delete before the relink.
    const { effects } = dryRun(composeSkills(detected));
    const deletes = effects.filter(
      (e) =>
        e._tag === "DeleteFile" && (e as { path?: string }).path === linkPath,
    );
    expect(deletes.length).toBe(1);

    // The real run repairs the link instead of crashing EEXIST.
    await runTask(composeSkills(detected));
    expect(readlinkSync(linkPath)).toBe(skillDir);
  });

  it("skips a real (non-symlink) directory at the link path, never deleting it", async () => {
    // A hand-placed skill directory is not this command's to delete — the
    // sibling planner (sources/installSkills.ts) already refuses to clobber
    // it, and the two planners must agree on classification.
    const cwd = tmp("pragma-setup-proj-");
    const skillDir = join(cwd, ".pragma", "skills", "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A test skill.\n---\n",
    );
    const realDir = join(cwd, ".agents", "skills", "my-skill");
    mkdirSync(realDir, { recursive: true });
    writeFileSync(join(realDir, "SKILL.md"), "hand-placed\n");

    const detected = await detectSkills(bootRuntime(FLAGS, cwd), "project");
    const action = detected.actions.find((a) => a.linkPath === realDir);
    expect(action?.action).toBe("skipped");

    const { effects } = dryRun(composeSkills(detected));
    expect(
      effects.some(
        (e) =>
          e._tag === "DeleteFile" && (e as { path?: string }).path === realDir,
      ),
    ).toBe(false);
    expect(readFileSync(join(realDir, "SKILL.md"), "utf-8")).toBe(
      "hand-placed\n",
    );
  });

  it("never owns — and never removes — a link into a SIBLING of the skill root", async () => {
    // Ownership was a string prefix, and `<sourceRoot>-backup/my-skill` starts
    // with `<sourceRoot>`. So a link the USER made into their own backup
    // directory was classified as ours, and `--undo` deleted it: a file this
    // command never created and had no business touching.
    const cwd = tmp("pragma-setup-proj-");
    const skillDir = join(cwd, ".pragma", "skills", "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A test skill.\n---\n",
    );
    const backup = join(cwd, ".pragma", "skills-backup", "my-skill");
    mkdirSync(backup, { recursive: true });
    writeFileSync(join(backup, "SKILL.md"), "the user's own copy\n");
    const linkDir = join(cwd, ".agents", "skills");
    mkdirSync(linkDir, { recursive: true });
    const linkPath = join(linkDir, "my-skill");
    symlinkSync(backup, linkPath);

    const detected = await detectSkills(bootRuntime(FLAGS, cwd), "project");
    const action = detected.actions.find((a) => a.linkPath === linkPath);
    expect(action?.owned).toBe(false);
    expect(ownedSkillLinks(detected).map((a) => a.linkPath)).not.toContain(
      linkPath,
    );

    // The removal is what `--undo` runs: it must leave both the link and the
    // directory it points at exactly where they were.
    await runUndo(composeSkillsRemoval(detected));
    expect(readlinkSync(linkPath)).toBe(backup);
    expect(readFileSync(join(backup, "SKILL.md"), "utf-8")).toBe(
      "the user's own copy\n",
    );
  });

  it("removes an owned link whose skill is gone from an emptied source root", async () => {
    // Detection returned before target discovery whenever the source root held
    // no skills, so `--undo` looked at an empty action list, reported zero work
    // and left this command's own links on disk forever.
    const cwd = tmp("pragma-setup-proj-");
    const skillsRoot = join(cwd, ".pragma", "skills");
    const skillDir = join(skillsRoot, "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A test skill.\n---\n",
    );
    const linkDir = join(cwd, ".agents", "skills");
    mkdirSync(linkDir, { recursive: true });
    const linkPath = join(linkDir, "my-skill");
    symlinkSync(skillDir, linkPath);
    // The skill is removed upstream: the link is now ours, owned, and dangling.
    rmSync(skillDir, { recursive: true, force: true });

    const detected = await detectSkills(bootRuntime(FLAGS, cwd), "project");
    expect(detected.available).toBe(false);
    expect(ownedSkillLinks(detected).map((a) => a.linkPath)).toEqual([
      linkPath,
    ]);

    await runUndo(composeSkillsRemoval(detected));
    // `existsSync` follows the link, so the dangling one is read through lstat.
    expect(() => lstatSync(linkPath)).toThrow();
  });

  it("owns a RELATIVE link into the skill root, resolved against the link dir", async () => {
    // `readlink` reports the raw target, which may be relative — resolving it
    // against the link's own directory is what makes the containment test
    // answer about a real path rather than a string.
    const cwd = tmp("pragma-setup-proj-");
    const skillDir = join(cwd, ".pragma", "skills", "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A test skill.\n---\n",
    );
    const linkDir = join(cwd, ".agents", "skills");
    mkdirSync(linkDir, { recursive: true });
    const linkPath = join(linkDir, "my-skill");
    symlinkSync(relative(linkDir, skillDir), linkPath);

    const detected = await detectSkills(bootRuntime(FLAGS, cwd), "project");
    const action = detected.actions.find((a) => a.linkPath === linkPath);
    expect(action?.owned).toBe(true);

    await runUndo(composeSkillsRemoval(detected));
    expect(existsSync(linkPath)).toBe(false);
  });
});

describe("setup — detections settle independently", () => {
  it("gives a rejecting detection its own failed row, leaving the rest planned", async () => {
    // The targets are independent, and one `Promise.all` made them share a
    // fate: a single rejecting detection prevented a run being built at all,
    // so NONE of the other targets ran and doctor rendered no banded rows.
    const { TARGETS } = await import("./targets.js");
    const lsp = TARGETS.find((t) => t.id === "lsp") as (typeof TARGETS)[number];
    const spy = vi
      .spyOn(lsp, "detect")
      .mockRejectedValue(new Error("EACCES: permission denied, open '/x'"));
    try {
      const run = await buildSetupRun(
        bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
        "all",
        "global",
      );
      const row = run.plan.rows.find((r) => r.target === "lsp");
      expect(row?.reason).toContain("EACCES");
      // The point of the fix: the siblings are still planned.
      expect(
        run.plan.rows.filter((r) => r.target !== "lsp").length,
      ).toBeGreaterThan(0);
      // And the row is attributable, not a quiet skip: it exits non-zero.
      const applied = run.applied({});
      expect(
        applied.rows.find((r) => r.target === "lsp")?.outcome?.status,
      ).toBe("failed");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("setup lsp — prerequisites (bun absent / no editor CLI)", () => {
  it("surfaces a NAMED UNSUPPORTED (not INTERNAL_ERROR) when bun is off PATH", async () => {
    // Drives the REAL composeLsp fetch (YES — not a dry-run mock) with a
    // stubbed `code` CLI on PATH (so the sideload is attempted) but no `bun`,
    // so the fetch spawn REJECTS with ENOENT. The guard names it; without the
    // guard the raw reject collapses to INTERNAL_ERROR ("please report this
    // issue") at the boundary.
    const prevPath = process.env.PATH;
    const prevData = process.env.XDG_DATA_HOME;
    const stubDir = stubPath();
    writeFileSync(join(stubDir, "code"), ""); // present ⇒ vscode is a target
    process.env.PATH = stubDir;
    process.env.XDG_DATA_HOME = tmp("pragma-lsp-data-"); // jail the staging dir
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
      process.env.XDG_DATA_HOME = prevData;
    }
    expect(thrown).toBeDefined();
    const err = asPragmaError(thrown);
    expect(err.code).toBe("UNSUPPORTED");
    expect(err.code).not.toBe("INTERNAL_ERROR");
    expect(err.message).toContain("bun");
    expect(err.message).toMatch(/not found on your PATH/i);
    // The recovery is the actionable install hint, not "report this issue".
    expect(err.recovery?.message ?? "").not.toMatch(/report this issue/i);
  });

  it("sideloads the bundled VSIX into EACH detected editor missing it (per-editor CLI, not a hardcoded `code`)", async () => {
    // Two editor CLIs on PATH; VS Code already has the extension (its
    // extensions dir carries a versioned copy), VSCodium does not — so the
    // composed plan fetches the package once (bun, into a durable staging dir)
    // and sideloads ONLY into `codium`. This is the VSCodium fix: the editor
    // CLI is a registry lookup, no longer the hardcoded `code`.
    const prevPath = process.env.PATH;
    const stubDir = tmp("pragma-forks-path-");
    writeFileSync(join(stubDir, "code"), "");
    writeFileSync(join(stubDir, "codium"), "");
    process.env.PATH = stubDir;
    try {
      mkdirSync(
        join(
          process.env.HOME ?? "",
          ".vscode",
          "extensions",
          "canonical.terrazzo-lsp-extension-1.2.3",
        ),
        { recursive: true },
      );
      const { detectLsp, composeLsp } = await import(
        "./operations/setupLsp.js"
      );
      const detected = await detectLsp(tmp("pragma-setup-proj-"));
      expect(detected.state).toBe("absent");
      expect(detected.editors.map((e) => [e.editor.cli, e.installed])).toEqual([
        ["code", true],
        ["codium", false],
      ]);

      const { effects } = dryRun(composeLsp(detected));
      const execs = effects.filter((e) => e._tag === "Exec") as (Effect & {
        _tag: "Exec";
        command: string;
        args: string[];
      })[];
      // One fetch (bun add, durable staging) + one sideload per PENDING editor.
      expect(execs.map((e) => e.command)).toEqual(["bun", "codium"]);
      expect(execs[0].args).toEqual([
        "add",
        "@canonical/terrazzo-lsp-extension@latest",
      ]);
      expect(execs[1].args[0]).toBe("--install-extension");
      // The VSIX path is the staging dir's — durable, not a bunx /tmp cache.
      expect(execs[1].args[1]).toContain(detected.stagingDir);
      expect(execs[1].args[1]).toContain("terrazzo-lsp.vsix");
    } finally {
      process.env.PATH = prevPath;
    }
  });

  it("treats an extension too old to WORK as not installed", async () => {
    // Every VSIX before 0.8.3 ships a language server that cannot resolve its
    // own dependencies — it only appeared to run because the extension prefers
    // Bun and Bun fetches missing packages off the network at spawn time.
    // Matching any version meant such a machine reported `installed`, so
    // `setup lsp` skipped it and `doctor` called it healthy: a wrong skip that
    // reads as correct, which is worse than a wrong failure. Everyone who ran
    // setup before that release would have kept a dead server forever.
    const prevPath = process.env.PATH;
    const stubDir = tmp("pragma-stale-ext-path-");
    writeFileSync(join(stubDir, "code"), "");
    process.env.PATH = stubDir;
    try {
      mkdirSync(
        join(
          process.env.HOME ?? "",
          ".vscode",
          "extensions",
          "canonical.terrazzo-lsp-extension-0.8.1",
        ),
        { recursive: true },
      );
      const { detectLsp } = await import("./operations/setupLsp.js");
      const detected = await detectLsp(tmp("pragma-setup-proj-"));
      expect(detected.state).not.toBe("installed");
    } finally {
      process.env.PATH = prevPath;
    }
  });

  it("reports already-installed (a true no-op) when every detected editor has the extension", async () => {
    const prevPath = process.env.PATH;
    const stubDir = tmp("pragma-installed-path-");
    writeFileSync(join(stubDir, "code"), "");
    process.env.PATH = stubDir;
    try {
      mkdirSync(
        join(
          process.env.HOME ?? "",
          ".vscode",
          "extensions",
          "canonical.terrazzo-lsp-extension-1.2.3",
        ),
        { recursive: true },
      );
      const { detectLsp, composeLsp } = await import(
        "./operations/setupLsp.js"
      );
      const detected = await detectLsp(tmp("pragma-setup-proj-"));
      expect(detected.state).toBe("installed");
      const { effects } = dryRun(composeLsp(detected));
      expect(effects.some((e) => e._tag === "Exec")).toBe(false);
    } finally {
      process.env.PATH = prevPath;
    }
  });

  it("matches the FULL extension id, not any terrazzo-named directory", async () => {
    // The old probe matched the substring "terrazzo", which any other
    // terrazzo-named extension would false-positive.
    const prevPath = process.env.PATH;
    const stubDir = tmp("pragma-substr-path-");
    writeFileSync(join(stubDir, "code"), "");
    process.env.PATH = stubDir;
    try {
      mkdirSync(
        join(
          process.env.HOME ?? "",
          ".vscode",
          "extensions",
          "someoneelse.terrazzo-tools-9.9.9",
        ),
        { recursive: true },
      );
      const { detectLsp } = await import("./operations/setupLsp.js");
      const detected = await detectLsp(tmp("pragma-setup-proj-"));
      expect(detected.state).toBe("absent");
    } finally {
      process.env.PATH = prevPath;
    }
  });

  it("skips with a NAMED message (exit 0) when no editor CLI exists at all", async () => {
    // A machine with no VS Code-family CLI cannot be installed into — the
    // honest outcome is a named skip, not the old UNSUPPORTED with a
    // "permissions or network" guess and a dead /tmp path (§3, S1-1's trigger).
    const prevPath = process.env.PATH;
    process.env.PATH = stubPath(); // empty ⇒ no editor CLI
    try {
      const outcome = await executeVerb(
        verbOf("lsp"),
        {},
        YES,
        bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
      );
      expect(outcome.exitCode).toBe(0);
      expect(outcome.stdout).toContain("skipped");
      expect(outcome.stdout).toContain("no VS Code-family editor CLI on PATH");
      // The remedy names what would count, and states plainly that nothing is
      // possible here yet rather than offering a command this machine lacks.
      expect(outcome.stdout).toContain(
        "no action is possible on this machine yet",
      );
    } finally {
      process.env.PATH = prevPath;
    }
  });
});

describe("setup — idempotent detection of already-present config", () => {
  // Isolate PATH so an ambient harness can't inject via a `process` signal.
  let prevPath: string | undefined;
  beforeEach(() => {
    prevPath = process.env.PATH;
    process.env.PATH = stubPath();
  });
  afterEach(() => {
    process.env.PATH = prevPath;
  });

  it("mcp: a second run detects the already-configured file (byte-identical rewrite)", async () => {
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true });
    const configPath = join(cwd, ".cursor", "mcp.json");

    // First run writes the pragma entry.
    await executeVerb(
      verbOf("mcp"),
      { local: true },
      YES,
      bootRuntime(FLAGS, cwd),
    );
    const firstBody = readFileSync(configPath, "utf-8");

    // The plan's mcp row now reads `none` — nothing to do — and its child for
    // this file reads `unchanged`.
    const { plan } = await buildSetupRun(
      bootRuntime(FLAGS, cwd),
      "mcp",
      "project",
    );
    const row = plan.rows.find((r) => r.target === "mcp");
    expect(row?.action).toBe("none");
    expect(row?.children?.find((c) => c.key === configPath)?.action).toBe(
      "unchanged",
    );
    // An already-current row is offered DE-selected, so a re-run never proposes
    // to rewrite what is already correct.
    expect(row?.selected).toBe(false);

    // A real second run is idempotent: the file stays byte-identical AND the
    // converged row composes no effect at all, so the mtime is untouched.
    const before = statSync(configPath).mtimeMs;
    await executeVerb(
      verbOf("mcp"),
      { local: true },
      YES,
      bootRuntime(FLAGS, cwd),
    );
    expect(readFileSync(configPath, "utf-8")).toBe(firstBody);
    expect(statSync(configPath).mtimeMs).toBe(before);
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

    const { plan } = await buildSetupRun(
      bootRuntime(FLAGS, cwd),
      "mcp",
      "project",
    );
    const row = plan.rows.find((r) => r.target === "mcp");
    // A drifted file is an `update` child, and the row stays SELECTED by
    // default because it needs the write.
    expect(row?.children?.find((c) => c.key === configPath)?.action).toBe(
      "update",
    );
    expect(row?.action).toBe("update");
    expect(row?.selected).toBe(true);

    await executeVerb(
      verbOf("mcp"),
      { local: true },
      YES,
      bootRuntime(FLAGS, cwd),
    );
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.mcpServers.pragma.cwd).toBe(cwd); // updated to the real cwd
  });

  withShell(
    "completions: a second run detects the up-to-date script (state=installed)",
    async () => {
      const cwd = tmp("pragma-setup-proj-");
      const path = completionScriptPath(SHELL as ShellId);
      // First install.
      await executeVerb(completionsVerb, {}, YES, bootRuntime(FLAGS, cwd));
      const firstBody = readFileSync(path, "utf-8");

      // The plan's completions row now reads `none` — the installed bytes are
      // current, so a re-run composes nothing.
      const { plan } = await buildSetupRun(
        bootRuntime(FLAGS, cwd),
        "completions",
        "global",
      );
      expect(plan.rows.find((r) => r.target === "completions")?.action).toBe(
        "none",
      );

      // A real second run is idempotent — the byte-identical script survives.
      await executeVerb(completionsVerb, {}, YES, bootRuntime(FLAGS, cwd));
      expect(readFileSync(path, "utf-8")).toBe(firstBody);
    },
  );

  withShell(
    "completions: a stale script (different body) reads as `stale`",
    async () => {
      const cwd = tmp("pragma-setup-proj-");
      const path = completionScriptPath(SHELL as ShellId);
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, "# stale hand-edited completion\n");
      const { plan } = await buildSetupRun(
        bootRuntime(FLAGS, cwd),
        "completions",
        "global",
      );
      // A hand-edited script is `update`, not `install`: the row says which of
      // the two it is, because overwriting someone's edit is worth naming.
      expect(plan.rows.find((r) => r.target === "completions")?.action).toBe(
        "update",
      );
    },
  );

  it("lsp: reports `unknown` when the `code` CLI is absent from PATH", async () => {
    // PATH is the isolated empty dir (beforeEach), so `code` is unresolvable:
    // detection cannot enumerate and reports `unknown` (installer still runs).
    const { plan } = await buildSetupRun(
      bootRuntime(FLAGS, tmp("pragma-setup-proj-")),
      "lsp",
      "global",
    );
    // No editor CLI resolves, so the row is a SKIP carrying its reason —
    // never a silent omission, and never a failure.
    const row = plan.rows.find((r) => r.target === "lsp");
    expect(row?.action).toBe("skip");
    expect(row?.reason).toContain("no VS Code-family editor CLI on PATH");
  });
});

describe("setup (run-all wizard)", () => {
  // Pin PATH to a stub dir carrying only a `code` CLI: the LSP step's editor
  // detection (and the ambient-harness process signals) must not depend on
  // what happens to be installed on the host running the tests.
  let prevPath: string | undefined;
  beforeEach(() => {
    prevPath = process.env.PATH;
    const dir = stubPath();
    writeFileSync(join(dir, "code"), "");
    process.env.PATH = dir;
  });
  afterEach(() => {
    process.env.PATH = prevPath;
  });

  withShell(
    "--dry-run previews every DETECTED step (completions + lsp + mcp), writing nothing",
    async () => {
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
      // EVERY target is a visible row — including the ones that will skip. The
      // run-all used to build its choices only from detectable steps, so a
      // target it could not offer vanished from the plan and from the recap.
      for (const id of ["config", "completions", "lsp", "mcp", "skills"]) {
        expect(plan).toContain(id);
      }
      expect(plan).toContain(`${SHELL} →`); // completions row
      expect(plan).not.toContain("Prompt"); // recap gate / multiselects filtered
      // Nothing is written by a preview.
      expect(existsSync(completionScriptPath(SHELL as ShellId))).toBe(false);
      expect(existsSync(join(cwd, ".cursor", "mcp.json"))).toBe(false);
    },
  );

  it("a failing LSP step no longer aborts the run — MCP and skills still apply, exit reflects the failure (S1-1)", async () => {
    // The audit's headline break: with an unsatisfiable LSP prerequisite the
    // single advertised onboarding command configured NOTHING (no MCP write,
    // no skills link) and exited 1. Steps are independent — one failure must
    // report, let the rest proceed, and only then fail the run. Here the LSP
    // step has an editor (`code` stub on PATH) but no `bun`, so its fetch
    // fails; MCP (.cursor) and skills (a seeded skill) must still apply.
    const prevData = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = tmp("pragma-s11-data-"); // jail the staging dir
    const cwd = tmp("pragma-setup-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true });
    const skillDir = join(cwd, ".pragma", "skills", "s");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: s\ndescription: A skill.\n---\n",
    );
    let thrown: unknown;
    try {
      // `--scope both`: the failing target (lsp) is global-only, and the two
      // that must survive it write the project band, so the run has to cover
      // both. A bare run-all is the GLOBAL band now and would not touch this
      // repository at all.
      await executeVerb(
        setupSelfVerb,
        { scope: "both" },
        YES,
        bootRuntime(FLAGS, cwd),
      );
    } catch (error) {
      thrown = error;
    } finally {
      process.env.XDG_DATA_HOME = prevData;
    }
    // The satisfiable steps ran to completion...
    expect(existsSync(join(cwd, ".cursor", "mcp.json"))).toBe(true);
    expect(existsSync(join(cwd, ".agents", "skills", "s"))).toBe(true);
    // ...and the run still failed, with the ORIGINAL step error surfaced.
    expect(thrown).toBeDefined();
    const err = asPragmaError(thrown);
    expect(err.code).toBe("UNSUPPORTED");
    // One failed row reports ITS OWN cause — a count would throw away the only
    // sentence that says what is wrong.
    expect(err.message).toContain("lsp");
    expect(err.message).toContain("bun");
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
    // The skills row is PRESENT and says why it cannot act, rather than being
    // dropped from a plan that then claims completeness.
    expect(outcome.stdout).toContain("skills");
    expect(outcome.stdout).toContain("no skills installed");
    expect(outcome.stdout).toContain("lsp");
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
  it("registers a single `setup` command with an action and five sub-verbs", () => {
    const program = projectCli([setupModule]);
    const setups = program.commands.filter((c) => c.name() === "setup");
    expect(setups).toHaveLength(1);
    const setup = setups[0];
    // Self-verb mutation flags land on the parent.
    expect(setup?.options.map((o) => o.long)).toEqual(
      expect.arrayContaining(["--dry-run", "--undo", "--yes"]),
    );
    // The five CLI-only sub-verbs hang under it — one per target-table row.
    expect(setup?.commands.map((c) => c.name()).sort()).toEqual([
      "completions",
      "config",
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
