import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type { ModifierFamily } from "../../shared/types.js";
import formatters from "./lookup.js";

const FAMILY: ModifierFamily = {
  uri: "http://example.com/f1" as URI,
  name: "importance",
  values: ["default", "primary", "secondary"],
};

describe("modifier lookup formatters", () => {
  it("plain renders family name and indented values", () => {
    const text = formatters.plain(FAMILY);
    expect(text).toContain("importance");
    expect(text).toContain("Values:");
    expect(text).toContain("  default");
    expect(text).toContain("  primary");
  });

  it("llm renders markdown heading and value list", () => {
    const text = formatters.llm(FAMILY);
    expect(text).toContain("## importance");
    expect(text).toContain("- default");
    expect(text).toContain("- primary");
  });

  it("json serializes the full family", () => {
    const parsed = JSON.parse(formatters.json(FAMILY));
    expect(parsed.name).toBe("importance");
    expect(parsed.values).toEqual(["default", "primary", "secondary"]);
  });
});
