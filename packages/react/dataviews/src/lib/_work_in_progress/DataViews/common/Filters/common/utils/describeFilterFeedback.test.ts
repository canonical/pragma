import type { SourceRefusal } from "@canonical/dataviews-core";
import { resolveMessages } from "@canonical/dataviews-core/bindings";
import { describe, expect, it } from "vitest";
import describeFilterFeedback from "./describeFilterFeedback.js";

const english = resolveMessages();

const createRefusal = (reason: string): SourceRefusal => ({
  part: "filter",
  code: "undeclared-operator",
  field: "name",
  operator: "contains",
  reason,
});

describe("describeFilterFeedback", () => {
  it("says nothing while nothing is wrong", () => {
    expect(
      describeFilterFeedback({ status: "none" }, false, english),
    ).toBeNull();
    expect(
      describeFilterFeedback({ status: "applied" }, true, english),
    ).toBeNull();
  });

  it("asks for a value, saying whether a restriction still applies", () => {
    expect(
      describeFilterFeedback({ status: "incomplete" }, false, english),
    ).toBe("Enter a value to apply this restriction.");
    expect(
      describeFilterFeedback({ status: "incomplete" }, true, english),
    ).toBe(
      "Enter a value to change this restriction. The previous restriction still applies.",
    );
  });

  it("gives the reason an input is invalid, and whether a restriction still applies", () => {
    expect(
      describeFilterFeedback(
        { status: "invalid", reason: "not a number", retainsPredicate: false },
        false,
        english,
      ),
    ).toBe("Not a number.");
    expect(
      describeFilterFeedback(
        { status: "invalid", reason: "not a number", retainsPredicate: true },
        true,
        english,
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
        english,
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
        english,
      ),
    ).toBe("No. The previous restriction still applies.");
  });

  it("reads whether a restriction still applies from the feedback, not the control", () => {
    expect(
      describeFilterFeedback(
        { status: "invalid", reason: "not a number", retainsPredicate: true },
        false,
        english,
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
        english,
      ),
    ).toBe("No.");
  });

  it("words the feedback in the messages it is given, with every reason", () => {
    const messages = resolveMessages({
      filterIncomplete: (retained) => `vide ${String(retained)}`,
      filterRefused: (reasons, retained) =>
        `refusé ${reasons.join("|")} ${String(retained)}`,
    });
    expect(
      describeFilterFeedback({ status: "incomplete" }, true, messages),
    ).toBe("vide true");
    expect(
      describeFilterFeedback(
        {
          status: "refused",
          refusals: [createRefusal("a"), createRefusal("b")],
          retainsPredicate: false,
        },
        true,
        messages,
      ),
    ).toBe("refusé a|b false");
  });
});
