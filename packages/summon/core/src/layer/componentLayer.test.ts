import { describe, expect, it } from "vitest";
import { layerSettingsFrom } from "./componentLayer.js";

describe("layerSettingsFrom", () => {
  it("reads what the package says about its layer", () => {
    // The generator copies these two strings and holds no opinion about them:
    // the names below are one design system's, and any other house's would do.
    expect(
      layerSettingsFrom({
        summon: {
          componentLayer: "ds.components.apps-lxd",
          layerOrderFrom: "@canonical/styles/layers.css",
        },
      }),
    ).toEqual({
      componentLayer: "ds.components.apps-lxd",
      layerOrderFrom: "@canonical/styles/layers.css",
    });
  });

  it("returns nothing when a package says nothing", () => {
    // No default: there is no layer name that is right for every house, and a
    // package outside any layered system wants its stylesheets left alone.
    expect(layerSettingsFrom({})).toEqual({
      componentLayer: undefined,
      layerOrderFrom: undefined,
    });
    expect(layerSettingsFrom(undefined)).toEqual({
      componentLayer: undefined,
      layerOrderFrom: undefined,
    });
  });

  it("takes the layer without the order file, and the other way round", () => {
    expect(layerSettingsFrom({ summon: { componentLayer: "app" } })).toEqual({
      componentLayer: "app",
      layerOrderFrom: undefined,
    });
    expect(
      layerSettingsFrom({ summon: { layerOrderFrom: "./order.css" } }),
    ).toEqual({ componentLayer: undefined, layerOrderFrom: "./order.css" });
  });
});
