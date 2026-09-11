import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  BOXES,
  buildChipChannelStyle,
  CHANNEL_DESCRIPTORS,
  CHANNELS,
  deriveNamespaceFromUri,
  getBoxEncoding,
  getKindEncoding,
  getLifecycleEncoding,
  getNamespaceEncoding,
  isNamespace,
  KINDS,
  LIFECYCLES,
  NAMESPACES,
  type Namespace,
} from "./encodings.js";

describe("chip encodings", () => {
  it("resolves a row for every namespace", () => {
    for (const namespace of NAMESPACES) {
      const row = getNamespaceEncoding(namespace);
      expect(row.value).toBe(namespace);
      expect(row.label).not.toBe("");
      expect(row.tint).not.toBe("");
    }
  });

  it("resolves a row for every kind", () => {
    for (const kind of KINDS) {
      const row = getKindEncoding(kind);
      expect(row.value).toBe(kind);
      expect(row.label).not.toBe("");
      expect(row.shape).not.toBe("");
    }
  });

  it("resolves a row for every box", () => {
    for (const box of BOXES) {
      const row = getBoxEncoding(box);
      expect(row.value).toBe(box);
      expect(row.label).not.toBe("");
    }
  });

  it("resolves a row for every lifecycle", () => {
    for (const lifecycle of LIFECYCLES) {
      const row = getLifecycleEncoding(lifecycle);
      expect(row.value).toBe(lifecycle);
      expect(row.label).not.toBe("");
    }
  });

  it("describes every channel exactly once", () => {
    expect(CHANNEL_DESCRIPTORS.map((row) => row.value)).toStrictEqual([
      ...CHANNELS,
    ]);
  });

  it("throws on values outside the vocabulary", () => {
    // Content (MDX, graph data) is untyped at runtime — lookups fail loudly.
    expect(() => getKindEncoding("gadget" as never)).toThrow(/unknown kind/);
    expect(() => getNamespaceEncoding("np" as never)).toThrow(
      /unknown namespace/,
    );
  });

  it("keeps each channel's payloads distinct (the encoding stays injective)", () => {
    const tints = NAMESPACES.map((value) => getNamespaceEncoding(value).tint);
    expect(new Set(tints).size).toBe(tints.length);

    const radii = KINDS.map((value) => getKindEncoding(value).radius);
    expect(new Set(radii).size).toBe(radii.length);

    const weights = BOXES.map((value) => {
      const row = getBoxEncoding(value);
      return `${row.fillWeight}/${row.strokeWeight}`;
    });
    expect(new Set(weights).size).toBe(weights.length);

    const dots = LIFECYCLES.map((value) => getLifecycleEncoding(value).dot);
    expect(new Set(dots).size).toBe(dots.length);
  });

  it("shows a dot for every lifecycle except none", () => {
    for (const lifecycle of LIFECYCLES) {
      const { dot } = getLifecycleEncoding(lifecycle);
      if (lifecycle === "none") {
        expect(dot).toBeNull();
      } else {
        expect(dot).not.toBeNull();
      }
    }
  });
});

describe("deriveNamespaceFromUri", () => {
  it("derives every registered namespace from its prefix", () => {
    for (const namespace of NAMESPACES) {
      expect(deriveNamespaceFromUri(`${namespace}:some.entity`)).toBe(
        namespace,
      );
    }
  });

  it("degrades unknown or missing prefixes to the docs namespace", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(deriveNamespaceFromUri("mystery:thing")).toBe("docs");
      expect(deriveNamespaceFromUri("no-prefix-at-all")).toBe("docs");
    } finally {
      warn.mockRestore();
    }
  });

  it("dev-warns on an unknown prefix, naming prefix and uri, without throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(() => deriveNamespaceFromUri("unknown:thing")).not.toThrow();
      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls.at(0)?.at(0));
      expect(message).toContain('"unknown"');
      expect(message).toContain("unknown:thing");
    } finally {
      warn.mockRestore();
    }
  });

  it("does not warn for a registered prefix", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(deriveNamespaceFromUri("ds:x")).toBe("ds");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("rejects an empty uri", () => {
    expect(() => deriveNamespaceFromUri("")).toThrow(/non-empty/);
  });
});

describe("isNamespace", () => {
  it("accepts registered namespaces and nothing else", () => {
    for (const namespace of NAMESPACES) {
      expect(isNamespace(namespace)).toBe(true);
    }
    expect(isNamespace("np")).toBe(false);
    expect(isNamespace(undefined)).toBe(false);
  });
});

describe("buildChipChannelStyle", () => {
  it("emits one custom property per channel", () => {
    const style = buildChipChannelStyle({
      namespace: "ds",
      kind: "component",
      box: "instance",
      lifecycle: "canonical",
    });
    expect(style["--chip-tint"]).toContain("--chip-tint-ds");
    expect(style["--chip-radius"]).not.toBe("");
    expect(style["--chip-fill-weight"]).not.toBe("");
    expect(style["--chip-stroke-weight"]).not.toBe("");
    expect(style["--chip-dot"]).toContain("--chip-dot-canonical");
  });

  it("swaps fill for stroke between instance and class", () => {
    const channels = {
      namespace: "ds",
      kind: "component",
      lifecycle: "none",
    } as const;
    const instance = buildChipChannelStyle({ ...channels, box: "instance" });
    const klass = buildChipChannelStyle({ ...channels, box: "class" });
    expect(instance["--chip-fill-weight"]).not.toBe(
      klass["--chip-fill-weight"],
    );
    expect(instance["--chip-stroke-weight"]).not.toBe(
      klass["--chip-stroke-weight"],
    );
  });

  it("maps the unmarked lifecycle to a transparent dot", () => {
    const style = buildChipChannelStyle({
      namespace: "docs",
      kind: "term",
      box: "instance",
      lifecycle: "none",
    });
    expect(style["--chip-dot"]).toBe("transparent");
  });
});

