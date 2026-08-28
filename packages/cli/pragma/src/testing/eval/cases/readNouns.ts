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
    // The journey the reported failure actually walked: browse a category, take
    // a published `name` VERBATIM, and ask for its content. Every row `list`
    // publishes must be addressable by `lookup` — otherwise the two-step
    // grammar the whole read surface is built on has a hole in it, and an agent
    // that follows the tools' own output gets ENTITY_NOT_FOUND with empty
    // suggestions and a recovery pointing back at the list it just read.
    id: "tool-standard-list-names-are-addressable-by-lookup",
    kind: "tool",
    input:
      "every name standard_list {category:react} publishes resolves through standard_lookup {name:[…], detail:detailed}, dos/donts included.",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const list = await mcp.callTool("standard_list", { category: "react" });
        assert.equal(list.ok, true);
        const names = (list.data as { name: string }[]).map((row) => row.name);
        assert.ok(names.length > 0, "expected standard_list to publish rows");
        let withExamples = 0;
        for (const name of names) {
          const result = await mcp.callTool("standard_lookup", {
            name: [name],
            detail: "detailed",
          });
          assert.equal(
            result.ok,
            true,
            `standard_lookup rejected the name standard_list published: ${name}`,
          );
          const entity = (result.data as { results: Record<string, unknown>[] })
            .results[0];
          assert.equal(entity?.name, name);
          if (
            (entity?.dos as unknown[] | undefined)?.length &&
            (entity?.donts as unknown[] | undefined)?.length
          ) {
            withExamples += 1;
          }
        }
        assert.ok(
          withExamples > 0,
          "expected at least one resolved standard to carry both dos and donts",
        );
      });
    },
  },
  {
    // The glob the lookup tool's own description advertises. It matched nothing
    // on the shipped graph, because the candidate pool was the `cs:name`
    // population and no asserted name contains a slash.
    id: "tool-standard-lookup-advertised-glob-matches",
    kind: "tool",
    input:
      'standard_lookup {name:["react/component/*"]} — the glob the tool description advertises — resolves at least one standard.',
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const result = await mcp.callTool("standard_lookup", {
          name: ["react/component/*"],
        });
        assert.equal(result.ok, true);
        const results = (result.data as { results: unknown[] }).results;
        assert.ok(
          results.length > 0,
          "the advertised glob must match at least one standard",
        );
      });
    },
  },
  {
    id: "content-canonical-graph-has-4-components",
    kind: "content",
    input:
      "the canonical fixture graph carries 4 ds:Component individuals (Button, Modal, LXD Panel, Beta Widget); block_list also surfaces the untiered Button Icon subcomponent (A2).",
    async expect() {
      await withCanonicalFixture(ALL_VISIBLE_CONFIG, async (mcp) => {
        const result = await mcp.callTool("block_list");
        const names = (result.data as { name: string }[])
          .map((r) => r.name)
          .sort();
        // The declared list takes no arguments and filters nothing: the 4 tiered
        // components plus the untiered Button Icon subcomponent (A2).
        assert.deepEqual(names, [
          "Beta Widget",
          "Button",
          "Button Icon",
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
    // The cross-surface count-parity invariant, stated for a HIERARCHY. Summing
    // the category counts stopped being the right arithmetic the moment a
    // parent counted its branch (a standard under `testing-unit` is counted by
    // both `testing-unit` and `testing`); what must hold — and what actually
    // catches the reported defect — is that each category's count and the rows
    // `--category` returns for it are the same set. Before the roll-up,
    // `testing` reported 1 and `standard list --category testing` returned 1 of
    // the 8 standards in the branch: a silently wrong answer, exit 0.
    id: "content-standard-category-counts-match-filtered-list",
    kind: "content",
    input:
      "every standard_categories count equals the length of standard_list {category: <slug>}, and a parent category answers for its whole branch.",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const list = await mcp.callTool("standard_list");
        const categories = await mcp.callTool("standard_categories");
        const rows = categories.data as { name: string; count: string }[];
        assert.ok(
          (list.data as unknown[]).length > 0 && rows.length > 0,
          "both surfaces must be non-empty for the parity invariant to bite",
        );
        let rolledUp = 0;
        for (const row of rows) {
          const filtered = await mcp.callTool("standard_list", {
            category: row.name,
          });
          assert.equal(
            (filtered.data as unknown[]).length,
            Number(row.count),
            `standard_list --category ${row.name} disagrees with its count`,
          );
          // A parent whose branch is bigger than its own direct membership:
          // the roll-up is doing something, so this case cannot pass vacuously.
          const direct = (list.data as { category?: string }[]).filter(
            (r) => r.category === row.name,
          ).length;
          if (Number(row.count) > direct) rolledUp += 1;
        }
        assert.ok(
          rolledUp > 0,
          "expected at least one parent category to answer for its descendants",
        );
      });
    },
  },
  {
    // The reflexive half of `skos:broader*`. `broader+` looks equivalent and
    // silently drops every standard filed DIRECTLY on the category asked for —
    // one of the 8 under `testing` in the shipped graph.
    id: "content-standard-category-rollup-keeps-the-direct-member",
    kind: "content",
    input:
      "standard_list {category: <parent>} includes both the standard filed directly on the parent and those filed on its child.",
    async expect() {
      await withCanonicalFixture(CANONICAL_CONFIG, async (mcp) => {
        const parent = await mcp.callTool("standard_list", {
          category: "testing",
        });
        const child = await mcp.callTool("standard_list", {
          category: "testing-unit",
        });
        const parentRows = parent.data as { name: string; category: string }[];
        const childNames = new Set(
          (child.data as { name: string }[]).map((r) => r.name),
        );
        assert.ok(
          childNames.size > 0,
          "expected the child category to be used",
        );
        for (const name of childNames) {
          assert.ok(
            parentRows.some((r) => r.name === name),
            `the parent category dropped its descendant ${name}`,
          );
        }
        assert.ok(
          parentRows.some((r) => r.category === "testing"),
          "the parent category dropped the standard filed directly on it",
        );
      });
    },
  },
  {
    id: "content-block-list-is-channel-independent",
    kind: "content",
    input:
      "block_list returns the SAME rows on the normal channel (CANONICAL_CONFIG) and the prerelease one (ALL_VISIBLE_CONFIG) — including the beta-only block, which the normal channel used to hide (L-OPEN-9).",
    async expect() {
      const namesUnder = async (
        config: typeof CANONICAL_CONFIG | typeof ALL_VISIBLE_CONFIG,
      ): Promise<string[]> => {
        let names: string[] = [];
        await withCanonicalFixture(config, async (mcp) => {
          const result = await mcp.callTool("block_list");
          names = (result.data as { name: string }[]).map((r) => r.name).sort();
        });
        return names;
      };
      const normal = await namesUnder(CANONICAL_CONFIG);
      const prerelease = await namesUnder(ALL_VISIBLE_CONFIG);
      // The signed-off consequence: an experimental block is visible to
      // everyone, on every channel, until filtering returns in declared form.
      assert.ok(normal.includes("Beta Widget"));
      assert.deepEqual(normal, prerelease);
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
