import { describe, expect, it } from "vitest";
import { type RenderStyle, styleFor } from "../../kernel/render/style.js";
import { emitReference } from "../../kernel/spec/emitReference.js";
import { capabilities } from "../index.js";
import { infoFormatters } from "../info/info.render.js";
import type { InfoData } from "../info/types.js";
import { configShowFormatters, renderConfigShowPlain } from "./show.render.js";
import type { ConfigShowData } from "./types.js";

const DATA: ConfigShowData = {
  config: {
    tier: "apps/lxd",
    channel: "normal",
    detail: "standard",
    packs: ["@canonical/ds"],
    generators: [
      {
        name: "@canonical/summon-component",
        source: "npm:@canonical/summon-component@^0.33.0",
      },
    ],
  },
  origins: {
    tier: "project",
    channel: "default",
    detail: "default",
    packs: "global",
    generators: "default",
    stories: "default",
    prefixes: "default",
  },
  globalConfigPath: "/home/u/.config/pragma/config.json",
  projectConfigPath: "/repo/pragma.config.ts",
  projectExists: true,
  globalExists: true,
};

/** The same config with every optional field unset. */
const BARE: ConfigShowData = {
  config: { channel: "normal" },
  origins: {
    tier: "default",
    channel: "default",
    detail: "default",
    packs: "default",
    generators: "default",
    stories: "default",
    prefixes: "default",
  },
  globalConfigPath: "/home/u/.config/pragma/config.json",
  projectExists: false,
  globalExists: false,
};

/** The same unset state as `info` reports it. */
const BARE_INFO: InfoData = {
  version: "0.0.0",
  installSource: "npm",
  updateSkipped: true,
  config: {
    channel: BARE.config.channel,
    origins: BARE.origins,
    globalConfigPath: BARE.globalConfigPath,
    projectExists: false,
    globalExists: false,
  },
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
        "packs: @canonical/ds [global]",
        "generators: @canonical/summon-component",
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

  it("renders absent optional fields as (none)", () => {
    const out = renderConfigShowPlain(BARE, styleFor(false));

    expect(out).toContain("tier: (none)");
    expect(out).toContain("packs: (none)");
    expect(out).toContain("generators: (none)");
    expect(out).toContain("project config: (not found)");
  });
});

describe("configShowFormatters.llm", () => {
  it("renders the layered rows with origin markers", () => {
    const out = configShowFormatters.llm(DATA);

    expect(out).toContain("- **Tier:** apps/lxd [project]");
    expect(out).toContain("- **Packs:** @canonical/ds [global]");
    expect(out).toContain("- **Generators:** @canonical/summon-component");
  });

  it("spells an unset tier as every projection of both config verbs does", () => {
    // `config show` and `info` are the two verbs that report the resolved
    // config, each in a plain and an llm projection. A script or agent keyed on
    // one token for "unset" must not meet a second, and this llm renderer was
    // the one that printed a bare `none` while its own plain form, and both of
    // `info`'s, printed `(none)`. All four are pinned in one place because the
    // defect is the disagreement, not any single spelling.
    const projections = [
      renderConfigShowPlain(BARE, styleFor(false)),
      configShowFormatters.llm(BARE),
      infoFormatters.plain(BARE_INFO),
      infoFormatters.llm(BARE_INFO),
    ];
    for (const out of projections) {
      expect(out).toMatch(/[Tt]ier:\*{0,2} \(none\)/);
      expect(out).not.toMatch(/[Tt]ier:\*{0,2} none/);
    }
  });

  it("reports no identity row, in either form", () => {
    // Identity is read statically from `pragma.conf.ts`; reporting a layer for
    // it was reporting a provenance the kernel does not honour. Both renderers
    // are asserted, because they list their rows independently.
    for (const out of [
      renderConfigShowPlain(DATA, styleFor(false)),
      configShowFormatters.llm(DATA),
    ]) {
      for (const field of ["name", "help", "colophon", "issues"]) {
        expect(out.toLowerCase()).not.toContain(`${field}:`);
      }
    }
  });
});

describe("the generated configuration reference", () => {
  it("names exactly the fields this renderer reports with a layer", () => {
    // The page and the renderer are written independently — the page is kernel
    // prose, the renderer a capability — and the page's account of the renderer
    // was wrong in both directions: it claimed every field but `completion`
    // carried a printed provenance, while `prefixes`, `stories` and the four
    // distribution-only fields do not, and it claimed `completion` was not
    // printed, while `--format json` carries it.
    //
    // DERIVED from the real formatter: the field rows are the ones before the
    // two PATH rows, which are not fields at all. Adding a row here without
    // saying so on the page, or naming a field there this renderer drops, fails.
    const printed = renderConfigShowPlain(DATA, styleFor(false))
      .split("\n")
      .map((line) => line.slice(0, line.indexOf(":")));
    const fields = printed.slice(0, printed.indexOf("global config"));
    expect(fields.length).toBeGreaterThan(0);

    const page = emitReference(capabilities).get("config.md") ?? "";
    expect(page).toContain(
      `${fields.map((field) => `\`${field}\``).join(", ")} — those and only those —`,
    );
  });
});
