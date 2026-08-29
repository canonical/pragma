/**
 * `setup mcp` — the correctness contract, proved case by case.
 *
 * This target edits files the user did not give us and cannot afford to lose:
 * an editor's MCP registry usually holds other people's servers beside ours.
 * The properties below are therefore asserted directly rather than inferred
 * from the merge machinery being "sound":
 *
 *   1. a second install is a BYTE-identical no-op (not merely equivalent JSON)
 *   2. undo removes exactly our key, and is a no-op when we own nothing
 *   3. an unparseable config is refused, never overwritten
 *   4. every drift shape converges in one write and then stays converged
 *   5. install → undo → install, and install → install → undo, both round-trip
 *
 * Byte equality is the load-bearing assertion in (1): a no-op that rewrites a
 * file is not a no-op, and it would defeat the drift classifier that the next
 * run — and every doctor row — depends on.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { detectMcp, mcpGroupState } from "./operations/setupMcp.js";
import { setupModule } from "./setup.verb.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const YES = { dryRun: false, undo: false, yes: true };
const UNDO = { dryRun: false, undo: true, yes: false };
const LOCAL = { local: true };
const GLOBAL = { global: true };

const mcpVerb = setupModule.verbs.find(
  (v) => (v.path[1] ?? v.path[0]) === "mcp",
) as VerbSpec;

const roots: string[] = [];
const tmp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

let prevHome: string | undefined;
let prevPath: string | undefined;
beforeEach(() => {
  prevHome = process.env.HOME;
  prevPath = process.env.PATH;
  process.env.HOME = tmp("pragma-mcpc-home-");
  // An empty PATH keeps harness `process` signals from firing off the host.
  process.env.PATH = tmp("pragma-mcpc-path-");
});
afterEach(() => {
  process.env.HOME = prevHome;
  process.env.PATH = prevPath;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

/** A project with Cursor detected — one project-scope file, `.cursor/mcp.json`. */
const cursorProject = (): { cwd: string; config: string } => {
  const cwd = tmp("pragma-mcpc-proj-");
  mkdirSync(join(cwd, ".cursor"), { recursive: true });
  return { cwd, config: join(cwd, ".cursor", "mcp.json") };
};

const install = (cwd: string, params = LOCAL) =>
  executeVerb(mcpVerb, params, YES, bootRuntime(FLAGS, cwd));
const undo = (cwd: string, params = LOCAL) =>
  executeVerb(mcpVerb, params, UNDO, bootRuntime(FLAGS, cwd));

// =============================================================================
// 1. Double install is a byte-identical no-op
// =============================================================================

describe("installing twice never produces a second entry", () => {
  it("leaves the file byte-identical, mtime included", async () => {
    const { cwd, config } = cursorProject();
    await install(cwd);
    const first = readFileSync(config, "utf-8");
    const firstMtime = statSync(config).mtimeMs;

    await install(cwd);

    // Byte equality, not JSON equivalence: key order, indentation and the
    // trailing newline all have to survive, because the classifier compares
    // what a write WOULD emit against what is on disk.
    expect(readFileSync(config, "utf-8")).toBe(first);
    // A converged row composes no effect at all, so the file is not even
    // reopened for writing.
    expect(statSync(config).mtimeMs).toBe(firstMtime);
  });

  it("holds exactly one pragma entry after three runs", async () => {
    const { cwd, config } = cursorProject();
    await install(cwd);
    await install(cwd);
    await install(cwd);
    const servers = JSON.parse(readFileSync(config, "utf-8")).mcpServers;
    expect(Object.keys(servers).filter((k) => k === "pragma")).toHaveLength(1);
    expect(Object.keys(servers)).toEqual(["pragma"]);
  });

  it("reports the second run as already configured, not as work done", async () => {
    const { cwd, config } = cursorProject();
    await install(cwd);
    const detection = await detectMcp(bootRuntime(FLAGS, cwd), "project");
    expect(mcpGroupState(detection, config)).toBe("configured");
  });
});

// =============================================================================
// 2. Undo removes exactly what we own
// =============================================================================

