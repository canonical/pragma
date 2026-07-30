import { describe, expect, it } from "vitest";
import { type RenderStyle, styleFor } from "../../kernel/render/style.js";
import { renderSourcesStatusPlain } from "./status.render.js";
import type { SourcesStatusData } from "./types.js";

/** A project reading from its own built pack, with two configured sources. */
const BUILT: SourcesStatusData = {
  cwd: "/repo",
  store: "built",
  contentHash: "abcdef012345aaaa",
  sourceRef: "ds,extra",
  builtAt: "2026-01-01",
  entityCount: 42,
  sources: [
    { name: "ds", ref: "git+https://example.test/ds.git#main" },
    { name: "extra", ref: "extra@1" },
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
    expect(renderSourcesStatusPlain(BUILT, styleFor(false))).toBe(
      [
        "Store: ready",
        "  pack: abcdef012345 — 42 entities, built 2026-01-01",
        "  from: ds,extra",
        "",
        "Sources:",
        "  ds  git+https://example.test/ds.git#main",
        "  extra  extra@1",
      ].join("\n"),
    );
  });

  it("bolds the heading, aligns names, and dims refs on a TTY", () => {
    const out = renderSourcesStatusPlain(BUILT, TAGGED);
    const nameWidth = "extra".length;
    expect(out).toContain("<b>Sources:</b>");
    expect(out).toContain(
      `  ${"ds".padEnd(nameWidth)}  <d>git+https://example.test/ds.git#main</d>`,
    );
    expect(out).toContain(`  ${"extra".padEnd(nameWidth)}  <d>extra@1</d>`);
  });

  it("names the embedded snapshot AND the update that would replace it", () => {
    // The embedded pack answers reads on a fresh install, but it IS a snapshot —
    // rendering it as "ready" would read as "up to date", which it is not.
    const out = renderSourcesStatusPlain(
      {
        ...BUILT,
        store: "embedded",
        sourceRef: "@canonical/design-system@git:abc",
      },
      styleFor(false),
    );
    expect(out).toContain("Store: embedded snapshot");
    expect(out).toContain("pragma sources update");
    expect(out).toContain("  from: @canonical/design-system@git:abc");
  });

  it("reports an unbuilt store with its recovery and no pack line", () => {
    const out = renderSourcesStatusPlain(
      {
        ...BUILT,
        store: "unavailable",
        contentHash: null,
        sourceRef: null,
        builtAt: null,
        entityCount: null,
      },
      styleFor(false),
    );
    expect(out).toContain("Store: not built (run `pragma sources update`)");
    expect(out).not.toContain("  pack: ");
  });

  it("says so when no packs are configured", () => {
    const out = renderSourcesStatusPlain(
      { ...BUILT, sources: [] },
      styleFor(false),
    );
    expect(out).toContain("  (none configured)");
  });
});
