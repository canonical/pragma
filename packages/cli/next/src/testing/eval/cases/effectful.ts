/**
 * Effectful eval cases (PR6 + PR7 nouns): the SPARQL escape hatch, the plan-first
 * mutations, the diagnostic self-verb, and the store-backed prompt content.
 *
 * Storeless cases (plan-first previews, doctor shape, invalid-query) run over the
 * shared `env.mcp` (no fixture cost). Data-backed cases build their OWN canonical
 * fixture (the `cases/readNouns.ts` pattern), so they stay independent of the
 * shared env. Anchor VALUES come from the canonical fixture this package controls;
 * noun/tool names are read from the live surface (R2).
 */

import assert from "node:assert/strict";
import { capabilities } from "../../../capabilities/index.js";
import {
  ALL_VISIBLE_CONFIG,
  CANONICAL_CONFIG,
  CANONICAL_TTL,
} from "../../fixtures/graph/canonical.js";
import { bootFixtureRuntime } from "../../helpers/fixtureGraph.js";
import { projectMcp } from "../../helpers/projectMcp.js";
import type { EvalCase } from "../harness.js";

/** Run one case's body against a fresh canonical fixture, always disposing. */
async function withCanonicalFixture(
  config: typeof CANONICAL_CONFIG | typeof ALL_VISIBLE_CONFIG,
  body: (mcp: Awaited<ReturnType<typeof projectMcp>>) => Promise<void>,
): Promise<void> {
  const fixture = await bootFixtureRuntime({ ttl: CANONICAL_TTL, config });
  try {
    const mcp = await projectMcp(capabilities, fixture.cwd);
    try {
      await body(mcp);
    } finally {
      await mcp.cleanup();
    }
  } finally {
    await fixture.dispose();
  }
}

