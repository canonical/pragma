import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchema } from "graphql";
import { describe, expect, it } from "vitest";
import {
  EXTENSION_SCHEMA_PATH,
  forwardCompatibleExtensions,
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

describe("forwardCompatibleExtensions", () => {
  const bare = `
    type ClassProperty { property: String! }
    type EntityMeta { title: String! }
  `;

  it("declares both fields while the contract lacks them", () => {
    const extensions = forwardCompatibleExtensions(bare);
    expect(extensions).toContain("extend type ClassProperty");
    expect(extensions).toContain("name: String!");
    expect(extensions).toContain("extend type EntityMeta");
    expect(extensions).toContain("curie: String!");
  });

  it("declares neither once the contract carries both", () => {
    expect(
      forwardCompatibleExtensions(`
        type ClassProperty { property: String! name: String! }
        type EntityMeta { title: String! curie: String! }
      `),
    ).toBe("");
  });

  it("declares only the one that is still missing", () => {
    const extensions = forwardCompatibleExtensions(`
      type ClassProperty { property: String! name: String! }
      type EntityMeta { title: String! }
    `);
    expect(extensions).not.toContain("extend type ClassProperty");
    expect(extensions).toContain("extend type EntityMeta");
  });

  it("tolerates a type declared with no field block at all", () => {
    expect(
      forwardCompatibleExtensions(`
        type ClassProperty
        type EntityMeta
      `),
    ).toContain("extend type ClassProperty");
  });

  it("ignores a same-named field on some unrelated type", () => {
    expect(
      forwardCompatibleExtensions(`
        type Other { name: String! curie: String! }
        type ClassProperty { property: String! }
        type EntityMeta { title: String! }
      `),
    ).toContain("extend type ClassProperty");
  });

  it("produces a schema that builds either way", () => {
    expect(() => buildSchema(readProviderSdl())).not.toThrow();
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
});
