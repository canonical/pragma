import { describe, expect, it } from "vitest";
import { VERSION } from "#constants";
import { buildCapabilitiesCommand } from "./commands/index.js";
import { TOOL_CATALOG } from "./data/index.js";
import { buildCapabilitiesData } from "./mcp/index.js";

describe("buildCapabilitiesData", () => {
  it("returns correct version", () => {
    const data = buildCapabilitiesData();
    expect(data.version).toBe(VERSION);
  });

  it("includes conventions with three fields", () => {
    const data = buildCapabilitiesData();
    expect(data.conventions.system).toBeTruthy();
    expect(data.conventions.model).toBeTruthy();
    expect(data.conventions.querying).toBeTruthy();
  });

  it("includes a 3-stage discovery sequence", () => {
    const data = buildCapabilitiesData();
    expect(data.discovery_sequence).toHaveLength(3);
    expect(data.discovery_sequence[0]?.stage).toBe(1);
    expect(data.discovery_sequence[0]?.tool).toBe("capabilities");
    expect(data.discovery_sequence[1]?.tool).toBe("*_sample");
    expect(data.discovery_sequence[2]?.tool).toBe("domain tools");
  });

  it("includes every tool from TOOL_CATALOG", () => {
    const data = buildCapabilitiesData();
    expect(data.tools).toHaveLength(TOOL_CATALOG.length);
    expect(data.tools).toHaveLength(34);
  });

  it("every tool has a non-empty use_when", () => {
    const data = buildCapabilitiesData();
    for (const tool of data.tools) {
      expect(tool.use_when.length).toBeGreaterThan(0);
    }
  });

  it("counts match tool catalog category lengths", () => {
    const data = buildCapabilitiesData();
    expect(data.counts.total).toBe(34);
    expect(data.counts.read).toBe(
      TOOL_CATALOG.filter((t) => t.category === "read").length,
    );
    expect(data.counts.write).toBe(
      TOOL_CATALOG.filter((t) => t.category === "write").length,
    );
    expect(data.counts.orientation).toBe(
      TOOL_CATALOG.filter((t) => t.category === "orientation").length,
    );
    expect(data.counts.diagnostic).toBe(
      TOOL_CATALOG.filter((t) => t.category === "diagnostic").length,
    );
  });

  it("includes limits section", () => {
    const data = buildCapabilitiesData();
    expect(data.limits.output_modes).toContain("text");
    expect(data.limits.output_modes).toContain("json");
    expect(data.limits.output_modes).toContain("llm");
    expect(data.limits.condensed_available).toBe(true);
  });
});

describe("buildCapabilitiesCommand", () => {
  it("returns an output result with plain renderer", async () => {
    const cmd = buildCapabilitiesCommand();
    expect(cmd.path).toEqual(["capabilities"]);

    const result = await cmd.execute({}, {} as never);
    expect(result.tag).toBe("output");
    if (result.tag !== "output") throw new Error("Expected output result");

    const text = result.render.plain(result.value) as string;
    expect(text).toContain("Conventions");
    expect(text).toContain("Discovery Sequence");
    expect(text).toContain("block_list");
    expect(text).toContain("read");
    expect(text).toContain("34 tools");
  });

  it("emits valid JSON when --format json is requested", async () => {
    const cmd = buildCapabilitiesCommand();
    const ctx = {
      cwd: "/test",
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    };

    const result = await cmd.execute({}, ctx);
    if (result.tag !== "output") throw new Error("Expected output result");

    const text = result.render.plain(result.value) as string;
    expect(() => JSON.parse(text)).not.toThrow();
    expect(JSON.parse(text)).toMatchObject({ version: expect.any(String) });
  });

  it("does not require a store or runtime", async () => {
    const cmd = buildCapabilitiesCommand();
    // Execute with no context — should succeed because it's static
    const result = await cmd.execute({}, {} as never);
    expect(result.tag).toBe("output");
  });
});
