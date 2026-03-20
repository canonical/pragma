import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type { ModifierFamily } from "../../shared/types.js";
import formatters from "./list.js";

const FAMILIES: ModifierFamily[] = [
  {
    uri: "http://example.com/f1" as URI,
    name: "importance",
    values: ["default", "primary", "secondary"],
  },
  {
    uri: "http://example.com/f2" as URI,
    name: "density",
    values: ["default", "compact"],
  },
];

describe("modifier list formatters", () => {
  it("plain renders name with comma-separated values", () => {
    const text = formatters.plain(FAMILIES);
    expect(text).toContain("importance: default, primary, secondary");
    expect(text).toContain("density: default, compact");
  });

  it("llm renders markdown heading and bold names", () => {
    const text = formatters.llm(FAMILIES);
    expect(text).toContain("## Modifier Families");
    expect(text).toContain("**importance**");
    expect(text).toContain("**density**");
  });

  it("json serializes the full array", () => {
    const parsed = JSON.parse(formatters.json(FAMILIES));
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("importance");
  });
});
