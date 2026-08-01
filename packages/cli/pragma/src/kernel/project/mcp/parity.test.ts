import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  fixtureEffectsModule,
  fixturePreviewModule,
  touchPath,
} from "../../../testing/fixtures/fixtureCapability.js";
import { projectMcp } from "../../../testing/helpers/projectMcp.js";
import { bootRuntime } from "../../runtime/boot.js";
import type { GlobalFlags } from "../../runtime/types.js";
import type { VerbSpec } from "../../spec/types.js";
import { executeVerb } from "../cli/dispatch.js";

const echoVerb = fixtureEffectsModule.verbs.find(
  (v) => v.path[1] === "echo",
) as VerbSpec;

const JSON_FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "json",
  verbose: false,
};

describe("envelope parity CLI-json vs MCP (PROTECTED)", () => {
  it("the echo read verb produces a byte-identical envelope on both surfaces", async () => {
    const cli = await executeVerb(
      echoVerb,
      { message: "hi" },
      { dryRun: false, undo: false, yes: false },
      bootRuntime(JSON_FLAGS),
    );
    const cliEnvelope = JSON.parse(cli.stdout as string);

    const mcp = await projectMcp([fixtureEffectsModule]);
    const mcpEnvelope = await mcp.callTool("probe_echo", { message: "hi" });
    await mcp.cleanup();

    expect(cliEnvelope).toEqual(mcpEnvelope);
    expect(cliEnvelope).toEqual({
      ok: true,
      data: { echoed: "hi" },
      meta: {},
    });
  });
});

describe("MCP mutation plan-first / confirm (PROTECTED)", () => {
  it("returns a plan and performs no effect without confirm", async () => {
    const mcp = await projectMcp([fixtureEffectsModule]);
    const name = `no-confirm-${Date.now()}`;

    const planned = await mcp.callTool("probe_touch", { name });
    await mcp.cleanup();

    expect(planned.ok).toBe(true);
    expect(planned.meta).toEqual({ planOnly: true, confirmRequired: true });
    const { plan } = planned.data as { plan: string[] };
    expect(plan.length).toBeGreaterThan(0);
    expect(existsSync(touchPath(name))).toBe(false);
  });

  it("executes and writes with confirm:true", async () => {
    const mcp = await projectMcp([fixtureEffectsModule]);
    const name = `confirmed-${Date.now()}`;

    const done = await mcp.callTool("probe_touch", { name, confirm: true });
    await mcp.cleanup();

    expect(done).toEqual({ ok: true, data: { touched: name }, meta: {} });
    expect(existsSync(touchPath(name))).toBe(true);
  });
});

describe("MCP plan-first is honest (PRA-104)", () => {
  it("returns the ERROR a confirmed run would hit, not a confident plan", async () => {
    // The CLI twin of this guard lives in cli/dispatch.test.ts: the same
    // mutation, the same missing source, exiting nonzero instead of printing a
    // plan. Both surfaces run one interpreter, so they cannot drift.
    const dir = mkdtempSync(join(tmpdir(), "pragma-graft-mcp-"));
    const missing = join(dir, "gone");

    const mcp = await projectMcp([fixturePreviewModule], dir);
    const planned = await mcp.callTool("probe_graft", { source: missing });
    await mcp.cleanup();

    expect(planned.ok).toBe(false);
    expect(JSON.stringify(planned.error)).toContain(missing);
    expect(existsSync(`${missing}.grafted`)).toBe(false);
  });

  it("returns a plan, and writes nothing, when the read would succeed", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-graft-mcp-"));
    const source = join(dir, "present.txt");
    writeFileSync(source, "content\n");

    const mcp = await projectMcp([fixturePreviewModule], dir);
    const planned = await mcp.callTool("probe_graft", { source });
    await mcp.cleanup();

    expect(planned.ok).toBe(true);
    expect(planned.meta).toEqual({ planOnly: true, confirmRequired: true });
    expect((planned.data as { plan: string[] }).plan).toContain(
      `Write file: ${source}.grafted (8 bytes)`,
    );
    expect(readdirSync(dir)).toEqual(["present.txt"]);
  });
});
