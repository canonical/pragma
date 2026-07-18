/**
 * Assembly-level eval cases (PR7 nouns) — the orientation surface `capabilities`
 * + `instructions` + native prompts add ABOVE per-noun tools.
 *
 * These run over the shared `env.mcp` (the live catalog), so they cost no fixture
 * boot: the catalog, the tool descriptions, the instructions, and the handshake
 * capabilities are all storeless. The NL-intent ("prompt") cases assert that an
 * agent following the annotated catalog would reach the right tool — the payoff
 * of the orientation surface. Data-backed prompt/graph cases live in
 * `cases/effectful.ts`. R2: no noun list is hard-coded — the catalog is read live.
 */

import assert from "node:assert/strict";
import { capabilities } from "../../../capabilities/index.js";
import { emitSurface } from "../../../kernel/spec/emitSurface.js";
import type { EvalCase } from "../harness.js";

/** Assert an intent maps to a tool by checking that tool's advertised description. */
function assertIntentTool(
  tools: { name: string; description?: string }[],
  tool: string,
  pattern: RegExp,
): void {
  const found = tools.find((t) => t.name === tool);
  assert.ok(found, `expected a \`${tool}\` tool in the catalog`);
  assert.match(String(found?.description ?? ""), pattern);
}

export const assemblyEvalCases: readonly EvalCase[] = [
  {
    id: "tool-capabilities-annotates-every-live-tool",
    kind: "tool",
    input:
      "the `capabilities` tool catalogs EVERY live tool, each with a non-empty use_when hint.",
    async expect({ mcp }) {
      const result = await mcp.callTool("capabilities");
      const data = result.data as {
        tools: { name: string; use_when: string }[];
      };
      const live = (await mcp.listTools()).map((t) => t.name).sort();
      assert.deepEqual(
        data.tools.map((t) => t.name).sort(),
        live,
        "capabilities catalog must cover exactly the live tool set",
      );
      for (const tool of data.tools) {
        assert.ok(
          tool.use_when.length > 0,
          `tool ${tool.name} has an empty use_when`,
        );
      }
    },
  },
  {
    id: "content-capabilities-counts-derived-from-categories",
    kind: "content",
    input:
      "the capabilities counts are derived (total == tools.length; category sizes sum to total; orientation=1, diagnostic=2).",
    async expect({ mcp }) {
      const result = await mcp.callTool("capabilities");
      const data = result.data as {
        tools: unknown[];
        counts: {
          total: number;
          read: number;
          write: number;
          orientation: number;
          diagnostic: number;
        };
      };
      const { counts } = data;
      assert.equal(counts.total, data.tools.length);
      assert.equal(
        counts.read + counts.write + counts.orientation + counts.diagnostic,
        counts.total,
      );
      assert.equal(counts.orientation, 1);
      assert.equal(counts.diagnostic, 2);
    },
  },
  {
    id: "content-capabilities-selfconsistent-with-emitsurface",
    kind: "content",
    input:
      "the capabilities catalog tool set equals emitSurface(capabilities).mcpSurface.tools (grammar self-consistency).",
    async expect({ mcp }) {
      const result = await mcp.callTool("capabilities");
      const data = result.data as { tools: { name: string }[] };
      assert.deepEqual(
        data.tools.map((t) => t.name).sort(),
        [...emitSurface(capabilities).mcpSurface.tools].sort(),
      );
    },
  },
  {
    id: "content-instructions-present-and-mentions-discovery",
    kind: "content",
    input:
      "the server sends handshake instructions that mention `capabilities` and the discovery flow.",
    async expect({ mcp }) {
      const instructions = mcp.instructions();
      assert.ok(instructions, "expected server instructions at initialize");
      assert.match(String(instructions), /capabilities/);
      assert.match(String(instructions).toLowerCase(), /discovery/);
    },
  },
  {
    id: "content-handshake-advertises-tools-resources-prompts",
    kind: "content",
    input:
      "the initialize handshake advertises the tools, resources, AND prompts capabilities.",
    async expect({ mcp }) {
      const caps = mcp.serverCapabilities();
      assert.ok(caps?.tools, "expected a tools capability");
      assert.ok(caps?.resources, "expected a resources capability");
      assert.ok(caps?.prompts, "expected a prompts capability");
    },
  },
  {
    id: "content-capabilities-covers-listtools",
    kind: "content",
    input:
      "every tool the server lists appears in the capabilities catalog (no live tool is invisible to orientation).",
    async expect({ mcp }) {
      const result = await mcp.callTool("capabilities");
      const cataloged = new Set(
        (result.data as { tools: { name: string }[] }).tools.map((t) => t.name),
      );
      for (const tool of await mcp.listTools()) {
        assert.ok(
          cataloged.has(tool.name),
          `tool ${tool.name} is not in the capabilities catalog`,
        );
      }
    },
  },
  {
    id: "prompt-scaffold-maps-to-create-component",
    kind: "prompt",
    input: '"Scaffold a new component" should map to `create_component`.',
    async expect({ mcp }) {
      assertIntentTool(await mcp.listTools(), "create_component", /component/i);
    },
  },
  {
    id: "prompt-environment-maps-to-doctor",
    kind: "prompt",
    input: '"What is wrong with my environment?" should map to `doctor`.',
    async expect({ mcp }) {
      assertIntentTool(
        await mcp.listTools(),
        "doctor",
        /diagnos|environment|health/i,
      );
    },
  },
  {
    id: "prompt-sparql-maps-to-graph-query",
    kind: "prompt",
    input: '"Run an arbitrary SPARQL query" should map to `graph_query`.',
    async expect({ mcp }) {
      assertIntentTool(await mcp.listTools(), "graph_query", /sparql/i);
    },
  },
  {
    id: "prompt-set-tier-maps-to-config-tier",
    kind: "prompt",
    input: '"Set the active tier" should map to `config_tier`.',
    async expect({ mcp }) {
      assertIntentTool(await mcp.listTools(), "config_tier", /tier/i);
    },
  },
  {
    id: "prompt-tokens-config-maps-to-token-add-config",
    kind: "prompt",
    input:
      '"Generate a terrazzo tokens config" should map to `token_add-config`.',
    async expect({ mcp }) {
      assertIntentTool(
        await mcp.listTools(),
        "token_add-config",
        /token|terrazzo/i,
      );
    },
  },
  {
    id: "prompt-browse-prompts-maps-to-prompt-list",
    kind: "prompt",
    input:
      '"Browse the available workflow prompts" should map to `prompt_list`.',
    async expect({ mcp }) {
      assertIntentTool(await mcp.listTools(), "prompt_list", /prompt/i);
    },
  },
];
