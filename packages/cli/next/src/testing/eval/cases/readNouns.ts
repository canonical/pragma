/**
 * Read-noun eval seed cases (commit 4) — extends `cases/stable.ts` once PR3's
 * read nouns are live. Representative, NOT exhaustive (PR7 populates the full
 * MCP eval matrix); each case builds its OWN fixture via `bootFixtureRuntime`
 * so it stays independent of `eval.test.ts`'s shared env.
 *
 * Anchor VALUES (Button, `importance`->`primary`, `code/function/purity`, 4
 * components) come from the ported canonical fixture graph
 * (`testing/fixtures/graph/canonical.ts`), which THIS package controls — not
 * from PR3's noun/verb/tool SET, which is read from the live surface
 * elsewhere (`liveReadSurface.ts`) per R2.
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

export const readNounEvalCases: readonly EvalCase[] = [
  {
    id: "tool-block-lookup-button-has-modifier-families",
    kind: "tool",
    input:
      "block_lookup {name:[Button]} resolves name===Button and carries modifierFamilies.",
    async expect() {
      await withCanonicalFixture(ALL_VISIBLE_CONFIG, async (mcp) => {
        const result = await mcp.callTool("block_lookup", { name: ["Button"] });
        assert.equal(result.ok, true);
        const entity = (result.data as { results: Record<string, unknown>[] })
          .results[0];
        assert.equal(entity?.name, "Button");
        assert.ok(
          Array.isArray(entity?.modifierFamilies) &&
            (entity.modifierFamilies as unknown[]).length > 0,
          "expected a non-empty modifierFamilies array",
        );
      });
    },
  },
  {
    id: "tool-standard-lookup-has-dos-and-donts",
    kind: "tool",
    input:
      "standard_lookup {name:[react/component/props], detail:detailed} has non-empty dos and donts.",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const result = await mcp.callTool("standard_lookup", {
          name: ["react/component/props"],
          detail: "detailed",
        });
        assert.equal(result.ok, true);
        const entity = (result.data as { results: Record<string, unknown>[] })
          .results[0];
        assert.ok(
          (entity?.dos as unknown[])?.length > 0,
          "expected non-empty dos",
        );
        assert.ok(
          (entity?.donts as unknown[])?.length > 0,
          "expected non-empty donts",
        );
      });
    },
  },
  {
    id: "content-canonical-graph-has-4-components",
    kind: "content",
    input:
      "the canonical fixture graph carries exactly 4 ds:Component individuals, including Button and Beta Widget.",
    async expect() {
      await withCanonicalFixture(ALL_VISIBLE_CONFIG, async (mcp) => {
        const result = await mcp.callTool("block_list", { allTiers: true });
        const names = (result.data as { name: string }[])
          .map((r) => r.name)
          .sort();
        assert.deepEqual(names, [
          "Beta Widget",
          "Button",
          "LXD Panel",
          "Modal",
        ]);
      });
    },
  },
  {
    id: "content-code-function-purity-description-mentions-pure",
    kind: "content",
    input: "the code/function/purity standard's description contains 'pure'.",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const result = await mcp.callTool("standard_lookup", {
          name: ["code/function/purity"],
        });
        const entity = (result.data as { results: Record<string, unknown>[] })
          .results[0];
        assert.match(String(entity?.description ?? ""), /pure/i);
      });
    },
  },
  {
    id: "content-importance-family-includes-primary",
    kind: "content",
    input: "the modifier family `importance` includes the value `primary`.",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const result = await mcp.callTool("modifier_lookup", {
          name: ["importance"],
        });
        const entity = (result.data as { results: Record<string, unknown>[] })
          .results[0];
        const values = (entity?.values as { name: string }[] | undefined)?.map(
          (v) => v.name,
        );
        assert.ok(
          values?.includes("primary"),
          `expected "primary" in ${values}`,
        );
      });
    },
  },
  {
    id: "content-standard-list-length-equals-category-count-sum",
    kind: "content",
    input:
      "standard_list length equals the sum of standard_categories counts (the cross-surface count-parity invariant).",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const list = await mcp.callTool("standard_list");
        const categories = await mcp.callTool("standard_categories");
        const listLength = (list.data as unknown[]).length;
        const categorySum = (categories.data as { count: string }[]).reduce(
          (sum, row) => sum + Number(row.count),
          0,
        );
        assert.equal(listLength, categorySum);
      });
    },
  },
  {
    id: "content-normal-channel-drops-beta-only-block",
    kind: "content",
    input:
      "the normal channel (CANONICAL_CONFIG) excludes the beta-only block; the prerelease channel (ALL_VISIBLE_CONFIG) includes it.",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const normal = await mcp.callTool("block_list", { allTiers: true });
        const normalNames = (normal.data as { name: string }[]).map(
          (r) => r.name,
        );
        assert.ok(!normalNames.includes("Beta Widget"));
      });
      await withCanonicalFixture(ALL_VISIBLE_CONFIG, async (mcp) => {
        const prerelease = await mcp.callTool("block_list", { allTiers: true });
        const prereleaseNames = (prerelease.data as { name: string }[]).map(
          (r) => r.name,
        );
        assert.ok(prereleaseNames.includes("Beta Widget"));
      });
    },
  },
  {
    id: "disclosure-block-lookup-detailed-adds-anatomy",
    kind: "disclosure",
    input:
      "block_lookup {name:[Button], detail:summary} omits anatomyDsl; {detail:detailed} includes it.",
    async expect() {
      await withCanonicalFixture(ALL_VISIBLE_CONFIG, async (mcp) => {
        const summary = await mcp.callTool("block_lookup", {
          name: ["Button"],
          detail: "summary",
        });
        const detailed = await mcp.callTool("block_lookup", {
          name: ["Button"],
          detail: "detailed",
        });
        const summaryEntity = (
          summary.data as { results: Record<string, unknown>[] }
        ).results[0];
        const detailedEntity = (
          detailed.data as { results: Record<string, unknown>[] }
        ).results[0];
        assert.equal(summaryEntity?.anatomyDsl, undefined);
        assert.equal(
          detailedEntity?.anatomyDsl,
          "root: button; children: label, icon",
        );
      });
    },
  },
  {
    id: "prompt-block-question-maps-to-block-lookup",
    kind: "prompt",
    input:
      '"What is the anatomy of the Button component?" should map to `block_lookup`.',
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const tools = await mcp.listTools();
        const blockLookup = tools.find((t) => t.name === "block_lookup");
        assert.ok(blockLookup, "expected a block_lookup tool in the catalog");
        assert.match(String(blockLookup?.description ?? ""), /block/i);
      });
    },
  },
];
