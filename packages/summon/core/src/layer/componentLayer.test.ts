import { describe, expect, it } from "vitest";
import {
  COMPONENT_TIER_LAYERS,
  componentLayerFor,
  GLOBAL_COMPONENT_LAYER,
  isSubTierLayer,
} from "./componentLayer.js";

describe("componentLayerFor", () => {
  it("names the five tiers pragma's order statement names", () => {
    expect(COMPONENT_TIER_LAYERS).toEqual([
      "ds.components.global",
      "ds.components.sites",
      "ds.components.documentation",
      "ds.components.stores",
      "ds.components.apps",
    ]);
  });

  it("puts the global tier and its slices in ds.components.global", () => {
    // `global` has no sub-tiers: a suffix is another slice of the same tier.
    expect(componentLayerFor("@canonical/react-ds-global")).toBe(
      "ds.components.global",
    );
    expect(componentLayerFor("@canonical/react-ds-global-form")).toBe(
      "ds.components.global",
    );
    expect(componentLayerFor("@canonical/svelte-ds-global")).toBe(
      "ds.components.global",
    );
  });

  it("puts a tier package in its own second-level layer", () => {
    expect(componentLayerFor("@canonical/react-ds-app")).toBe(
      "ds.components.apps",
    );
    expect(componentLayerFor("@canonical/svelte-ds-app")).toBe(
      "ds.components.apps",
    );
    expect(componentLayerFor("@canonical/react-ds-site")).toBe(
      "ds.components.sites",
    );
    expect(componentLayerFor("@canonical/react-ds-sites")).toBe(
      "ds.components.sites",
    );
    expect(componentLayerFor("@canonical/react-ds-docs")).toBe(
      "ds.components.documentation",
    );
    expect(componentLayerFor("@canonical/react-ds-documentation")).toBe(
      "ds.components.documentation",
    );
    expect(componentLayerFor("@canonical/react-ds-store")).toBe(
      "ds.components.stores",
    );
    expect(componentLayerFor("@canonical/react-ds-stores")).toBe(
      "ds.components.stores",
    );
  });

  it("puts a sub-tier package in a layer named after the product", () => {
    expect(componentLayerFor("@canonical/react-ds-app-lxd")).toBe(
      "ds.components.apps-lxd",
    );
    expect(componentLayerFor("@canonical/svelte-ds-app-wpe")).toBe(
      "ds.components.apps-wpe",
    );
    expect(componentLayerFor("@canonical/react-ds-site-ubuntu")).toBe(
      "ds.components.sites-ubuntu",
    );
    expect(componentLayerFor("@canonical/react-ds-docs-lxd")).toBe(
      "ds.components.documentation-lxd",
    );
    expect(componentLayerFor("@canonical/react-ds-store-snap")).toBe(
      "ds.components.stores-snap",
    );
    // A two-word product keeps its hyphens; the tier stem is what is stripped.
    expect(componentLayerFor("@canonical/react-ds-app-anbox-cloud")).toBe(
      "ds.components.apps-anbox-cloud",
    );
  });

  it("falls back to global for a name with no tier in it", () => {
    expect(componentLayerFor("@canonical/react-hooks")).toBe(
      GLOBAL_COMPONENT_LAYER,
    );
    expect(componentLayerFor("@canonical/ds-assets")).toBe(
      GLOBAL_COMPONENT_LAYER,
    );
    expect(componentLayerFor(undefined)).toBe(GLOBAL_COMPONENT_LAYER);
    expect(componentLayerFor("")).toBe(GLOBAL_COMPONENT_LAYER);
  });

  it("does not read a tier stem out of the middle of a longer word", () => {
    // `ds-approvals` starts like `ds-app` but is not the apps tier.
    expect(componentLayerFor("@canonical/react-ds-approvals")).toBe(
      GLOBAL_COMPONENT_LAYER,
    );
  });
});

describe("isSubTierLayer", () => {
  it("is false for the five named tiers and true for a product layer", () => {
    for (const layer of COMPONENT_TIER_LAYERS) {
      expect(isSubTierLayer(layer)).toBe(false);
    }
    expect(isSubTierLayer("ds.components.apps-lxd")).toBe(true);
    expect(isSubTierLayer("ds.components.sites-ubuntu")).toBe(true);
  });
});
