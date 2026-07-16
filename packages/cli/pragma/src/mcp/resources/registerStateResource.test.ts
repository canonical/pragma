import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMcpClient } from "#testing";
import { VERSION } from "../../constants.js";
import type { StatePayload } from "../../domains/shared/state/index.js";
import type { TestMcpClientResult } from "../../testing/types.js";
import { STATE_URI } from "./registerStateResource.js";

let dir: string;
let mcp: TestMcpClientResult;

beforeAll(async () => {
  // A workspace with a project config so origin provenance is observable.
  dir = mkdtempSync(join(tmpdir(), "pragma-state-resource-"));
  writeFileSync(join(dir, "pragma.config.json"), '{"tier":"apps"}');
  // The runtime config mirrors the staged file: the boot-time snapshot
  // (instructions) reads the runtime, the live resource re-reads the disk.
  mcp = await createTestMcpClient({
    cwd: dir,
    config: { tier: "apps", channel: "normal" },
  });
});

afterAll(async () => {
  await mcp.cleanup();
  rmSync(dir, { recursive: true, force: true });
});

function parseState(result: {
  contents: ({ text?: string; blob?: string } & Record<string, unknown>)[];
}): StatePayload {
  const first = result.contents.at(0);
  expect(first?.mimeType).toBe("application/json");
  return JSON.parse(first?.text as string) as StatePayload;
}

describe("pragma://state resource", () => {
  it("is listed alongside the graph resources", async () => {
    const { resources } = await mcp.client.listResources();
    const state = resources.find((r) => r.uri === STATE_URI);
    expect(state).toBeDefined();
    expect(state?.name).toBe("state");
    expect(state?.description).toContain("durable vs per-call");
  });

  it("serves the locked payload shape", async () => {
    const result = await mcp.client.readResource({ uri: STATE_URI });
    const payload = parseState(
      result as unknown as Parameters<typeof parseState>[0],
    );

    expect(payload.version).toBe(VERSION);
    expect(Object.keys(payload.state)).toEqual([
      "tier",
      "channel",
      "detail",
      "packages",
    ]);
    expect(payload.state.tier.value).toBe("apps");
    expect(payload.state.tier.origin).toBe("project");
    expect(payload.state.tier.change.durable).toContain("config_tier");
  });

  it("reflects a config write during the session", async () => {
    const before = parseState(
      (await mcp.client.readResource({
        uri: STATE_URI,
      })) as unknown as Parameters<typeof parseState>[0],
    );
    expect(before.state.detail.value).toBeNull();

    await mcp.client.callTool({
      name: "config_detail",
      arguments: { level: "digest" },
    });

    const after = parseState(
      (await mcp.client.readResource({
        uri: STATE_URI,
      })) as unknown as Parameters<typeof parseState>[0],
    );
    expect(after.state.detail.value).toBe("digest");
    expect(after.state.detail.origin).toBe("project");
  });

  it("returns the instructions at initialize with the snapshot caveat", () => {
    const instructions = mcp.client.getInstructions();
    expect(instructions).toBeDefined();
    expect(instructions).toContain("Current state at connect: tier=apps");
    expect(instructions).toContain(
      "re-read pragma://state after any config_* call",
    );
    expect(instructions).toContain("pragma://state");
  });
});
