import { describe, expect, it } from "vitest";
import { resetFormatters } from "./reset.render.js";

const REMOVED = {
  removed: true,
  contentHash: "0e82d35c66687b8a",
  answers: "embedded",
} as const;

describe("sources reset formatters", () => {
  it("llm states what was removed and what answers now", () => {
    expect(resetFormatters.llm(REMOVED)).toBe(
      "# sources reset\n- Removed: 0e82d35c66687b8a\n- Answers: embedded",
    );
    expect(
      resetFormatters.llm({
        removed: false,
        contentHash: null,
        answers: "embedded",
      }),
    ).toContain("- Removed: nothing was built");
  });

  it("plain tells a project with its own packs that reads need an update", () => {
    const out = resetFormatters.plain({ ...REMOVED, answers: "unavailable" });
    expect(out).toContain(
      "Removed this project's pack pointer (was 0e82d35c6668).",
    );
    expect(out).toContain(
      "reads need `pragma sources update` before they can answer",
    );
  });
});
