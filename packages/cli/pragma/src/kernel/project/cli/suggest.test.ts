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
});
