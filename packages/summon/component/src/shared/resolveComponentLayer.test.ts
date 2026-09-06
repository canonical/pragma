import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import resolveComponentLayer, {
  GLOBAL_COMPONENT_LAYER,
} from "./resolveComponentLayer.js";

/** A throwaway package directory, optionally with a manifest naming it. */
const scaffold = (dirName: string, packageName?: string) => {
  const dir = join(mkdtempSync(join(tmpdir(), "summon-layer-")), dirName);
  require("node:fs").mkdirSync(dir);
  if (packageName) {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: packageName }),
    );
  }
  return dir;
};

describe("resolveComponentLayer", () => {
  it("reads the target package's manifest name, one case per tier level", () => {
    // The tier tree, from the root down: the global tier, a second-level tier,
    // and a sub-tier package that gets a layer named after its product.
    expect(
      resolveComponentLayer(scaffold("x", "@canonical/react-ds-global")),
    ).toBe("ds.components.global");
    expect(
      resolveComponentLayer(scaffold("x", "@canonical/react-ds-app")),
    ).toBe("ds.components.apps");
    expect(
      resolveComponentLayer(scaffold("x", "@canonical/react-ds-app-lxd")),
    ).toBe("ds.components.apps-lxd");
    expect(
      resolveComponentLayer(scaffold("x", "@canonical/react-ds-site-ubuntu")),
    ).toBe("ds.components.sites-ubuntu");
    expect(
      resolveComponentLayer(scaffold("x", "@canonical/react-ds-docs")),
    ).toBe("ds.components.documentation");
    expect(
      resolveComponentLayer(scaffold("x", "@canonical/react-ds-store-snap")),
    ).toBe("ds.components.stores-snap");
  });

  it("reads the directory name when there is no manifest yet", () => {
    // A package scaffolded moments ago has no manifest to read; the
    // packages/<framework>/<name> layout makes the directory the name.
    expect(resolveComponentLayer(scaffold("ds-app-lxd"))).toBe(
      "ds.components.apps-lxd",
    );
    expect(resolveComponentLayer(scaffold("ds-global"))).toBe(
      "ds.components.global",
    );
  });

  it("falls back to the global tier for anything untiered", () => {
    expect(resolveComponentLayer(scaffold("some-tool"))).toBe(
      GLOBAL_COMPONENT_LAYER,
    );
  });
});
