import { describe, expect, it } from "vitest";
import { type RenderStyle, styleFor } from "../../kernel/render/style.js";
import { renderConfigShowPlain } from "./show.render.js";
import type { ConfigShowData } from "./types.js";

const DATA: ConfigShowData = {
  config: {
    tier: "apps/lxd",
    channel: "normal",
    detail: "standard",
    packages: ["@canonical/ds"],
  },
  origins: {
    tier: "project",
    channel: "default",
    detail: "default",
    packages: "global",
    stories: "default",
    prefixes: "default",
    prompts: "default",
  },
  globalConfigPath: "/home/u/.config/pragma/config.json",
  projectConfigPath: "/repo/pragma.config.ts",
  projectExists: true,
  globalExists: true,
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

describe("renderConfigShowPlain", () => {
  it("is byte-identical to the plain form when the styler is disabled", () => {
    expect(renderConfigShowPlain(DATA, styleFor(false))).toBe(
      [
        "tier: apps/lxd [project]",
        "channel: normal",
        "detail: standard",
        "packages: @canonical/ds [global]",
        "global config: /home/u/.config/pragma/config.json",
        "project config: /repo/pragma.config.ts",
      ].join("\n"),
    );
  });

  it("aligns the key column and colorizes values on a TTY", () => {
    const out = renderConfigShowPlain(DATA, TAGGED);
    const keyWidth = "project config:".length;
    // Dim, padded key; cyan value; dim `[layer]` marker.
    expect(out).toContain(
      `<d>${"tier:".padEnd(keyWidth)}</d> <c>apps/lxd</c><d> [project]</d>`,
    );
    // A default-origin value carries no marker.
    expect(out).toContain(
      `<d>${"channel:".padEnd(keyWidth)}</d> <c>normal</c>`,
    );
    expect(out).not.toContain("<d> [default]</d>");
  });
});
