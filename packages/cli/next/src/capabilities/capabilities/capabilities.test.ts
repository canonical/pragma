import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { emitSurface } from "../../kernel/spec/emitSurface.js";
import type { GlobalFlags, VerbSpec } from "../../kernel/spec/types.js";
import { capabilities } from "../index.js";
import { capabilitiesSelfVerb } from "./capabilities.verb.js";
import { buildCapabilitiesData, liveTools, mutatingTools } from "./catalog.js";
import { TOOL_HINTS } from "./hints.js";
import type { CapabilitiesData } from "./types.js";

const NO_MUT = { dryRun: false, undo: false, yes: false };
const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};

const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma2-caps-"));
const tools = liveTools(capabilities);
const data = buildCapabilitiesData(capabilities);

describe("capabilities catalog — grammar-derived, drift-guarded (PROTECTED)", () => {
  it("every live tool has a TOOL_HINTS entry (no missing hint)", () => {
    const missing = tools.filter((tool) => !(tool in TOOL_HINTS));
    expect(missing).toEqual([]);
  });

  it("no TOOL_HINTS key is stale (every hint names a live tool)", () => {
    const live = new Set(tools);
    const stale = Object.keys(TOOL_HINTS).filter((name) => !live.has(name));
    expect(stale).toEqual([]);
  });

  it("hint categories agree with the live surface (write ⟺ mutates)", () => {
    const mutating = mutatingTools(capabilities);
    for (const tool of tools) {
      const isWrite = TOOL_HINTS[tool]?.category === "write";
      expect(
        isWrite,
        `${tool}: hint category "${TOOL_HINTS[tool]?.category}" vs mutates=${mutating.has(tool)}`,
      ).toBe(mutating.has(tool));
    }
  });

  it("the catalog tool set equals the live emitted tool set, in order", () => {
    expect(data.tools.map((tool) => tool.name)).toEqual(
      emitSurface(capabilities).mcpSurface.tools,
    );
  });

  it("every catalog tool carries a non-empty use_when", () => {
    for (const tool of data.tools) {
      expect(tool.use_when.length, tool.name).toBeGreaterThan(0);
    }
  });

  it("counts are derived from the live categories (never pinned)", () => {
    const { counts } = data;
    expect(counts.total).toBe(data.tools.length);
    expect(
      counts.read + counts.write + counts.orientation + counts.diagnostic,
    ).toBe(counts.total);
    expect(counts.orientation).toBe(1); // exactly `capabilities`
    expect(counts.diagnostic).toBe(2); // `doctor` + `info`
    expect(counts.write).toBe(mutatingTools(capabilities).size);
  });

  it("the discovery sequence stage 2 lists the live *_sample tools", () => {
    const samples = tools.filter((tool) => tool.endsWith("_sample"));
    const stage2 = data.discovery_sequence.find((stage) => stage.stage === 2);
    expect(stage2).toBeDefined();
    for (const sample of samples) {
      expect(stage2?.purpose).toContain(sample);
    }
  });

  it("reports the v2 output limits (plain/json/llm, condensed retired)", () => {
    expect(data.limits.output_modes).toEqual(["plain", "json", "llm"]);
    expect(data.limits.condensed_available).toBe(false);
  });

  it("carries the three orientation conventions", () => {
    expect(data.conventions.system.length).toBeGreaterThan(0);
    expect(data.conventions.model).toContain("tier");
    expect(data.conventions.querying).toContain("RDF");
  });
});

describe("capabilities verb — storeless (PROTECTED)", () => {
  it("does not construct the store", async () => {
    const runtime = bootRuntime(FLAGS, freshCwd());
    const outcome = await executeVerb(
      capabilitiesSelfVerb as VerbSpec,
      {},
      NO_MUT,
      runtime,
    );
    expect(outcome.exitCode).toBe(0);
    expect(runtime.store.booted).toBe(false);
  });

  it("the verb run resolves the same data the catalog builds", async () => {
    const result = (await capabilitiesSelfVerb.run(
      {},
      bootRuntime(FLAGS, freshCwd()),
    )) as CapabilitiesData;
    expect(result.tools.map((tool) => tool.name)).toEqual(
      data.tools.map((tool) => tool.name),
    );
  });
});