/* ------------------------------------------------------------------ */
/* Contrast regression (WCAG AA)                                       */
/* ------------------------------------------------------------------ */

/*
 * The chip's text is the tint, and the instance fill is that same tint at
 * the fill weight, alpha-composited over the page background — so the pair
 * can silently converge when either value moves. Dark mode ships a lower
 * `--chip-fill-weight-instance` precisely to hold this pairing at AA, and
 * this suite recomputes the ratio from the source values: light values from
 * the encoding-row fallbacks, dark values parsed from the `.dark` hooks in
 * `styles.css`.
 *
 * oklch → sRGB uses Björn Ottosson's published OKLab ↔ linear-sRGB
 * matrices; alpha compositing happens in gamma-encoded sRGB, where the
 * browser composites; luminance and ratio follow WCAG 2.x.
 */

type Srgb = readonly [number, number, number];

/**
 * The stylesheet's source, for parsing the dark theme hooks — the real
 * shipped values, not a copy. Read beside this test file (vitest's
 * `testPath`, so the read is independent of the runner's cwd; a plain
 * `import.meta.url` is not a file URL under the jsdom environment, and
 * vitest stubs CSS imports even with `?raw`).
 */
function readStylesCss(): string {
  const testPath = expect.getState().testPath;
  if (typeof testPath !== "string") {
    throw new Error("vitest did not expose the current test path");
  }
  return readFileSync(join(dirname(testPath), "styles.css"), "utf-8");
}

/** Parses the first `oklch(L C H)` in a value (`%` lightness supported). */
function parseOklch(value: string): readonly [number, number, number] {
  const match = value.match(
    /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)/,
  );
  if (match === null) {
    throw new Error(`No oklch() colour in "${value}"`);
  }
  const rawLightness = Number(match.at(1));
  const lightness = match.at(2) === "%" ? rawLightness / 100 : rawLightness;
  return [lightness, Number(match.at(3)), Number(match.at(4))];
}

function oklchToSrgb([lightness, chroma, hueDegrees]: readonly [
  number,
  number,
  number,
]): Srgb {
  const hueRadians = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const toGamma = (linear: number): number => {
    const clamped = Math.min(1, Math.max(0, linear));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055;
  };
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Alpha-composites `foreground` at `alpha` over an opaque `background`. */
function compositeOver(
  foreground: Srgb,
  alpha: number,
  background: Srgb,
): Srgb {
  return [
    alpha * foreground[0] + (1 - alpha) * background[0],
    alpha * foreground[1] + (1 - alpha) * background[1],
    alpha * foreground[2] + (1 - alpha) * background[2],
  ];
}

function relativeLuminance([red, green, blue]: Srgb): number {
  const linear = (channel: number): number =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

function contrastRatio(first: Srgb, second: Srgb): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The value a dark theme hook declares in `styles.css`. The hook appears in
 * both dark blocks (`:root.dark` and the `prefers-color-scheme` fallback);
 * all occurrences must agree or the two dark paths have drifted apart.
 */
function readDarkHookValue(property: string): string {
  const values = [
    ...readStylesCss().matchAll(new RegExp(`${property}:\\s*([^;]+);`, "g")),
  ].map((match) => (match.at(1) ?? "").trim());
  expect(values.length, `${property} declared in styles.css`).toBeGreaterThan(
    0,
  );
  expect(new Set(values).size, `${property} agrees across dark blocks`).toBe(1);
  return values.at(0) ?? "";
}

/** First percentage in a CSS value, as an alpha (`var(--x, 15%)` → 0.15). */
function parsePercentAsAlpha(value: string): number {
  const match = value.match(/([\d.]+)%/);
  if (match === null) {
    throw new Error(`No percentage in "${value}"`);
  }
  return Number(match.at(1)) / 100;
}

describe("instance chip contrast (WCAG AA)", () => {
  it("keeps text-vs-composited-fill at ≥ 4.5:1 for every namespace × theme", () => {
    const themes = {
      light: {
        // `--color-background` light: `--color-palette-white`
        // (@canonical/design-tokens sets.primitive.css).
        background: parseOklch("oklch(100% 0 0)"),
        fillAlpha: parsePercentAsAlpha(getBoxEncoding("instance").fillWeight),
        tintFor: (namespace: Namespace): string =>
          getNamespaceEncoding(namespace).tint,
      },
      dark: {
        // `--color-background` dark: `--color-palette-gray-930`.
        background: parseOklch("oklch(23.08% 0 0)"),
        fillAlpha: parsePercentAsAlpha(
          readDarkHookValue("--chip-fill-weight-instance"),
        ),
        tintFor: (namespace: Namespace): string =>
          readDarkHookValue(`--chip-tint-${namespace}`),
      },
    } as const;

    for (const [themeName, theme] of Object.entries(themes)) {
      for (const namespace of NAMESPACES) {
        const text = oklchToSrgb(parseOklch(theme.tintFor(namespace)));
        const fill = compositeOver(
          text,
          theme.fillAlpha,
          oklchToSrgb(theme.background),
        );
        const ratio = contrastRatio(text, fill);
        expect(
          ratio,
          `${namespace} tint on its instance fill (${themeName})`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