export const effectfulEvalCases: readonly EvalCase[] = [
  {
    id: "tool-graph-query-counts-components",
    kind: "tool",
    input:
      "graph_query (the real PR6 verb, closing graph-query-deferred) counts exactly 4 ds:Component individuals in the canonical graph.",
    async expect() {
      await withCanonicalFixture(ALL_VISIBLE_CONFIG, async (mcp) => {
        const result = await mcp.callTool("graph_query", {
          sparql: "SELECT (COUNT(*) AS ?c) WHERE { ?comp a ds:Component }",
        });
        assert.equal(result.ok, true);
        // graph_query returns the serialized QueryResult ({ type, bindings, … }).
        const data = result.data as { bindings: { c: string }[] };
        assert.equal(Number(data.bindings[0]?.c), 4);
      });
    },
  },
  {
    id: "tool-graph-query-invalid-is-invalid-input",
    kind: "tool",
    input:
      "graph_query with a syntax error returns INVALID_INPUT (exit-2 class), not a crash.",
    async expect({ mcp }) {
      const result = await mcp.callTool("graph_query", {
        sparql: "NOT VALID SPARQL {{{",
      });
      assert.equal(result.ok, false);
      assert.equal((result.error as { code: string }).code, "INVALID_INPUT");
    },
  },
  {
    id: "tool-config-tier-is-plan-first",
    kind: "tool",
    input:
      "config_tier without `confirm` returns a plan (planOnly) and writes nothing — the uniform plan-first mutation contract.",
    async expect({ mcp }) {
      const result = await mcp.callTool("config_tier", { path: "apps/lxd" });
      assert.equal(result.ok, true);
      const meta = result.meta as { planOnly?: boolean };
      assert.equal(meta.planOnly, true);
    },
  },
  {
    id: "tool-doctor-reports-check-tallies",
    kind: "tool",
    input:
      "doctor returns a { checks, passed, failed, skipped } diagnostic report where the tallies sum to the checks.",
    async expect({ mcp }) {
      const result = await mcp.callTool("doctor");
      assert.equal(result.ok, true);
      const data = result.data as {
        checks: unknown[];
        passed: number;
        failed: number;
        skipped: number;
      };
      assert.ok(Array.isArray(data.checks), "expected a checks array");
      assert.equal(
        data.passed + data.failed + data.skipped,
        data.checks.length,
      );
    },
  },
  {
    id: "tool-upgrade-is-plan-first",
    kind: "tool",
    input:
      "upgrade without `confirm` returns a plan (planOnly) — the CLI self-upgrade never runs on a discovery call.",
    async expect({ mcp }) {
      const result = await mcp.callTool("upgrade");
      assert.equal(result.ok, true);
      const meta = result.meta as { planOnly?: boolean };
      assert.equal(meta.planOnly, true);
    },
  },
  {
    id: "tool-prompt-list-resolves-authored-prompts",
    kind: "tool",
    input:
      "prompt_list (needsStore) resolves the authored ds:Prompt entities, each carrying its arguments.",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const result = await mcp.callTool("prompt_list");
        const data = result.data as { prompts: { name: string }[] };
        assert.ok(
          data.prompts.some((p) => p.name === "build-a-block"),
          "expected the build-a-block prompt",
        );
      });
    },
  },
  {
    id: "content-native-prompts-list-nonempty",
    kind: "content",
    input:
      "the native MCP prompts/list is non-empty over a graph with ds:Prompt entities, each with a description.",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const prompts = await mcp.listPrompts();
        assert.ok(prompts.length > 0, "expected native prompts");
        for (const prompt of prompts) {
          assert.ok(
            prompt.description,
            `prompt ${prompt.name} lacks a description`,
          );
        }
      });
    },
  },
  {
    id: "content-native-prompt-get-fills-arguments",
    kind: "content",
    input:
      "prompts/get materializes the body store-backed and substitutes {{arg}} placeholders.",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const result = await mcp.getPrompt("build-a-block", {
          blockName: "Button",
        });
        const first = result.messages[0] as {
          content: { text: string };
        };
        assert.match(first.content.text, /Button/);
        assert.ok(!first.content.text.includes("{{blockName}}"));
      });
    },
  },
  {
    id: "tool-token-add-config-is-plan-first",
    kind: "tool",
    input:
      "token_add-config (needsStore mutation) without `confirm` returns a plan naming tokens.config.mjs and writes nothing.",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const result = await mcp.callTool("token_add-config");
        assert.equal(result.ok, true);
        const meta = result.meta as { planOnly?: boolean };
        assert.equal(meta.planOnly, true);
        const data = result.data as { plan: string[] };
        assert.match(data.plan.join("\n"), /tokens\.config\.mjs/);
      });
    },
  },
  {
    id: "tool-tier-lookup-lists-scoped-blocks",
    kind: "tool",
    input:
      "tier_lookup {name:apps/lxd} resolves the tier and lists the blocks scoped to it (LXD Panel).",
    async expect() {
      await withCanonicalFixture(ALL_VISIBLE_CONFIG, async (mcp) => {
        const result = await mcp.callTool("tier_lookup", { name: "apps/lxd" });
        assert.equal(result.ok, true);
        const data = result.data as { name: string; blocks: string[] };
        assert.equal(data.name, "apps/lxd");
        assert.ok(data.blocks.includes("LXD Panel"));
      });
    },
  },
  {
    id: "tool-block-sample-returns-exemplars",
    kind: "tool",
    input:
      "block_sample (the no-argument PR7 sample) returns complete block exemplars for shape discovery.",
    async expect() {
      await withCanonicalFixture(ALL_VISIBLE_CONFIG, async (mcp) => {
        const result = await mcp.callTool("block_sample");
        assert.equal(result.ok, true);
        const data = result.data as { samples: unknown[]; totalCount: number };
        assert.ok(data.samples.length > 0, "expected at least one exemplar");
        assert.ok(data.totalCount >= data.samples.length);
      });
    },
  },
  {
    id: "tool-modifier-sample-returns-exemplars",
    kind: "tool",
    input:
      "modifier_sample (the no-argument PR7 sample) returns complete modifier exemplars for shape discovery.",
    async expect() {
      await withCanonicalFixture(ALL_VISIBLE_CONFIG, async (mcp) => {
        const result = await mcp.callTool("modifier_sample");
        assert.equal(result.ok, true);
        const data = result.data as { samples: unknown[]; totalCount: number };
        assert.ok(data.samples.length > 0, "expected at least one exemplar");
        assert.ok(data.totalCount >= data.samples.length);
      });
    },
  },
  {
    id: "tool-token-sample-returns-exemplars",
    kind: "tool",
    input:
      "token_sample (the no-argument PR7 sample) returns complete token exemplars for shape discovery.",
    async expect() {
      await withCanonicalFixture(ALL_VISIBLE_CONFIG, async (mcp) => {
        const result = await mcp.callTool("token_sample");
        assert.equal(result.ok, true);
        const data = result.data as { samples: unknown[]; totalCount: number };
        assert.ok(data.samples.length > 0, "expected at least one exemplar");
        assert.ok(data.totalCount >= data.samples.length);
      });
    },
  },
];
