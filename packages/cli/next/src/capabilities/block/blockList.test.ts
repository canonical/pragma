import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { OWL_EXPORT_TTL } from "../../testing/fixtures/graph/owlExport.js";
import { bootFixtureRuntime } from "../../testing/helpers/fixtureGraph.js";
import type { BlockRow } from "./blockList.verb.js";
import { blockModule } from "./index.js";

const listVerb = blockModule.verbs.find(
  (verb) => verbKey(verb.path) === "block list",
) as VerbSpec;

const names = (rows: BlockRow[]): string[] =>
  rows.map((row) => row.name).sort();

/**
 * The OWL-export fixture ships an UNTIERED `ds:Component` (`ds:datePicker`, no
 * `ds:tier`) beside a tiered one (`ds:button`). The pre-fix `block list` gated
 * on a REQUIRED `ds:tier` triple pattern, so `--all-tiers` — which drops the
 * FILTER but not the pattern — still hid the untiered block, contradicting the
 * flag's promise to show every block (A2). A tier-scoped view legitimately
 * omits an untiered block (it joins the list through its tier); `--all-tiers`
 * is the escape that reveals it.
 */
describe("block list — untiered blocks under --all-tiers (A2)", () => {
  describe("no tier configured", () => {
    let runtime: PragmaRuntime;
    let dispose: () => Promise<void>;

    beforeAll(async () => {
      const fixture = await bootFixtureRuntime({ ttl: OWL_EXPORT_TTL });
      runtime = fixture.runtime;
      dispose = fixture.dispose;
    });
    afterAll(() => dispose());

    it("the default view still omits the untiered block", async () => {
      const rows = (await listVerb.run({}, runtime)) as BlockRow[];
      expect(names(rows)).toEqual(["Button"]);
    });

    it("--all-tiers reveals the untiered block", async () => {
      const rows = (await listVerb.run(
        { allTiers: true },
        runtime,
      )) as BlockRow[];
      expect(names(rows)).toEqual(["Button", "Date Picker"]);
    });
  });

  describe("a tier IS configured", () => {
    let runtime: PragmaRuntime;
    let dispose: () => Promise<void>;

    beforeAll(async () => {
      const fixture = await bootFixtureRuntime({
        ttl: OWL_EXPORT_TTL,
        config: { tier: "global", channel: "normal" },
      });
      runtime = fixture.runtime;
      dispose = fixture.dispose;
    });
    afterAll(() => dispose());

    it("a scoped tier lists its tiered block, not the untiered one", async () => {
      const rows = (await listVerb.run({}, runtime)) as BlockRow[];
      expect(names(rows)).toEqual(["Button"]);
    });

    it("--all-tiers overrides the scope and reveals the untiered block", async () => {
      const rows = (await listVerb.run(
        { allTiers: true },
        runtime,
      )) as BlockRow[];
      expect(names(rows)).toContain("Date Picker");
    });
  });
});
