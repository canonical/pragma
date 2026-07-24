/**
 * `config set <key> <value>` — the one-command config setter (PR9, COVENANT).
 *
 * Pins the emitted covenant slice (`{ v:"set", args:["<key>","<value>"],
 * mutates:true, mcp:"config_set" }`), proves it drives the shared per-field
 * write path (set / reset-sentinel / enum-backstop), rejects an unknown key and
 * an out-of-set enum value with INVALID_INPUT, and holds MCP plan-first/confirm
 * parity. Since AV-228 B3 retired `config tier/channel/detail`, `config set` is
 * the sole config setter — `config set <field> <value>` is the migration path.
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
import { configModule } from "./index.js";
import { runSet } from "./runSet.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const REAL = { dryRun: false, undo: false, yes: false };
const DRY = { dryRun: true, undo: false, yes: false };

const setVerb = configModule.verbs.find((v) => v.path[1] === "set") as VerbSpec;

let prevXdg: string | undefined;
const roots: string[] = [];
const tmp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

beforeEach(() => {
  prevXdg = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tmp("pragma-cfgset-xdg-");
});
afterEach(() => {
  process.env.XDG_CONFIG_HOME = prevXdg;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

function readGlobal(): Record<string, unknown> {
  return JSON.parse(readFileSync(globalConfigPath(), "utf-8"));
}

describe("config set — covenant-exact emission (PROTECTED)", () => {
  it("emits the two-positional slice with the config_set tool", () => {
    expect(emitVerb(setVerb)).toEqual({
      v: "set",
      args: ["<key>", "<value>"],
      mutates: true,
      mcp: "config_set",
    });
  });
});

describe("config set — write & reset (shares the per-field path)", () => {
  it("set tier writes the field to the GLOBAL config, never booting the store", async () => {
    const rt: PragmaRuntime = bootRuntime(FLAGS, tmp("pragma-proj-"));
    const outcome = await executeVerb(
      setVerb,
      { key: "tier", value: "apps/lxd" },
      REAL,
      rt,
    );

    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("Set tier = apps/lxd");
    expect(readGlobal().tier).toBe("apps/lxd");
    expect(rt.store.booted).toBe(false);
  });

  it("set channel/detail write their enum value", async () => {
    const rt = bootRuntime(FLAGS, tmp("pragma-proj-"));
    await executeVerb(
      setVerb,
      { key: "channel", value: "experimental" },
      REAL,
      rt,
    );
    await executeVerb(setVerb, { key: "detail", value: "detailed" }, REAL, rt);
    const written = readGlobal();
    expect(written.channel).toBe("experimental");
    expect(written.detail).toBe("detailed");
  });

  it("a reset sentinel via set removes the tier field", async () => {
    const cwd = tmp("pragma-proj-");
    await executeVerb(
      setVerb,
      { key: "tier", value: "apps/lxd" },
      REAL,
      bootRuntime(FLAGS, cwd),
    );
    const outcome = await executeVerb(
      setVerb,
      { key: "tier", value: "none" },
      REAL,
      bootRuntime(FLAGS, cwd),
    );
    expect(outcome.stdout).toContain("Reset tier");
    expect("tier" in readGlobal()).toBe(false);
  });
});

describe("config set — input rejection (INVALID_INPUT)", () => {
  it("the CLI enum coerce rejects an unknown key with the valid field names", () => {
    let caught: unknown;
    try {
      extractParams(setVerb.params, ["bogus", "x"], {});
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PragmaError);
    expect((caught as PragmaError).code).toBe("INVALID_INPUT");
    expect((caught as PragmaError).validOptions).toEqual([
      "tier",
      "channel",
      "detail",
    ]);
  });

  it("runSet backstops an unknown key before it reaches a field", () => {
    expect(() => runSet({ key: "bogus", value: "x" })).toThrow(PragmaError);
    try {
      runSet({ key: "bogus", value: "x" });
    } catch (error) {
      expect((error as PragmaError).code).toBe("INVALID_INPUT");
      expect((error as PragmaError).validOptions).toEqual([
        "tier",
        "channel",
        "detail",
      ]);
    }
  });

  it("an out-of-set enum value is rejected by the shared runField backstop", () => {
    expect(() => runSet({ key: "channel", value: "bogus" })).toThrow(
      /Invalid channel/,
    );
    // Sanity: the same key with a real member does not throw.
    expect(() =>
      runSet({ key: "channel", value: CHANNELS[0] as string }),
    ).not.toThrow();
  });
});

describe("config set — dry-run plan", () => {
  it("--dry-run shows the WriteFile plan and writes nothing", async () => {
    const rt = bootRuntime(FLAGS, tmp("pragma-proj-"));
    const outcome = await executeVerb(
      setVerb,
      { key: "tier", value: "apps/lxd" },
      DRY,
      rt,
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("Write file");
    expect(existsSync(globalConfigPath())).toBe(false);
  });
});

describe("config set — MCP plan-first / confirm parity", () => {
  it("config_set returns a plan without confirm, writes with confirm:true", async () => {
    const cwd = tmp("pragma-proj-");
    const mcp = await projectMcp([configModule], cwd);

    const plan = await mcp.callTool("config_set", {
      key: "tier",
      value: "apps/lxd",
    });
    expect(plan.ok).toBe(true);
    expect(plan.meta).toMatchObject({ planOnly: true, confirmRequired: true });
    const planLines = (plan.data as { plan: string[] }).plan;
    expect(planLines.some((line) => line.includes("Write file"))).toBe(true);
    expect(existsSync(globalConfigPath())).toBe(false);

    const done = await mcp.callTool("config_set", {
      key: "tier",
      value: "apps/lxd",
      confirm: true,
    });
    await mcp.cleanup();

    expect(done.ok).toBe(true);
    expect(done.data).toMatchObject({ field: "tier", value: "apps/lxd" });
    expect(readGlobal().tier).toBe("apps/lxd");
  });
});
