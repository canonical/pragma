import { describe, expect, it } from "vitest";
import { type RenderStyle, styleFor } from "../../kernel/render/style.js";
import { renderSourcesStatusPlain } from "./status.render.js";
import type { SourcesStatusData } from "./types.js";

const DATA: SourcesStatusData = {
  cwd: "/repo",
  lockPresent: true,
  contentHash: "abcdef012345aaaa",
  cached: true,
  builtAt: "2026-01-01",
  entityCount: 42,
  sources: [
    {
      name: "ds",
      ref: "ds@1",
      resolved: "1111111111112222",
      staleness: "up-to-date",
    },
    {
      name: "extra",
      ref: "extra@1",
      resolved: null,
      staleness: "config-drift",
    },
  ],
};

/** A sentinel styler — enabled, each color wrapped in a visible tag. */
const TAGGED: RenderStyle = {
  enabled: true,
  bold: (t) => `<b>${t}</b>`,
  dim: (t) => `<d>${t}</d>`,
  cyan: (t) => `<c>${t}</c>`,
  green: (t) => `<g>${t}</g>`,
  yellow: (t) => `<y>${t}</y>`,
};

describe("renderSourcesStatusPlain", () => {
  it("is byte-identical to the plain form when the styler is disabled", () => {
    expect(renderSourcesStatusPlain(DATA, styleFor(false))).toBe(
      [
        "Store: ready",
        "  pack: abcdef012345 — 42 entities, built 2026-01-01",
        "",
        "Sources:",
        "  ds [ok] @ 111111111111",
        "  extra [config drift]",
      ].join("\n"),
    );
  });

  it("bolds the heading, aligns names, and tints markers on a TTY", () => {
    const out = renderSourcesStatusPlain(DATA, TAGGED);
    const nameWidth = "extra".length;
    expect(out).toContain("<b>Sources:</b>");
    // up-to-date tints green with a dim resolved suffix; drift tints yellow.
    expect(out).toContain(
      `  ${"ds".padEnd(nameWidth)}  <g>[ok]</g><d> @ 111111111111</d>`,
    );
    expect(out).toContain(
      `  ${"extra".padEnd(nameWidth)}  <y>[config drift]</y>`,
    );
  });
});