describe("undo removes our key and nothing else", () => {
  it("restores a config carrying other servers byte-for-byte", async () => {
    const { cwd, config } = cursorProject();
    // A config that already holds someone else's server, written the way the
    // merge writes (so the comparison is about OUR key, not about formatting).
    writeFileSync(
      config,
      `${JSON.stringify(
        { mcpServers: { other: { command: "other-server", args: ["run"] } } },
        null,
        2,
      )}\n`,
    );
    const before = readFileSync(config, "utf-8");

    await install(cwd);
    expect(
      JSON.parse(readFileSync(config, "utf-8")).mcpServers.pragma,
    ).toBeDefined();

    await undo(cwd);

    expect(readFileSync(config, "utf-8")).toBe(before);
    const after = JSON.parse(readFileSync(config, "utf-8"));
    expect(after.mcpServers.other).toEqual({
      command: "other-server",
      args: ["run"],
    });
    expect(after.mcpServers.pragma).toBeUndefined();
  });

  it("preserves unrelated top-level keys another tool added", async () => {
    const { cwd, config } = cursorProject();
    writeFileSync(
      config,
      `${JSON.stringify(
        {
          $schema: "https://example.invalid/schema.json",
          mcpServers: { other: { command: "other-server" } },
          telemetry: { enabled: false },
        },
        null,
        2,
      )}\n`,
    );
    const before = readFileSync(config, "utf-8");

    await install(cwd);
    const mid = JSON.parse(readFileSync(config, "utf-8"));
    // Present through the INSTALL, not only after the undo.
    expect(mid.$schema).toBe("https://example.invalid/schema.json");
    expect(mid.telemetry).toEqual({ enabled: false });

    await undo(cwd);
    expect(readFileSync(config, "utf-8")).toBe(before);
  });

  it("is a no-op on a file we never wrote", async () => {
    const { cwd, config } = cursorProject();
    writeFileSync(
      config,
      `${JSON.stringify(
        { mcpServers: { other: { command: "other-server" } } },
        null,
        2,
      )}\n`,
    );
    const before = readFileSync(config, "utf-8");

    const outcome = await undo(cwd);

    expect(outcome.exitCode).toBe(0);
    expect(readFileSync(config, "utf-8")).toBe(before);
  });

  it("is a no-op the second time", async () => {
    const { cwd, config } = cursorProject();
    await install(cwd);
    await undo(cwd);
    const afterFirst = existsSync(config)
      ? readFileSync(config, "utf-8")
      : null;

    const outcome = await undo(cwd);

    expect(outcome.exitCode).toBe(0);
    expect(existsSync(config) ? readFileSync(config, "utf-8") : null).toBe(
      afterFirst,
    );
  });
});

// =============================================================================
// 3. Never corrupt
// =============================================================================

