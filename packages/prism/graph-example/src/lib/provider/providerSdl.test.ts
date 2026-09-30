import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchema } from "graphql";
import { describe, expect, it } from "vitest";
import {
  EXTENSION_SCHEMA_PATH,
  readExtensionSdl,
  readProviderSdl,
  resolveExtensionSchemaPath,
} from "./providerSdl.js";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "../../..");

describe("resolveExtensionSchemaPath", () => {
  it("finds the schema from the source layout", () => {
    expect(resolveExtensionSchemaPath(here)).toBe(
      resolve(packageRoot, "schema/extension.graphql"),
    );
  });

  it("finds the schema from the built layout", () => {
    expect(
      resolveExtensionSchemaPath(resolve(packageRoot, "dist/esm/lib/provider")),
    ).toBe(resolve(packageRoot, "schema/extension.graphql"));
  });

  it("falls back to a real, expected path when the file is missing", () => {
    expect(resolveExtensionSchemaPath("/nowhere/a/b/c")).toBe(
      "/nowhere/schema/extension.graphql",
    );
  });
});

describe("the shipped paths", () => {
  it("point at a file that exists", () => {
    expect(existsSync(EXTENSION_SCHEMA_PATH)).toBe(true);
  });
});

describe("readProviderSdl", () => {
  it("is the contract followed by the extension, never a vendored copy", () => {
    const sdl = readProviderSdl();
    const extension = readExtensionSdl();
    expect(sdl).toContain("interface Node");
    expect(sdl.endsWith(extension)).toBe(true);
    expect(sdl.indexOf("interface Node")).toBeLessThan(
      sdl.indexOf("type Station implements Node"),
    );
  });

  it("carries no vendored contract text in this package's own schema dir", () => {
    expect(readExtensionSdl()).not.toContain("interface Node");
  });

  it("builds", () => {
    expect(() => buildSchema(readProviderSdl())).not.toThrow();
  });
});
