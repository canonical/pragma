import { describe, expect, it } from "vitest";
import { scanContent } from "./scanAnnotations.js";

describe("scanContent", () => {
  it("parses a bare annotation", () => {
    const [annotation] = scanContent(
      "/** @implements ds:global.component.button */",
      "a.tsx",
    );
    expect(annotation.blockUri).toBe("ds:global.component.button");
    expect(annotation.prefix).toBe("ds");
    expect(annotation.version).toBeUndefined();
    expect(annotation.isDraft).toBe(false);
  });

  it("parses a per-block version override", () => {
    const [annotation] = scanContent(
      "/** @implements ds:global.component.button@4.2.0 */",
      "a.tsx",
    );
    expect(annotation.blockUri).toBe("ds:global.component.button");
    expect(annotation.version).toBe("4.2.0");
  });

  it("parses a pre-release version override", () => {
    const [annotation] = scanContent(
      "/** @implements ds:global.component.button@4.2.0-experimental.1 */",
      "a.tsx",
    );
    expect(annotation.version).toBe("4.2.0-experimental.1");
  });

  it("parses the draft marker", () => {
    const [annotation] = scanContent(
      "/** @implements ds:global.component.button@1.0.0 [draft] */",
      "a.tsx",
    );
    expect(annotation.version).toBe("1.0.0");
    expect(annotation.isDraft).toBe(true);
  });

  it("captures multiple annotations with their offsets", () => {
    const content = [
      "/** @implements ds:global.component.button */",
      "const Button = 1;",
      "/** @implements dso:global.component.tabs */",
      "const Tabs = 2;",
    ].join("\n");

    const annotations = scanContent(content, "a.tsx");
    expect(annotations).toHaveLength(2);
    expect(annotations[0].prefix).toBe("ds");
    expect(annotations[1].prefix).toBe("dso");
    expect(content.slice(annotations[0].index)).toMatch(
      /^@implements ds:global\.component\.button/,
    );
    expect(annotations[1].index).toBeGreaterThan(annotations[0].index);
  });

  it("handles hyphenated and underscored slugs", () => {
    const annotations = scanContent(
      [
        "/** @implements ds:global.subcomponent.tile-header */",
        "/** @implements ds:global.component.contextual_menu */",
      ].join("\n"),
      "a.tsx",
    );
    expect(annotations.map((annotation) => annotation.blockUri)).toEqual([
      "ds:global.subcomponent.tile-header",
      "ds:global.component.contextual_menu",
    ]);
  });
});
