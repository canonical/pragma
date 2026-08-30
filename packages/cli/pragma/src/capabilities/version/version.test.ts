/**
 * `pragma version` — the command form of `--version`.
 *
 * The verb exists because users type it; the ONLY thing worth pinning is that
 * it is not a second answer to the same question. The process-boundary cell
 * compares the two spellings byte for byte through the shipped entry, so a
 * change to either one that does not change the other reddens here. The rest
 * pins the covenant slice and the storeless, tool-free shape.
 */

import { describe, expect, it } from "vitest";
import { VERSION } from "../../constants.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import { emitVerb } from "../../kernel/spec/emitSurface.js";
import { runCli } from "../../testing/helpers/runCli.js";
import { versionModule } from "./index.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const REAL = { dryRun: false, undo: false, yes: false };
const versionVerb = versionModule.verbs[0];

describe("version — covenant-exact emission (PROTECTED)", () => {
  it("emits a no-argument self-verb with NO tool", () => {
    // The version already rides `info` and the MCP handshake's serverInfo, so
    // a tool here would be a third way to ask one question.
    expect(emitVerb(versionVerb)).toEqual({ v: "version", mcp: false });
  });
});

describe("version — one value, two spellings of the same read", () => {
  it("prints the version and never boots the store", async () => {
    const rt = bootRuntime(FLAGS, process.cwd());
    const outcome = await executeVerb(versionVerb, {}, REAL, rt);
    expect(outcome.stdout).toBe(`${VERSION}\n`);
    expect(outcome.exitCode).toBe(0);
    expect(rt.store.booted).toBe(false);
  });

  it("json carries the value under a named field, not a bare scalar", async () => {
    const outcome = await executeVerb(
      versionVerb,
      {},
      REAL,
      bootRuntime({ ...FLAGS, format: "json" }, process.cwd()),
    );
    expect(JSON.parse(outcome.stdout ?? "").data).toEqual({
      version: VERSION,
    });
  });

  it("the verb and the flag print the SAME bytes through the shipped entry", () => {
    const fromVerb = runCli(["version"]);
    const fromFlag = runCli(["--version"]);
    expect(fromVerb.exitCode).toBe(0);
    expect(fromFlag.exitCode).toBe(0);
    expect(fromVerb.stdout).toBe(fromFlag.stdout);
    expect(fromVerb.stdout).toBe(`${VERSION}\n`);
  });
});
