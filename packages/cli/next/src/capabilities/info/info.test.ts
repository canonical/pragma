/**
 * `pragma info` — the PR6 network + entity-count enrichment.
 *
 * Mocks the registry (behind / offline / up-to-date) so the update-check is
 * deterministic, asserts the storeless invariant (info NEVER boots the store),
 * and pins CLI-json ≡ MCP `info` parity. The pack-index entity total is
 * storeless (embedded fallback), so it is always present here.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VERSION } from "../../constants.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags, PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { infoModule } from "./index.js";
import type { InfoData } from "./types.js";

const infoVerb = infoModule.verbs[0] as VerbSpec;
const FLAGS_JSON: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "json",
  verbose: false,
};
const NO_MUT = { dryRun: false, undo: false, yes: false };

const roots: string[] = [];
const tmpCwd = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "pragma-info-"));
  roots.push(dir);
  return dir;
};

/** Stub the global fetch: return a registry doc with `latest`, or fail (offline). */
function stubRegistry(latest: string | "offline"): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (latest === "offline") throw new Error("network down");
      return {
        ok: true,
        json: async () => ({ "dist-tags": { latest } }),
      } as unknown as Response;
    }),
  );
}

let prevXdg: string | undefined;
beforeEach(() => {
  prevXdg = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tmpCwd();
});
afterEach(() => {
  process.env.XDG_CONFIG_HOME = prevXdg;
  vi.unstubAllGlobals();
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

async function collect(rt: PragmaRuntime): Promise<InfoData> {
  const outcome = await executeVerb(infoVerb, {}, NO_MUT, rt);
  return JSON.parse(outcome.stdout as string).data as InfoData;
}

describe("info — update-check enrichment", () => {
  it("sets `update` when a newer release is published", async () => {
    stubRegistry("99.0.0");
    const rt = bootRuntime(FLAGS_JSON, tmpCwd());
    const data = await collect(rt);

    expect(data.update).toMatchObject({ current: VERSION, latest: "99.0.0" });
    expect(data.update?.command).toContain("@canonical/pragma-cli");
    expect(data.updateSkipped).toBe(false);
    // The storeless invariant: the enrichment must NOT boot the store.
    expect(rt.store.booted).toBe(false);
  });

  it("marks `updateSkipped` when the registry is unreachable", async () => {
    stubRegistry("offline");
    const data = await collect(bootRuntime(FLAGS_JSON, tmpCwd()));
    expect(data.update).toBeUndefined();
    expect(data.updateSkipped).toBe(true);
  });

  it("reports no update when already at the latest version", async () => {
    stubRegistry(VERSION);
    const data = await collect(bootRuntime(FLAGS_JSON, tmpCwd()));
    expect(data.update).toBeUndefined();
    expect(data.updateSkipped).toBe(false);
  });
});

describe("info — storeless entity total", () => {
  it("carries a numeric entity total from the storeless pack index", async () => {
    stubRegistry(VERSION);
    const rt = bootRuntime(FLAGS_JSON, tmpCwd());
    const data = await collect(rt);
    expect(typeof data.entities).toBe("number");
    expect(rt.store.booted).toBe(false);
  });
});

describe("info — CLI-json ≡ MCP info (PROTECTED)", () => {
  it("both surfaces return the same enriched envelope", async () => {
    stubRegistry(VERSION);
    const cwd = tmpCwd();
    const cli = await executeVerb(
      infoVerb,
      {},
      NO_MUT,
      bootRuntime(FLAGS_JSON, cwd),
    );
    const cliEnvelope = JSON.parse(cli.stdout as string);

    const mcp = await projectMcp([infoModule], cwd);
    const mcpEnvelope = await mcp.callTool("info");
    await mcp.cleanup();

    expect(cliEnvelope).toEqual(mcpEnvelope);
    expect(cliEnvelope.ok).toBe(true);
  });
});
