import { describe, expect, it } from "vitest";
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
    expect(deriveNamespaceFromUri("mystery:thing")).toBe("docs");
    expect(deriveNamespaceFromUri("no-prefix-at-all")).toBe("docs");
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
