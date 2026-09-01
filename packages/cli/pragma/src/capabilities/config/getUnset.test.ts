/**
 * `config get <key>` and `config unset <key>` — the single-value reader and
 * the field clearer (COVENANT).
 *
 * The pair closes the config family: `show` dumps everything, `get` answers
 * one question, `set` writes one field, `unset` removes one. These tests pin
 * the emitted covenant slices, the shell contract `get`'s plain form exists
 * for (the BARE value on stdout, nothing at all when the field is unset), the
 * layering `get` reports through `source`, and `unset`'s round trip with
 * `set` — including that it is a mutation over MCP, plan-first like every
 * other write.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { globalConfigPath } from "../../kernel/config/paths.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import {
  executeVerb,
  extractParams,
} from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import { emitVerb } from "../../kernel/spec/emitSurface.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { configModule } from "./index.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const JSON_FLAGS: GlobalFlags = { ...FLAGS, format: "json" };
const REAL = { dryRun: false, undo: false, yes: false };

const verb = (name: string): VerbSpec =>
  configModule.verbs.find((v) => v.path[1] === name) as VerbSpec;
const getVerb = verb("get");
const setVerb = verb("set");
const unsetVerb = verb("unset");

let prevXdg: string | undefined;
const roots: string[] = [];
const tmp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

beforeEach(() => {
  prevXdg = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tmp("pragma-cfgget-xdg-");
});
afterEach(() => {
  process.env.XDG_CONFIG_HOME = prevXdg;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

function readGlobal(): Record<string, unknown> {
  return JSON.parse(readFileSync(globalConfigPath(), "utf-8"));
}

describe("config get/unset — covenant-exact emission (PROTECTED)", () => {
  it("emits the one-positional read and the mutating clearer", () => {
    expect(emitVerb(getVerb)).toEqual({
      v: "get",
      args: ["<key>"],
      mcp: "config_get",
    });
    expect(emitVerb(unsetVerb)).toEqual({
      v: "unset",
      args: ["<key>"],
      mutates: true,
      mcp: "config_unset",
    });
  });

  it("both take the field enum, so an unknown key never reaches disk", () => {
    for (const spec of [getVerb, unsetVerb]) {
      let caught: unknown;
      try {
        extractParams(spec.params, ["bogus"], {});
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(PragmaError);
      expect((caught as PragmaError).validOptions).toEqual([
        "tier",
        "channel",
        "detail",
      ]);
    }
  });
});

describe("config get — one value, scriptably", () => {
  it("prints the BARE value on stdout so shell substitution works", async () => {
    const cwd = tmp("pragma-proj-");
    await executeVerb(
      setVerb,
      { key: "tier", value: "apps/lxd" },
      REAL,
      bootRuntime(FLAGS, cwd),
    );
    const outcome = await executeVerb(
      getVerb,
      { key: "tier" },
      REAL,
      bootRuntime(FLAGS, cwd),
    );
    // The whole stdout is the value and a newline — no label, no table.
    expect(outcome.stdout).toBe("apps/lxd\n");
    expect(outcome.exitCode).toBe(0);
  });

  it("prints the same bare value down a PIPE, where llm is auto-selected", async () => {
    // The command exists to fill a shell variable, and command substitution
    // pipes stdout — so the auto-llm form has to be the value too, or
    // `TIER=$(… config get tier)` captures a decorated sentence.
    const cwd = tmp("pragma-proj-");
    await executeVerb(
      setVerb,
      { key: "tier", value: "apps/lxd" },
      REAL,
      bootRuntime(FLAGS, cwd),
    );
    const piped = await executeVerb(
      getVerb,
      { key: "tier" },
      REAL,
      bootRuntime({ ...FLAGS, llm: true, autoLlm: true, format: "llm" }, cwd),
    );
    expect(piped.stdout).toBe("apps/lxd\n");
  });

  it("prints NOTHING for an unset field, and still exits 0", async () => {
    const outcome = await executeVerb(
      getVerb,
      { key: "tier" },
      REAL,
      bootRuntime(FLAGS, tmp("pragma-proj-")),
    );
    expect(outcome.stdout).toBe("");
    expect(outcome.exitCode).toBe(0);
  });

  it("reports the layer that supplied the value", async () => {
    const cwd = tmp("pragma-proj-");
    // A field nobody wrote resolves from the built-in defaults.
    const fromDefault = await executeVerb(
      getVerb,
      { key: "channel" },
      REAL,
      bootRuntime(JSON_FLAGS, cwd),
    );
    expect(JSON.parse(fromDefault.stdout ?? "").data).toMatchObject({
      field: "channel",
      value: "normal",
      source: "default",
    });

    await executeVerb(
      setVerb,
      { key: "channel", value: "experimental" },
      REAL,
      bootRuntime(FLAGS, cwd),
    );
    const fromGlobal = await executeVerb(
      getVerb,
      { key: "channel" },
      REAL,
      bootRuntime(JSON_FLAGS, cwd),
    );
    expect(JSON.parse(fromGlobal.stdout ?? "").data).toMatchObject({
      field: "channel",
      value: "experimental",
      source: "global",
    });
  });

  it("never boots the store — reading config is a storeless act", async () => {
    const rt = bootRuntime(FLAGS, tmp("pragma-proj-"));
    await executeVerb(getVerb, { key: "tier" }, REAL, rt);
    expect(rt.store.booted).toBe(false);
  });
});

describe("config unset — the counterpart of set", () => {
  it("removes the field so the default applies again", async () => {
    const cwd = tmp("pragma-proj-");
    await executeVerb(
      setVerb,
      { key: "tier", value: "apps/lxd" },
      REAL,
      bootRuntime(FLAGS, cwd),
    );
    expect(readGlobal().tier).toBe("apps/lxd");

    const outcome = await executeVerb(
      unsetVerb,
      { key: "tier" },
      REAL,
      bootRuntime(FLAGS, cwd),
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("Reset tier");
    expect("tier" in readGlobal()).toBe(false);

    // And the read agrees: the field is gone, so `get` prints nothing.
    const after = await executeVerb(
      getVerb,
      { key: "tier" },
      REAL,
      bootRuntime(FLAGS, cwd),
    );
    expect(after.stdout).toBe("");
  });

  it("clearing a field that was never set is not an error", async () => {
    const outcome = await executeVerb(
      unsetVerb,
      { key: "tier" },
      REAL,
      bootRuntime(FLAGS, tmp("pragma-proj-")),
    );
    expect(outcome.exitCode).toBe(0);
  });
});

describe("config get/unset — MCP parity", () => {
  it("config_get reads without confirm; config_unset plans first, then writes", async () => {
    const cwd = tmp("pragma-proj-");
    const mcp = await projectMcp([configModule], cwd);
    await mcp.callTool("config_set", {
      key: "tier",
      value: "apps/lxd",
      confirm: true,
    });

    const read = await mcp.callTool("config_get", { key: "tier" });
    expect(read.ok).toBe(true);
    expect(read.data).toMatchObject({ field: "tier", value: "apps/lxd" });

    const plan = await mcp.callTool("config_unset", { key: "tier" });
    expect(plan.meta).toMatchObject({ planOnly: true, confirmRequired: true });
    expect(readGlobal().tier).toBe("apps/lxd");

    const done = await mcp.callTool("config_unset", {
      key: "tier",
      confirm: true,
    });
    await mcp.cleanup();

    expect(done.ok).toBe(true);
    expect(done.data).toMatchObject({ field: "tier", reset: true });
    expect(existsSync(globalConfigPath())).toBe(true);
    expect("tier" in readGlobal()).toBe(false);
  });
});
