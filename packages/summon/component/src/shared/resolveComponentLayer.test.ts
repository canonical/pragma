import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import resolveComponentLayer from "./resolveComponentLayer.js";

describe("resolveComponentLayer", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "summon-resolve-layer-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  /** Write a manifest into the temporary package. */
  const manifest = (contents: string): void => {
    writeFileSync(join(dir, "package.json"), contents);
  };

  it("reads both settings from the package being generated into", () => {
    manifest(
      JSON.stringify({
        name: "@acme/widgets",
        summon: {
          componentLayer: "acme.widgets",
          layerOrderFrom: "@acme/styles/layers.css",
        },
      }),
    );

    expect(resolveComponentLayer(dir)).toEqual({
      componentLayer: "acme.widgets",
      layerOrderFrom: "@acme/styles/layers.css",
    });
  });

  it("returns empty settings when the manifest says nothing", () => {
    manifest(JSON.stringify({ name: "@acme/widgets" }));

    expect(resolveComponentLayer(dir)).toEqual({
      componentLayer: undefined,
      layerOrderFrom: undefined,
    });
  });

  it("returns empty settings when there is no manifest to read", () => {
    // A directory outside any package is not a failure: the caller has said
    // nothing about layers, and the stylesheet is generated unwrapped.
    expect(resolveComponentLayer(dir)).toEqual({
      componentLayer: undefined,
      layerOrderFrom: undefined,
    });
  });

  it("returns empty settings when the manifest is not valid JSON", () => {
    manifest("{ not json");

    expect(resolveComponentLayer(dir)).toEqual({
      componentLayer: undefined,
      layerOrderFrom: undefined,
    });
  });
});
