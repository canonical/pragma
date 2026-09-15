import type { SourceRefusal } from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import describeFilterFeedback from "./describeFilterFeedback.js";

const createRefusal = (reason: string): SourceRefusal => ({
  part: "filter",
  code: "undeclared-operator",
  field: "name",
  operator: "contains",
  reason,
});

describe("describeFilterFeedback", () => {
  it("says nothing while nothing is wrong", () => {
    expect(describeFilterFeedback({ status: "none" }, false)).toBeNull();
    expect(describeFilterFeedback({ status: "applied" }, true)).toBeNull();
  });

  it("asks for a value, saying whether a restriction still applies", () => {
    expect(describeFilterFeedback({ status: "incomplete" }, false)).toBe(
      "Enter a value to apply this restriction.",
    );
    expect(describeFilterFeedback({ status: "incomplete" }, true)).toBe(
      "Enter a value to change this restriction. The previous restriction still applies.",
    );
  });

  it("gives the reason an input is invalid, and whether a restriction still applies", () => {
    expect(
      describeFilterFeedback(
        { status: "invalid", reason: "not a number", retainsPredicate: false },
        false,
      ),
    ).toBe("Not a number.");
    expect(
      describeFilterFeedback(
        { status: "invalid", reason: "not a number", retainsPredicate: true },
        true,
      ),
    ).toBe("Not a number. The previous restriction still applies.");
  });

  it("gives every reason the source refused an edit for", () => {
    const refusals = [
      createRefusal("this endpoint looks for text in one field"),
      createRefusal("this endpoint cannot search as well"),
    ];
    expect(
      describeFilterFeedback(
        { status: "refused", refusals, retainsPredicate: false },
        false,
      ),
    ).toBe(
      "This endpoint looks for text in one field. This endpoint cannot search as well.",
    );
    expect(
      describeFilterFeedback(
        {
          status: "refused",
          refusals: [createRefusal("no")],
          retainsPredicate: true,
        },
        true,
      ),
    ).toBe("No. The previous restriction still applies.");
  });

  it("reads whether a restriction still applies from the feedback, not the control", () => {
    expect(
      describeFilterFeedback(
        { status: "invalid", reason: "not a number", retainsPredicate: true },
        false,
      ),
    ).toBe("Not a number. The previous restriction still applies.");
    expect(
      describeFilterFeedback(
        {
          status: "refused",
          refusals: [createRefusal("no")],
          retainsPredicate: false,
        },
        true,
      ),
    ).toBe("No.");
  });
});
