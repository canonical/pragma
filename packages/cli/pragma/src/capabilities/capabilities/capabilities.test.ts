import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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

const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-caps-"));
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

  it("the catalog's write set is the covenant's mutating set, name for name", () => {
    // THE SAME PROPERTY THIS SUITE ALWAYS HELD, moved to the payload. It used
    // to read `TOOL_HINTS[tool].category === "write"` and compare that to
    // `mutates` — which is exactly what proved the authored column was
    // derivable and got it deleted. Now that nothing authors a category,
    // asserting the hint table agrees would assert nothing at all.
    //
    // Not a recomputation of `catalog.ts`: this reads the EMITTED SURFACE's
    // per-verb `mutates`/`mcp` and compares the resulting names to the payload
    // the tool ships, pinning the two surfaces to each other rather than
    // re-running the derivation.
    const emittedMutators = new Set<string>();
    for (const { verbs } of Object.values(emitSurface(capabilities).nouns)) {
      for (const verb of verbs) {
        if (verb.mutates && typeof verb.mcp === "string") {
          emittedMutators.add(verb.mcp);
        }
      }
    }
    const catalogWrites = data.tools
      .filter((tool) => tool.category === "write")
      .map((tool) => tool.name)
      .sort();
    expect(catalogWrites).toEqual([...emittedMutators].sort());
    // Non-vacuous: an empty write set would satisfy the equality above only if
    // the surface had no mutating verb, and it has several. This is the reading
    // that broke — a missing hint degraded to `read`, so a fork reported every
    // mutating tool as a read and `counts.write` as 0.
    expect(catalogWrites.length).toBeGreaterThan(0);
  });

  it("the category is not read from the hint table at all (the fork case)", () => {
    // `ToolHint` no longer carries `category`, so `tsc` is most of this proof.
    // What `tsc` cannot say is that a future edit will not reintroduce a
    // hint-shaped fallback — which is the precise shape of the defect: the old
    // `hint?.category ?? "read"` meant a fork that had not authored this table
    // reported every mutating tool as a read.
    const source = readFileSync(
      fileURLToPath(new URL("./catalog.ts", import.meta.url)),
      "utf-8",
    );
    expect(source).not.toMatch(/category:\s*(?:hint|TOOL_HINTS)/);
    // And the derivation is still reachable from a name a reader would look
    // for, so deleting the constant fails here rather than silently widening
    // `read`.
    expect(source).toContain("CATEGORY_BY_KERNEL_TOOL");
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

  it("reports the output limits (plain/json/llm, no condensed mode)", () => {
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
