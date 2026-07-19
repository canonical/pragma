/**
 * `config tier` / `channel` / `detail` — storeless, covenant-exact setters.
 *
 * Pins the emitted shape against the golden slice, exercises set / reset-sentinel
 * / enum-reject / `--dry-run` plan / MCP plan-first-vs-confirm, and holds the
 * storeless invariant (a config write never boots the store).
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { globalConfigPath } from "../../kernel/config/paths.js";
import { CHANNELS } from "../../kernel/config/types.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import {
  executeVerb,
  extractParams,
} from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags, PragmaRuntime } from "../../kernel/runtime/types.js";
import { emitVerb } from "../../kernel/spec/emitSurface.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { CONFIG_FIELDS } from "./fields.js";
import { configModule } from "./index.js";
import { runField } from "./runField.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const REAL = { dryRun: false, undo: false, yes: false };
const DRY = { dryRun: true, undo: false, yes: false };

const verbOf = (field: string): VerbSpec =>
  configModule.verbs.find((v) => v.path[1] === field) as VerbSpec;
const tierVerb = verbOf("tier");
const channelVerb = verbOf("channel");
const detailVerb = verbOf("detail");

let prevXdg: string | undefined;
const roots: string[] = [];
const tmp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

beforeEach(() => {
  prevXdg = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tmp("pragma-cfgfield-xdg-");
});
afterEach(() => {
  process.env.XDG_CONFIG_HOME = prevXdg;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

function readGlobal(): Record<string, unknown> {
  return JSON.parse(readFileSync(globalConfigPath(), "utf-8"));
}

describe("config setters — covenant-exact emission (PROTECTED)", () => {
  it("emits the golden slice for each field", () => {
    expect(emitVerb(tierVerb)).toEqual({
      v: "tier",
      args: ["<path>"],
      mutates: true,
      mcp: "config_tier",
    });
    expect(emitVerb(channelVerb)).toEqual({
      v: "channel",
      args: ["<name>"],
      mutates: true,
      mcp: "config_channel",
    });
    expect(emitVerb(detailVerb)).toEqual({
      v: "detail",
      args: ["<level>"],
      mutates: true,
      mcp: "config_detail",
    });
  });
});

describe("config setters — write & reset", () => {
  it("set writes the field to the GLOBAL config and never boots the store", async () => {
    const rt: PragmaRuntime = bootRuntime(FLAGS, tmp("pragma-proj-"));
    const outcome = await executeVerb(tierVerb, { path: "apps/lxd" }, REAL, rt);

    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("Set tier = apps/lxd");
    expect(readGlobal().tier).toBe("apps/lxd");
    // Storeless invariant: a config write never touches the store factory.
    expect(rt.store.booted).toBe(false);
  });

  it("channel/detail write their enum value", async () => {
    const rt = bootRuntime(FLAGS, tmp("pragma-proj-"));
    await executeVerb(channelVerb, { name: "experimental" }, REAL, rt);
    await executeVerb(detailVerb, { level: "detailed" }, REAL, rt);
    const written = readGlobal();
    expect(written.channel).toBe("experimental");
    expect(written.detail).toBe("detailed");
  });

  it("a reset sentinel removes the tier field", async () => {
    const cwd = tmp("pragma-proj-");
    await executeVerb(
      tierVerb,
      { path: "apps/lxd" },
      REAL,
      bootRuntime(FLAGS, cwd),
    );
    expect(readGlobal().tier).toBe("apps/lxd");

    const outcome = await executeVerb(
      tierVerb,
      { path: "none" },
      REAL,
      bootRuntime(FLAGS, cwd),
    );
    expect(outcome.stdout).toContain("Reset tier");
    expect("tier" in readGlobal()).toBe(false);
  });
});

describe("config setters — enum rejection", () => {
  it("the CLI coerce layer rejects a non-member with INVALID_INPUT + validOptions", () => {
    let caught: unknown;
    try {
      extractParams(channelVerb.params, ["bogus"], {});
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PragmaError);
    expect((caught as PragmaError).code).toBe("INVALID_INPUT");
    expect((caught as PragmaError).validOptions).toEqual([...CHANNELS]);
  });

  it("runField backstops a bad enum value before it reaches disk", () => {
    const channelSpec = CONFIG_FIELDS.find((s) => s.field === "channel");
    expect(() =>
      runField(channelSpec as (typeof CONFIG_FIELDS)[number], {
        name: "bogus",
      }),
    ).toThrow(/Invalid channel/);
  });
});

describe("config setters — dry-run plan", () => {
  it("--dry-run shows the WriteFile plan and writes nothing", async () => {
    const rt = bootRuntime(FLAGS, tmp("pragma-proj-"));
    const outcome = await executeVerb(tierVerb, { path: "apps/lxd" }, DRY, rt);

    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("Write file");
    expect(outcome.stdout).toContain(globalConfigPath());
    expect(existsSync(globalConfigPath())).toBe(false);
  });
});

describe("config setters — MCP plan-first / confirm parity", () => {
  it("config_tier returns a plan without confirm, writes with confirm:true", async () => {
    const cwd = tmp("pragma-proj-");
    const mcp = await projectMcp([configModule], cwd);

    const plan = await mcp.callTool("config_tier", { path: "apps/lxd" });
    expect(plan.ok).toBe(true);
    expect(plan.meta).toMatchObject({ planOnly: true, confirmRequired: true });
    const planLines = (plan.data as { plan: string[] }).plan;
    expect(planLines.some((line) => line.includes("Write file"))).toBe(true);
    expect(existsSync(globalConfigPath())).toBe(false);

    const done = await mcp.callTool("config_tier", {
      path: "apps/lxd",
      confirm: true,
    });
    await mcp.cleanup();

    expect(done.ok).toBe(true);
    expect(done.data).toMatchObject({ field: "tier", value: "apps/lxd" });
    expect(readGlobal().tier).toBe("apps/lxd");
  });
});
