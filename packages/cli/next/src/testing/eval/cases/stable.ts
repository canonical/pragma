/**
 * Stable-now eval seed cases — need no PR3 noun (PR1/PR2 foundation +
 * PR4's own harness only): the embedded pack, the live MCP catalog (whatever
 * it currently contains — no noun is hard-coded), and one small self-contained
 * disclosure fixture. `cases/readNouns.ts` (commit 4) extends this list once
 * PR3's read nouns are live.
 */

import assert from "node:assert/strict";
import { compilePack } from "../../../kernel/packs/compile.js";
import type { PackDefinition } from "../../../kernel/packs/types.js";
import type { CapabilityModule } from "../../../kernel/spec/types.js";
import { bootFixtureRuntime } from "../../helpers/fixtureGraph.js";
import { projectMcp } from "../../helpers/projectMcp.js";
import type { EvalCase } from "../harness.js";

/** A tiny, self-contained fixture — NOT the shared canonical graph, so this
 * case stays independent of PR3's noun set (parameterized elsewhere). */
const WIDGET_PREFIXES = {
  ex: "https://example.org/eval-widgets#",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};
const WIDGET_TTL = `
@prefix ex: <https://example.org/eval-widgets#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
ex:Widget a owl:Class .
ex:name a owl:DatatypeProperty ; rdfs:domain ex:Widget ; rdfs:range xsd:string .
ex:description a owl:DatatypeProperty ; rdfs:domain ex:Widget ; rdfs:range xsd:string .
ex:hasPart a owl:ObjectProperty ; rdfs:domain ex:Widget ; rdfs:range ex:Widget .
ex:button a ex:Widget ; ex:name "Button" ; ex:description "A button." ; ex:hasPart ex:label .
ex:label a ex:Widget ; ex:name "Label" .
`;
const WIDGET_PACK: PackDefinition = {
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

/** The condensed-SDL token-budget ceiling the covenant reserves (seeded, not enforced). */
const CONDENSED_SDL_TOKEN_BUDGET = 8000;
/** The old suite's one token anchor: ~1 token per 4 characters. */
const CHARS_PER_TOKEN = 4;

export const stableEvalCases: readonly EvalCase[] = [
  {
    id: "tool-sparql-count-positive",
    kind: "tool",
    input:
      "SPARQL COUNT(*) over the embedded pack resolves > 0 — the same escape-hatch facade the live `graph query` verb (PR6, tool graph_query) delegates to (PARITY_GAPS: graph-query-deferred).",
    async expect({ runtime }) {
      const result = await runtime.query.sparql(
        "SELECT (COUNT(*) AS ?c) WHERE { ?s ?p ?o }",
      );
      assert.equal(result.type, "select");
      const count =
        result.type === "select" ? Number(result.bindings[0]?.c ?? 0) : 0;
      assert.ok(count > 0, `expected count > 0, got ${count}`);
    },
  },
  {
    id: "content-condensed-sdl-token-budget",
    kind: "content",
    input:
      "the aggregate live MCP tool catalog (name + description + inputSchema, whatever it currently contains) stays under the condensedSDL budget (<=8000 tokens, ~1 token/4 chars).",
    async expect({ mcp }) {
      const tools = await mcp.listTools();
      assert.ok(tools.length > 0, "expected at least one registered tool");
      const sdlText = tools
        .map(
          (tool) =>
            `${tool.name}\n${tool.description ?? ""}\n${JSON.stringify(tool.inputSchema ?? {})}`,
        )
        .join("\n");
      const estimatedTokens = Math.ceil(sdlText.length / CHARS_PER_TOKEN);
      assert.ok(
        estimatedTokens <= CONDENSED_SDL_TOKEN_BUDGET,
        `estimated ${estimatedTokens} tokens (${tools.length} tools) exceeds the ${CONDENSED_SDL_TOKEN_BUDGET}-token condensedSDL budget`,
      );
    },
  },
  {
    id: "disclosure-summary-omits-standard-and-detailed-fields",
    kind: "disclosure",
    input:
      "widget_lookup {detail:summary} omits standard/detailed-gated fields; {detail:detailed} includes them — proving the harness can express a disclosure case (the cross-noun sweep over PR3 nouns is B6, commit 4).",
    async expect() {
      const fixture = await bootFixtureRuntime({ ttl: WIDGET_TTL });
      try {
        const widgetModule: CapabilityModule = {
          name: "widget",
          verbs: compilePack(WIDGET_PACK, "test:widget", WIDGET_PREFIXES),
        };
        const mcp = await projectMcp([widgetModule], fixture.cwd);
        try {
          const summary = (await mcp.callTool("widget_lookup", {
            name: ["Button"],
            detail: "summary",
          })) as { data: { results: Record<string, unknown>[] } };
          const detailed = (await mcp.callTool("widget_lookup", {
            name: ["Button"],
            detail: "detailed",
          })) as { data: { results: Record<string, unknown>[] } };

          assert.equal(summary.data.results[0]?.description, undefined);
          assert.equal(detailed.data.results[0]?.description, "A button.");
          assert.deepEqual(detailed.data.results[0]?.parts, [
            { name: "Label" },
          ]);
        } finally {
          await mcp.cleanup();
        }
      } finally {
        await fixture.dispose();
      }
    },
  },
  {
    id: "prompt-version-check-maps-to-info",
    kind: "prompt",
    input:
      '"What version of pragma am I running?" should map to the `info` tool.',
    async expect({ mcp }) {
      const tools = await mcp.listTools();
      const info = tools.find((tool) => tool.name === "info");
      assert.ok(info, "expected an `info` tool in the catalog");
      assert.match(String(info?.description ?? ""), /version/i);
    },
  },
  {
    id: "prompt-config-question-maps-to-config-show",
    kind: "prompt",
    input:
      '"How is pragma configured right now?" should map to the `config_show` tool.',
    async expect({ mcp }) {
      const tools = await mcp.listTools();
      const configShow = tools.find((tool) => tool.name === "config_show");
      assert.ok(configShow, "expected a `config_show` tool in the catalog");
      assert.match(String(configShow?.description ?? ""), /config/i);
    },
  },
];
