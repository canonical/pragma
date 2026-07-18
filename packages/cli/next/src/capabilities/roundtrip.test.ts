import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { VERSION } from "../constants.js";
import { executeVerb } from "../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../kernel/runtime/boot.js";
import type { GlobalFlags } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { projectMcp } from "../testing/helpers/projectMcp.js";
import { configModule } from "./config/index.js";
import { infoModule } from "./info/index.js";

const infoVerb = infoModule.verbs[0] as VerbSpec;
const showVerb = configModule.verbs[0] as VerbSpec;
const NO_MUT = { dryRun: false, undo: false, yes: false };

function flags(format: "plain" | "json", llm = false): GlobalFlags {
  return { llm, autoLlm: false, format, verbose: false };
}

const originalConfigHome = process.env.XDG_CONFIG_HOME;

/** A fresh XDG config home + a fresh cwd, so config resolves deterministically. */
function freshEnv(): string {
  process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "pragma-rt-cfg-"));
  return mkdtempSync(join(tmpdir(), "pragma-rt-cwd-"));
}

afterEach(() => {
  process.env.XDG_CONFIG_HOME = originalConfigHome;
});

describe("info round-trip", () => {
  it("renders plain and llm on the CLI", async () => {
    const cwd = freshEnv();
    const plain = await executeVerb(
      infoVerb,
      {},
      NO_MUT,
      bootRuntime(flags("plain"), cwd),
    );
    expect(plain.stdout).toContain(`pragma v${VERSION}`);
    expect(plain.stdout).toContain("channel: normal");

    const llm = await executeVerb(
      infoVerb,
      {},
      NO_MUT,
      bootRuntime(flags("plain", true), cwd),
    );
    expect(llm.stdout).toContain(`# pragma v${VERSION}`);
  });

  it("CLI --format json deep-equals the MCP tool envelope", async () => {
    const cwd = freshEnv();
    const cli = await executeVerb(
      infoVerb,
      {},
      NO_MUT,
      bootRuntime(flags("json"), cwd),
    );
    const cliEnvelope = JSON.parse(cli.stdout as string);

    const mcp = await projectMcp([infoModule], cwd);
    const mcpEnvelope = await mcp.callTool("info");
    await mcp.cleanup();

    expect(cliEnvelope).toEqual(mcpEnvelope);
    expect(cliEnvelope.ok).toBe(true);
    expect((cliEnvelope.data as { version: string }).version).toBe(VERSION);
  });
});

describe("config show round-trip", () => {
  it("renders plain with origin markers on the CLI", async () => {
    const cwd = freshEnv();
    const plain = await executeVerb(
      showVerb,
      {},
      NO_MUT,
      bootRuntime(flags("plain"), cwd),
    );
    expect(plain.stdout).toContain("channel: normal");
    expect(plain.stdout).toContain("detail: standard");
  });

  it("CLI --format json deep-equals the MCP tool envelope", async () => {
    const cwd = freshEnv();
    const cli = await executeVerb(
      showVerb,
      {},
      NO_MUT,
      bootRuntime(flags("json"), cwd),
    );
    const cliEnvelope = JSON.parse(cli.stdout as string);

    const mcp = await projectMcp([configModule], cwd);
    const mcpEnvelope = await mcp.callTool("config_show");
    await mcp.cleanup();

    expect(cliEnvelope).toEqual(mcpEnvelope);
    expect(
      (cliEnvelope.data as { config: { channel: string } }).config.channel,
    ).toBe("normal");
  });
});
