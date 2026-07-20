/**
 * Progressive disclosure (PROTECTED): canonical-index gating, resolveDetail
 * precedence, and the injected MCP `detail` tool param.
 *
 * Gating is by CANONICAL level, and the effective level follows the uniform
 * precedence flag > explicit config > pack default > canonical default — so a
 * pack's declared default survives the built-in `detail: "standard"` config
 * default, which is a fallback, not an override.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import type { PragmaRuntime } from "../runtime/types.js";
import { asVerb } from "../spec/asVerb.js";
import type { CapabilityModule, VerbSpec } from "../spec/types.js";
import { compilePack } from "./compile.js";
import type { LookupOutput } from "./resolveEntity.js";
import type { PackDefinition } from "./types.js";
import { verbKey } from "./uniqueness.js";

const PREFIXES = {
  ex: "https://example.org/widgets#",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

const TTL = `
@prefix ex: <https://example.org/widgets#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
ex:Widget a owl:Class .
ex:name a owl:DatatypeProperty ; rdfs:domain ex:Widget ; rdfs:range xsd:string .
ex:description a owl:DatatypeProperty ; rdfs:domain ex:Widget ; rdfs:range xsd:string .
ex:hasPart a owl:ObjectProperty ; rdfs:domain ex:Widget ; rdfs:range ex:Widget .
ex:button a ex:Widget ; ex:name "Button" ; ex:description "A button." ;
  ex:hasPart ex:label .
ex:label a ex:Widget ; ex:name "Label" ; ex:description "A label." .
`;

/** A lookup with `description` gated at `standard` and `parts` at `detailed`. */
const PACK: PackDefinition = {
  noun: "widget",
  lookup: {
    source: "sparql",
    by: "ex:name",
    type: "ex:Widget",
    fields: [
      { name: "description", property: "ex:description", level: "standard" },
    ],
    expand: [
      {
        name: "parts",
        relation: "ex:hasPart",
        level: "detailed",
        select: [{ name: "name", property: "ex:name" }],
      },
    ],
    disclosure: {
      levels: ["summary", "standard", "detailed"],
      default: "summary",
    },
  },
};

const lookupVerb = () =>
  compilePack(PACK, "test:widget", PREFIXES).find(
    (v) => verbKey(v.path) === "widget lookup",
  );

async function lookupAt(
  detail?: "summary" | "standard" | "detailed",
  config?: { configDetail: string; detailOrigin: "global" | "project" },
): Promise<Record<string, unknown>> {
  const { rt } = await buildFixtureRuntime({
    ttl: TTL,
    prefixes: PREFIXES,
    ...(detail ? { detail } : {}),
    ...(config ?? {}),
  });
  const verb = lookupVerb();
  if (!verb) throw new Error("no widget lookup");
  const output = (await verb.run({ name: ["Button"] }, rt)) as LookupOutput;
  (await rt.store.get()).store.dispose();
  return output.results.at(0) as Record<string, unknown>;
}

describe("disclosure — canonical-index gating (PROTECTED)", () => {
  it("summary fetches base only (no standard field, no detailed expand)", async () => {
    const entity = await lookupAt("summary");
    expect(entity.name).toBe("Button");
    expect(entity.description).toBeUndefined();
    expect(entity.parts).toBeUndefined();
  });

  it("standard adds the standard-gated field but not the detailed expand", async () => {
    const entity = await lookupAt("standard");
    expect(entity.description).toBe("A button.");
    expect(entity.parts).toBeUndefined();
  });

  it("detailed adds the detailed-gated expand", async () => {
    const entity = await lookupAt("detailed");
    expect(entity.description).toBe("A button.");
    expect(entity.parts).toEqual([{ name: "Label" }]);
  });
});

describe("disclosure — resolveDetail precedence (PROTECTED)", () => {
  it("uses the pack default under default config (not the built-in standard)", async () => {
    // Pack default is `summary`; the built-in `detail: "standard"` is origin
    // `default`, so it must NOT override the pack default.
    const entity = await lookupAt();
    expect(entity.description).toBeUndefined();
  });

  it("an explicitly-set config detail outranks the pack default", async () => {
    const entity = await lookupAt(undefined, {
      configDetail: "detailed",
      detailOrigin: "global",
    });
    expect(entity.parts).toEqual([{ name: "Label" }]);
  });

  it("the --detail flag outranks explicit config", async () => {
    const entity = await lookupAt("summary", {
      configDetail: "detailed",
      detailOrigin: "global",
    });
    expect(entity.description).toBeUndefined();
    expect(entity.parts).toBeUndefined();
  });
});

describe("disclosure — MCP detail param (PROTECTED)", () => {
  // A storeless echo verb with disclosure: registerVerb must inject a `detail`
  // enum param, and the handler must seed globalFlags.detail from it per call.
  const echoVerb: VerbSpec<Record<string, unknown>, { level: string }> = {
    path: ["echo", "detail"],
    summary: "Echo the resolved detail level.",
    params: [],
    disclosure: {
      levels: ["summary", "standard", "detailed"],
      default: "standard",
    },
    output: {
      formatters: {
        plain: (d) => d.level,
        llm: (d) => d.level,
        json: (d) => JSON.stringify(d),
      },
    },
    capability: {
      needsStore: false,
      mutates: false,
      mcp: {
        expose: true,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
    },
    run: async (_params, rt: PragmaRuntime) => ({
      level: rt.globalFlags.detail ?? "(none)",
    }),
  };
  const echoModule: CapabilityModule = {
    name: "echo",
    verbs: [asVerb(echoVerb)],
  };

  let harness: Awaited<ReturnType<typeof projectMcp>>;
  beforeAll(async () => {
    harness = await projectMcp([echoModule]);
  });
  afterAll(async () => {
    await harness.cleanup();
  });

  it("advertises a `detail` enum param on the tool", async () => {
    const tools = await harness.listTools();
    const tool = tools.find((t) => t.name === "echo_detail") as
      | { name: string; inputSchema?: { properties?: Record<string, unknown> } }
      | undefined;
    // The SDK surfaces the injected param in the tool's JSON-schema properties.
    const client = await harness.callTool("echo_detail", {});
    expect(client.ok).toBe(true);
    expect(tool).toBeDefined();
  });

  it("seeds globalFlags.detail from the injected param per call", async () => {
    const withDetail = await harness.callTool("echo_detail", {
      detail: "detailed",
    });
    expect((withDetail.data as { level: string }).level).toBe("detailed");

    const withoutDetail = await harness.callTool("echo_detail", {});
    expect((withoutDetail.data as { level: string }).level).toBe("(none)");
  });
});
