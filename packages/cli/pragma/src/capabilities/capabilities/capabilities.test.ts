import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { renderCall } from "../../kernel/spec/call.js";
import { emitSurface, toolName } from "../../kernel/spec/emitSurface.js";
import { exampleCall } from "../../kernel/spec/guidance.js";
import type { GlobalFlags, VerbSpec } from "../../kernel/spec/types.js";
import { capabilities } from "../index.js";
import { capabilitiesSelfVerb } from "./capabilities.verb.js";
import { buildCapabilitiesData, liveTools } from "./catalog.js";
import type { CapabilitiesData } from "./types.js";

const NO_MUT = { dryRun: false, undo: false, yes: false };
const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};

const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-caps-"));
const tools = liveTools(capabilities);
const data = buildCapabilitiesData(capabilities);
/** The tools whose verbs mutate, read straight off the registry. */
const mutating = new Set(
  capabilities
    .flatMap((module) => module.verbs)
    .filter((verb) => verb.capability.mutates && verb.capability.mcp.expose)
    .map((verb) => toolName(verb.path)),
);

describe("capabilities catalog — grammar-derived, drift-guarded (PROTECTED)", () => {
  // The catalogue has no table of its own to drift: each entry is read off the
  // tool's verb. That every verb DECLARES its guidance is `callRule.test.ts`.
  it("every entry is its own verb's guidance: question, category, example", () => {
    const verbs = new Map(
      capabilities.flatMap((module) =>
        module.verbs.map((verb) => [toolName(verb.path), verb] as const),
      ),
    );
    for (const tool of data.tools) {
      const verb = verbs.get(tool.name) as VerbSpec;
      expect(tool.use_when, tool.name).toBe(verb.useWhen);
      const example = exampleCall(verb);
      expect(tool.example, tool.name).toBe(
        example ? renderCall(example, "mcp") : undefined,
      );
    }
  });

  it("a verb declaring no guidance (a third-party story may) degrades to its summary", () => {
    const {
      useWhen: _useWhen,
      example: _example,
      ...bare
    } = capabilitiesSelfVerb;
    const [tool] = buildCapabilitiesData([
      { name: "capabilities", verbs: [bare as VerbSpec] },
    ]).tools;
    expect(tool).toEqual({
      name: "capabilities",
      category: "orientation",
      use_when: capabilitiesSelfVerb.summary,
    });
  });

  it("categories agree with the live surface (write ⟺ mutates)", () => {
    for (const tool of data.tools) {
      expect(tool.category === "write", tool.name).toBe(
        mutating.has(tool.name),
      );
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
    expect(counts.write).toBe(mutating.size);
  });

  it("the discovery sequence's sample stage lists the live *_sample tools", () => {
    const samples = tools.filter((tool) => tool.endsWith("_sample"));
    const sampleStage = data.discovery_sequence.find(
      (stage) => stage.tool === "*_sample",
    );
    expect(sampleStage).toBeDefined();
    for (const sample of samples) {
      expect(sampleStage?.purpose).toContain(sample);
    }
  });

  it("the discovery sequence pre-checks the store before the sample stage (store-blind guard)", () => {
    const seq = data.discovery_sequence;
    const storeCheck = seq.findIndex(
      (stage) => stage.tool === "sources_status",
    );
    const sample = seq.findIndex((stage) => stage.tool === "*_sample");
    // A cold agent must be told to verify/build the store BEFORE being sent into
    // a store read, or it walks straight into STORE_UNAVAILABLE.
    expect(storeCheck).toBeGreaterThanOrEqual(0);
    expect(storeCheck).toBeLessThan(sample);
    expect(seq[storeCheck]?.purpose).toContain("sources_update");
  });

  it("reports the v2 output limits (plain/json/llm, condensed retired)", () => {
    expect(data.limits.output_modes).toEqual(["plain", "json", "llm"]);
    expect(data.limits.condensed_available).toBe(false);
  });

  it("carries the four orientation conventions", () => {
    expect(data.conventions.system.length).toBeGreaterThan(0);
    expect(data.conventions.model).toContain("tier");
    expect(data.conventions.querying).toContain("RDF");
    expect(data.conventions.mutations.length).toBeGreaterThan(0);
  });

  it("surfaces the plan-first/confirm convention so the confirm gate isn't trial-and-error (D2)", () => {
    // A mutating tool without `confirm` returns a plan and writes nothing; agents
    // must learn this from orientation, not by tripping the gate.
    const { mutations } = data.conventions;
    expect(mutations).toMatch(/plan/i);
    expect(mutations).toContain("confirm");
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
