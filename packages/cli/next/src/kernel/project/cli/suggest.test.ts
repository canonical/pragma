import { describe, expect, it } from "vitest";
import { fixtureModule } from "../../../testing/fixtures/fixtureCapability.js";
import {
  nounVerbMap,
  resolveUnknownCommand,
  suggestMessage,
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

describe("suggestMessage", () => {
  it('produces a "Did you mean" line for a near miss', () => {
    expect(suggestMessage("widgt", ["widget"])).toBe(
      'Unknown command "widgt".\nDid you mean: widget?',
    );
  });

  it("omits the suggestion line when nothing ranks", () => {
    expect(suggestMessage("zzzzz", ["widget"])).toBe(
      'Unknown command "zzzzz".',
    );
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
