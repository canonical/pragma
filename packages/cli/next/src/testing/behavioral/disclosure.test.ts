/**
 * B6 — the cross-noun disclosure SWEEP, de-duplicated against PR3's own unit
 * coverage.
 *
 * PR3 already ships `disclosure — canonical-index gating` / `resolveDetail
 * precedence` / `MCP detail param` as protected MECHANISM tests
 * (`kernel/packs/disclosure.test.ts`). PR4's job is different: prove the
 * mechanism holds across EVERY noun that actually opts into disclosure — not
 * re-testing precedence or gating, just sweeping the noun SET. Parameterized
 * over `liveReadSurface.ts`, filtered to verbs whose `VerbSpec.disclosure` is
 * actually declared (today: `block`, `standard` — `modifier`/`token` declare
 * no disclosure spec at all, verified against the live pack definitions, so
 * they are correctly excluded rather than assumed).
 *
 * The per-field comparison is CONTENT-AGNOSTIC (key-set growth, not a named
 * field) so the sweep needs no per-noun knowledge of which field is "the deep
 * one" — canonical `digest`->`standard` rename (PARITY_GAPS
 * `digest-renamed-standard`) is exercised implicitly: gating is by canonical
 * index, and the sweep never names a level string other than the three
 * canonical ones.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { DETAIL_LEVELS } from "../../constants.js";
import {
  ALL_VISIBLE_CONFIG,
  CANONICAL_TTL,
} from "../fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../helpers/fixtureGraph.js";
import { projectMcp } from "../helpers/projectMcp.js";
import { lookupVerbs } from "./liveReadSurface.js";

const disclosureLookupVerbs = lookupVerbs.filter(
  (v) => v.spec.disclosure !== undefined,
);

let fixture: FixtureGraph;
let mcp: Awaited<ReturnType<typeof projectMcp>>;

beforeAll(async () => {
  fixture = await bootFixtureRuntime({
    ttl: CANONICAL_TTL,
    config: ALL_VISIBLE_CONFIG,
  });
  mcp = await projectMcp(capabilities, fixture.cwd);
});

afterAll(async () => {
  await mcp.cleanup();
  await fixture.dispose();
});

describe("declares its levels within the canonical index (B6)", () => {
  it.each(disclosureLookupVerbs)("$noun: levels ⊆ the canonical index", (v) => {
    const levels = v.spec.disclosure?.levels ?? [];
    for (const level of levels) {
      expect(DETAIL_LEVELS as readonly string[]).toContain(level);
    }
    expect(levels).toContain(v.spec.disclosure?.default);
  });
});

describe("detail:summary vs detail:detailed — key-set growth (B6)", () => {
  it.each(
    disclosureLookupVerbs,
  )("%s_lookup: detailed carries every summary key plus at least one more", async (v) => {
    const noun = v.noun;
    const list = await mcp.callTool(`${noun}_list`);
    const rows = list.data as { name: string }[];
    const name = rows[0]?.name;
    expect(name).toBeDefined();
    if (!name) return;

    const summary = await mcp.callTool(`${noun}_lookup`, {
      name: [name],
      detail: "summary",
    });
    const detailed = await mcp.callTool(`${noun}_lookup`, {
      name: [name],
      detail: "detailed",
    });
    expect(summary.ok).toBe(true);
    expect(detailed.ok).toBe(true);

    const summaryEntity = (
      summary.data as { results: Record<string, unknown>[] }
    ).results[0] as Record<string, unknown>;
    const detailedEntity = (
      detailed.data as { results: Record<string, unknown>[] }
    ).results[0] as Record<string, unknown>;

    const summaryKeys = new Set(Object.keys(summaryEntity));
    const detailedKeys = new Set(Object.keys(detailedEntity));
    for (const key of summaryKeys) {
      expect(detailedKeys.has(key)).toBe(true);
    }
    expect(detailedKeys.size).toBeGreaterThan(summaryKeys.size);
  });
});
