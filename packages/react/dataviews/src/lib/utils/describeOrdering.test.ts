import { resolveMessages } from "@canonical/dataviews-core/bindings";
import { describe, expect, it } from "vitest";
import describeOrdering from "./describeOrdering.js";

const english = resolveMessages();

/** Each field as the heading showing it draws its name. */
const HEADINGS: Readonly<Record<string, string>> = {
  cores: "Cores",
  name: "Name",
};
const nameOf = (field: string): string => HEADINGS[field] ?? field;

describe("describeOrdering", () => {
  it("states the terms the reader stated, in precedence order, by heading", () => {
    expect(
      describeOrdering(
        [
          { field: "name", direction: "asc" },
          { field: "cores", direction: "desc" },
        ],
        [{ field: "cores", direction: "asc" }],
        nameOf,
        english,
      ),
    ).toBe("Sorted by Name, ascending; then Cores, descending.");
  });

  it("states the source's own order while the reader states none", () => {
    const defaults = [{ field: "cores", direction: "desc" }] as const;
    expect(describeOrdering([], defaults, nameOf, english)).toBe(
      english.sortDefaulted([{ name: "Cores", direction: "desc" }]),
    );
  });

  it("states that nothing orders the rows where neither has a term", () => {
    expect(describeOrdering([], [], nameOf, english)).toBe(english.sortAbsent);
  });

  it("names a field no heading shows by the field itself", () => {
    expect(
      describeOrdering(
        [{ field: "region", direction: "asc" }],
        [],
        nameOf,
        english,
      ),
    ).toBe(english.sortApplied([{ name: "region", direction: "asc" }]));
  });

  it("words the outcome in the messages it is given, not in English", () => {
    const messages = resolveMessages({
      sortApplied: (terms) => `Trié par ${terms[0]?.name ?? ""}`,
    });
    expect(
      describeOrdering(
        [{ field: "name", direction: "asc" }],
        [],
        nameOf,
        messages,
      ),
    ).toBe("Trié par Name");
  });
});