describe("a config we cannot understand is refused, never overwritten", () => {
  it("fails closed on unparseable JSON and leaves the bytes alone", async () => {
    const { cwd, config } = cursorProject();
    const garbage = '{ "mcpServers": { "other": { not json at all\n';
    writeFileSync(config, garbage);

    let thrown: unknown;
    try {
      await install(cwd);
    } catch (error) {
      thrown = error;
    }

    // Either the run raises, or it reports the row as failed — what must NOT
    // happen is the file being replaced with a config of our own devising.
    expect(readFileSync(config, "utf-8")).toBe(garbage);
    expect(thrown).toBeDefined();
  });

  it("names the file it refused rather than a generic parse complaint", async () => {
    const { cwd, config } = cursorProject();
    writeFileSync(config, "{ broken\n");
    let message = "";
    try {
      await install(cwd);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain(config);
  });
});

// =============================================================================
// 4. Never semantically inconsistent
// =============================================================================

describe("every drift shape converges in one write, then stays converged", () => {
  /** Seed a pragma entry of some shape, then assert drift → repair → converge. */
  const convergesFrom = async (seeded: Record<string, unknown>) => {
    const { cwd, config } = cursorProject();
    writeFileSync(
      config,
      `${JSON.stringify({ mcpServers: { pragma: seeded } }, null, 2)}\n`,
    );

    const before = await detectMcp(bootRuntime(FLAGS, cwd), "project");
    expect(mcpGroupState(before, config)).toBe("drifted");

    await install(cwd);
    const repaired = readFileSync(config, "utf-8");

    const after = await detectMcp(bootRuntime(FLAGS, cwd), "project");
    expect(mcpGroupState(after, config)).toBe("configured");

    // A second run after the repair changes nothing.
    await install(cwd);
    expect(readFileSync(config, "utf-8")).toBe(repaired);
    return { cwd, config };
  };

  it("repairs a stale command", async () => {
    await convergesFrom({ command: "pragma-old", args: ["mcp", "serve"] });
  });

  it("repairs the pre-rename single-token argv — the `mcp serve` migration", async () => {
    // The rename of the server verb makes every entry written before it point
    // at a spelling that no longer serves. It has to repair itself on the next
    // ordinary run, with no flag and no prompt.
    const { config } = await convergesFrom({
      command: "pragma",
      args: ["mcp"],
    });
    expect(
      JSON.parse(readFileSync(config, "utf-8")).mcpServers.pragma.args,
    ).toEqual(["mcp", "serve"]);
  });

  it("repairs a global entry still carrying a cwd from before that fix", async () => {
    const cwd = tmp("pragma-mcpc-proj-");
    mkdirSync(join(cwd, ".windsurf"), { recursive: true });
    const config = join(
      process.env.HOME ?? "",
      ".codeium",
      "windsurf",
      "mcp_config.json",
    );
    mkdirSync(join(process.env.HOME ?? "", ".codeium", "windsurf"), {
      recursive: true,
    });
    writeFileSync(
      config,
      `${JSON.stringify(
        {
          mcpServers: {
            pragma: {
              command: "pragma",
              args: ["mcp", "serve"],
              cwd: "/home/u/Downloads",
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const before = await detectMcp(bootRuntime(FLAGS, cwd), "global");
    expect(mcpGroupState(before, config)).toBe("drifted");

    await install(cwd, GLOBAL);

    const entry = JSON.parse(readFileSync(config, "utf-8")).mcpServers.pragma;
    expect(entry).toEqual({ command: "pragma", args: ["mcp", "serve"] });
    expect(entry).not.toHaveProperty("cwd");
    const after = await detectMcp(bootRuntime(FLAGS, cwd), "global");
    expect(mcpGroupState(after, config)).toBe("configured");
  });

  it("leaves extra keys on OUR entry alone — they are not ours to drop", async () => {
    // A user (or a harness) may add fields the serializer does not control.
    // The matcher compares controlled fields only, so this reads as configured
    // and the extra key survives untouched.
    const { cwd, config } = cursorProject();
    await install(cwd);
    const parsed = JSON.parse(readFileSync(config, "utf-8"));
    parsed.mcpServers.pragma.timeout = 5000;
    writeFileSync(config, `${JSON.stringify(parsed, null, 2)}\n`);

    const detection = await detectMcp(bootRuntime(FLAGS, cwd), "project");
    expect(mcpGroupState(detection, config)).toBe("configured");

    await install(cwd);
    expect(
      JSON.parse(readFileSync(config, "utf-8")).mcpServers.pragma.timeout,
    ).toBe(5000);
  });

  it("keeps the two scopes of one harness independent", async () => {
    // Cursor has both a project file and a home file. Writing one scope must
    // not touch the other, and each converges on its own terms — the project
    // entry records a cwd, the global entry omits it.
    const cwd = tmp("pragma-mcpc-proj-");
    mkdirSync(join(cwd, ".cursor"), { recursive: true });
    const projectConfig = join(cwd, ".cursor", "mcp.json");
    const globalConfig = join(process.env.HOME ?? "", ".cursor", "mcp.json");

    await install(cwd, LOCAL);
    expect(existsSync(projectConfig)).toBe(true);
    expect(existsSync(globalConfig)).toBe(false);

    await install(cwd, GLOBAL);
    const projectBytes = readFileSync(projectConfig, "utf-8");
    expect(existsSync(globalConfig)).toBe(true);

    // Each scope carries its own shape.
    expect(JSON.parse(projectBytes).mcpServers.pragma.cwd).toBe(cwd);
    expect(
      JSON.parse(readFileSync(globalConfig, "utf-8")).mcpServers.pragma,
    ).not.toHaveProperty("cwd");

    // Undoing one scope leaves the other intact.
    await undo(cwd, GLOBAL);
    expect(readFileSync(projectConfig, "utf-8")).toBe(projectBytes);
  });
});

// =============================================================================
// 5. Round-trip, not just forward
// =============================================================================

describe("forward and reverse agree about what is ours", () => {
  it("install → undo → install lands byte-identical to the first install", async () => {
    const { cwd, config } = cursorProject();
    await install(cwd);
    const first = readFileSync(config, "utf-8");

    await undo(cwd);
    await install(cwd);

    expect(readFileSync(config, "utf-8")).toBe(first);
  });

  it("install → install → undo removes the entry fully, not half of it", async () => {
    const { cwd, config } = cursorProject();
    writeFileSync(
      config,
      `${JSON.stringify(
        { mcpServers: { other: { command: "other-server" } } },
        null,
        2,
      )}\n`,
    );
    const before = readFileSync(config, "utf-8");

    await install(cwd);
    await install(cwd);
    await undo(cwd);

    expect(readFileSync(config, "utf-8")).toBe(before);
    expect(
      JSON.parse(readFileSync(config, "utf-8")).mcpServers.pragma,
    ).toBeUndefined();
  });
});
