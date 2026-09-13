import { describe, expect, it } from "vitest";
import listHiddenFields from "./listHiddenFields.js";

describe("listHiddenFields", () => {
  it("carries every parameter in order, duplicates included, less the omitted names", () => {
    const params = new URLSearchParams(
      "tab=a&status=failed&status=ready&q=yak&page=2&size=50&tab=b",
    );
    expect(listHiddenFields(params, ["q", "page"])).toEqual([
      { key: "tab=a", name: "tab", value: "a" },
      { key: "status=failed", name: "status", value: "failed" },
      { key: "status=ready", name: "status", value: "ready" },
      { key: "size=50", name: "size", value: "50" },
      { key: "tab=b", name: "tab", value: "b" },
    ]);
  });

  it("keys a parameter repeated with the same value apart", () => {
    expect(
      listHiddenFields(new URLSearchParams("tab=a&tab=a&tab=a"), []).map(
        (field) => field.key,
      ),
    ).toEqual(["tab=a", "tab=a#1", "tab=a#2"]);
  });

  it("carries nothing without a spelling", () => {
    expect(listHiddenFields(null, [])).toEqual([]);
  });
});
