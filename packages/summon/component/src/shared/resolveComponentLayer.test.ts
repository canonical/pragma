import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import resolveComponentLayer, {
  APP_COMPONENT_LAYER,
  componentLayerFor,
  GLOBAL_COMPONENT_LAYER,
} from "./resolveComponentLayer.js";

describe("componentLayerFor", () => {
  it("puts an application tier in ds.components.app by its package name", () => {
    expect(
      componentLayerFor("@canonical/react-ds-app-lxd", "/somewhere/else"),
    ).toBe(APP_COMPONENT_LAYER);
    expect(componentLayerFor("@canonical/svelte-ds-app-wpe", "/tmp")).toBe(
      APP_COMPONENT_LAYER,
    );
  });

  it("puts a suffixless application tier in ds.components.app by name", () => {
    // @canonical/react-ds-app and @canonical/svelte-ds-app are application
    // tiers with no product suffix; a pattern requiring a trailing hyphen sends
    // their components to the global tier, silently.
    expect(
      componentLayerFor("@canonical/react-ds-app", "/somewhere/else"),
    ).toBe(APP_COMPONENT_LAYER);
    expect(componentLayerFor("@canonical/svelte-ds-app", "/tmp")).toBe(
      APP_COMPONENT_LAYER,
    );
  });

  it("puts an application tier in ds.components.app by its directory", () => {
    expect(
      componentLayerFor(undefined, "/repo/packages/react/ds-app-lxd"),
    ).toBe(APP_COMPONENT_LAYER);
    expect(
      componentLayerFor(undefined, "/repo/packages/svelte/ds-app-wpe/src/lib"),
    ).toBe(APP_COMPONENT_LAYER);
    expect(componentLayerFor(undefined, "/repo/packages/react/ds-app")).toBe(
      APP_COMPONENT_LAYER,
    );
    expect(
      componentLayerFor(undefined, "/repo/packages/svelte/ds-app/src/lib"),
    ).toBe(APP_COMPONENT_LAYER);
  });

  it("puts every other package in ds.components.global", () => {
    expect(
      componentLayerFor(
        "@canonical/react-ds-global",
        "/repo/packages/react/ds-global",
      ),
    ).toBe(GLOBAL_COMPONENT_LAYER);
    expect(
      componentLayerFor(
        "@canonical/react-ds-global-form",
        "/repo/packages/react/ds-global-form",
      ),
    ).toBe(GLOBAL_COMPONENT_LAYER);
    expect(
      componentLayerFor(undefined, "/repo/apps/react/boilerplate-vite"),
    ).toBe(GLOBAL_COMPONENT_LAYER);
  });

  it("handles a path that ends at packages/ with nothing under it", () => {
    expect(componentLayerFor(undefined, "/repo/packages")).toBe(
      GLOBAL_COMPONENT_LAYER,
    );
  });

  it("matches ds-app at a boundary, not as a bare prefix", () => {
    // Widening the pattern to catch the suffixless tiers must not sweep in a
    // package that merely starts the same way.
    expect(
      componentLayerFor(
        "@canonical/react-ds-approvals",
        "/repo/packages/react/ds-approvals",
      ),
    ).toBe(GLOBAL_COMPONENT_LAYER);
  });

  it("does not mistake a directory merely named ds-app-… elsewhere", () => {
    // The rule is `packages/<framework>/ds-app-*`, not any segment anywhere.
    expect(componentLayerFor(undefined, "/repo/docs/ds-app-notes")).toBe(
      GLOBAL_COMPONENT_LAYER,
    );
  });
});

describe("resolveComponentLayer", () => {
  it("falls back to the directory when there is no readable manifest", () => {
    expect(resolveComponentLayer(tmpdir())).toBe(GLOBAL_COMPONENT_LAYER);
  });

  it("reads the target package's manifest name", () => {
    // This package's own directory: not an application tier.
    expect(
      resolveComponentLayer(new URL("../..", import.meta.url).pathname),
    ).toBe(GLOBAL_COMPONENT_LAYER);
  });
});
