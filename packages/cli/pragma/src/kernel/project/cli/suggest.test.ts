import { describe, expect, it } from "vitest";
import { capabilities } from "../../../capabilities/index.js";
import { fixtureModule } from "../../../testing/fixtures/fixtureCapability.js";
import {
  curatedSuggestions,
  nounVerbMap,
  resolveUnknownCommand,
} from "./suggest.js";
import { suggestNames } from "./suggestNames.js";

const verbs = [...fixtureModule.verbs];

describe("nounVerbMap", () => {
  it("maps nouns to their non-hidden verb labels", () => {
    const map = nounVerbMap(verbs);
    expect(map.get("widget")).toEqual(["list", "make"]);
    expect([...map.keys()]).toEqual(["widget"]);
  });
});

describe("resolveUnknownCommand", () => {
  const map = nounVerbMap(verbs);

  it("flags an unknown noun against the noun set", () => {
    expect(resolveUnknownCommand(["widgt"], map)).toEqual({
      token: "widgt",
      candidates: ["widget"],
    });
  });

  it("flags an unknown verb against its noun's verbs", () => {
    expect(resolveUnknownCommand(["widget", "lst"], map)).toEqual({
      token: "lst",
      candidates: ["list", "make"],
    });
  });

  it("resolves a valid command to undefined", () => {
    expect(resolveUnknownCommand(["widget", "list"], map)).toBeUndefined();
    expect(resolveUnknownCommand([], map)).toBeUndefined();
  });
});

describe("curatedSuggestions", () => {
  it("answers the conventional spelling with the commands that own the job", () => {
    // `status` is nowhere near `info` or `doctor` textually, so edit distance
    // can never offer them. The table is the answer for a token whose JOB
    // exists here under other names — and it stays a suggestion: `status` is
    // not a command, because `info` already is.
    expect(curatedSuggestions("status")).toEqual(["info", "doctor"]);
  });

  it("has nothing to say about a plain typo — that is ranking's job", () => {
    expect(curatedSuggestions("infoo")).toBeUndefined();
    expect(curatedSuggestions("")).toBeUndefined();
  });

  it("never names a command the program does not have", () => {
    // A curated entry that outlived its target would send a confused user at
    // nothing. Check every suggestion against the LIVE registry, so renaming
    // `info` reddens here instead of shipping a dead hint.
    const live = new Set(
      capabilities.flatMap((m) => m.verbs.map((v) => v.path[0])),
    );
    for (const suggestion of curatedSuggestions("status") ?? []) {
      expect(live.has(suggestion)).toBe(true);
    }
  });
});

describe("suggestNames", () => {
  it("ranks prefix matches ahead of edit-distance matches", () => {
    expect(suggestNames("con", ["config", "connect", "block"])).toEqual([
      "config",
      "connect",
    ]);
  });

  it("catches a single-character typo", () => {
    expect(suggestNames("cofnig", ["config", "block"])).toEqual(["config"]);
  });

  it("returns nothing for an empty query", () => {
    expect(suggestNames("", ["config"])).toEqual([]);
  });

  it("returns nothing for a query that is only whitespace", () => {
    expect(suggestNames("   ", ["config"])).toEqual([]);
  });

  it("never offers a candidate that IS the query once padding is ignored", () => {
    // The reported defect, in the unit that produced the sentence:
    // `block lookup Timeline` printed `Did you mean? - Timeline ` because 66
    // shipped `ds:name` literals carry the source document's trailing space, and
    // the exclusion compared the raw strings. A suggestion that differs from the
    // query by a character no surface prints reads as the CLI refusing the word
    // it just echoed — and if a candidate really is the query, the miss is the
    // bug, so restating it would only hide the bug.
    //
    // The near-miss beside it is what proves the exclusion is the only thing
    // dropped — an empty list would pass whether the rule worked or the
    // threshold had simply swallowed both.
    expect(suggestNames("Timeline", ["Timeline ", "Timelines"])).toEqual([
      "Timelines",
    ]);
    // Both directions, and leading padding too: the query is the padded one
    // here, and case is folded alongside.
    expect(suggestNames("  timeline\t", ["Timeline", "Timelines"])).toEqual([
      "Timelines",
    ]);
  });

  it("suggests a padded candidate by its LITERAL value on a genuine typo", () => {
    // Padding costs a candidate no edit distance, and the value handed back is
    // the one the graph holds — the suggester matches loosely and quotes
    // exactly, because a suggestion names something a reader can look up.
    expect(suggestNames("Timelime", ["Timeline ", "block"])).toEqual([
      "Timeline ",
    ]);
  });

  describe("a candidate that is a whole-segment part of the query", () => {
    it("is offered for a name with a segment too many", () => {
      // Recorded: `token lookup color.text.primary` suggested NOTHING although
      // `color.text` exists — it is no prefix of the query's, and eight extra
      // characters is past any edit-distance threshold.
      expect(
        suggestNames("color.text.primary", ["color.text", "color.border"]),
      ).toEqual(["color.text"]);
    });

    it("is offered for the last segment of a pasted local name", () => {
      expect(
        suggestNames("apps_lxd.component.meter", ["Meter", "Metric"]),
      ).toEqual(["Meter"]);
    });

    it("ranks first, longest run first, ahead of a candidate the query prefixes", () => {
      expect(
        suggestNames("color.text.muted", [
          "color.text.muted.hover",
          "color",
          "color.text",
          "text.muted",
        ]),
      ).toEqual([
        "color.text",
        "text.muted",
        "color",
        "color.text.muted.hover",
      ]);
    });

    it("cuts at segment boundaries only", () => {
      expect(
        suggestNames("color.text.primary", ["color.te", "lor.text"]),
      ).toEqual([]);
    });

    it("reads a slash-separated path the same way", () => {
      expect(
        suggestNames("react/component/tsdoc/extra", ["react/component/tsdoc"]),
      ).toEqual(["react/component/tsdoc"]);
    });

    it("keeps the five-result cap", () => {
      const parts = ["a1", "b2", "c3", "d4", "e5", "f6", "g7"];
      expect(suggestNames(parts.join("."), parts)).toHaveLength(5);
    });

    it("stays cheap against a pool the size of the shipped pack", () => {
      // The length prefilter exists because ranking 4,380 names once cost
      // 1.2 s; this branch is a map lookup per candidate and must not undo
      // it. The pool is names the prefilter rejects on length, so what is
      // timed is the branch and the prefilter, not the edit distances.
      const pool = Array.from(
        { length: 5000 },
        (_, i) => `color.group${i}.tone.on.a.path.far.longer.than.the.query.is`,
      );
      const started = performance.now();
      expect(suggestNames("apps_lxd.component.meter", pool)).toEqual([]);
      expect(performance.now() - started).toBeLessThan(100);
    });
  });
});
