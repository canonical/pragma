/**
 * PROTECTED — `spec/generator-definition.v1.schema.json` is summon's DOMAIN
 * spec, and this is the guard that keeps it from drifting away from the types
 * it describes.
 *
 * Deliberately ajv-FREE. A validator would prove that some example document
 * satisfies the schema — which is not the failure being guarded. The failure is
 * a field added to (or renamed in) `GeneratorDefinition` / `GeneratorMeta` /
 * `PromptDefinition` while the published schema quietly keeps describing the
 * old shape. So the check is on KEY SETS, held to the TypeScript interfaces by
 * `satisfies Record<keyof T, unknown>`: adding a field to an interface makes
 * the corresponding literal below stop compiling until it is listed, and the
 * runtime assertion then fails until the JSON is updated too. Two steps, both
 * mechanical, neither skippable — and no dependency added to a package that
 * ships to every generator author.
 *
 * The schema is READ FROM DISK exactly as a consumer would read it, so an
 * edit that breaks its JSON fails here rather than at a downstream tool.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type GeneratorDefinition from "./GeneratorDefinition.js";
import type GeneratorMeta from "./GeneratorMeta.js";
import type PromptDefinition from "./PromptDefinition.js";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(
  here,
  "../..",
  join("spec", "generator-definition.v1.schema.json"),
);

interface JsonSchemaObject {
  readonly $id?: string;
  readonly $comment?: string;
  readonly title?: string;
  readonly type?: string;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
  readonly properties?: Readonly<Record<string, JsonSchemaObject>>;
  readonly $defs?: Readonly<Record<string, JsonSchemaObject>>;
  readonly enum?: readonly string[];
}

const schema = JSON.parse(
  readFileSync(schemaPath, "utf-8"),
) as JsonSchemaObject;

/** The declared property names of a schema object, sorted. */
function propertyNames(node: JsonSchemaObject | undefined): string[] {
  return Object.keys(node?.properties ?? {}).sort();
}

// The three key sets, each held to its interface by the compiler. A field added
// to an interface breaks THIS file first — `satisfies` requires every key.
const DEFINITION_KEYS = {
  meta: true,
  prompts: true,
  generate: true,
} satisfies Record<keyof GeneratorDefinition, unknown>;

const META_KEYS = {
  name: true,
  displayName: true,
  description: true,
  version: true,
  author: true,
  help: true,
  examples: true,
} satisfies Record<keyof GeneratorMeta, unknown>;

const PROMPT_KEYS = {
  name: true,
  message: true,
  type: true,
  default: true,
  choices: true,
  when: true,
  validate: true,
  group: true,
  positional: true,
} satisfies Record<keyof PromptDefinition, unknown>;

describe("generator-definition.v1 schema — drift guard (PROTECTED)", () => {
  it("is the versioned, self-identifying domain spec", () => {
    expect(schema.$id).toBe(
      "https://canonical.com/schemas/summon/generator-definition.v1.schema.json",
    );
    // The ruling is carried IN the artifact: this is summon's domain spec, not
    // the shared command contract. Anyone who finds the file finds the scope.
    expect(schema.$comment).toContain("summon's own DOMAIN spec");
    expect(schema.$comment).toContain(
      "must not be taken to describe, the contract between a CLI kernel and its commands",
    );
  });

  it("describes exactly GeneratorDefinition's fields", () => {
    expect(propertyNames(schema)).toEqual(Object.keys(DEFINITION_KEYS).sort());
    expect(schema.required).toEqual(["meta", "prompts"]);
    expect(schema.additionalProperties).toBe(false);
  });

  it("describes exactly GeneratorMeta's fields, with the four required ones", () => {
    const meta = schema.$defs?.meta;
    expect(propertyNames(meta)).toEqual(Object.keys(META_KEYS).sort());
    expect(meta?.required).toEqual([
      "name",
      "displayName",
      "description",
      "version",
    ]);
    expect(meta?.additionalProperties).toBe(false);
  });

  it("describes exactly PromptDefinition's fields, with its input types", () => {
    const prompt = schema.$defs?.prompt;
    expect(propertyNames(prompt)).toEqual(Object.keys(PROMPT_KEYS).sort());
    expect(prompt?.required).toEqual(["name", "message", "type"]);
    expect(prompt?.additionalProperties).toBe(false);
    expect(prompt?.properties?.type?.enum).toEqual([
      "text",
      "confirm",
      "select",
      "multiselect",
    ]);
  });

  it("marks every CODE-CARRIED field as such, so no reader mistakes it for data", () => {
    // `generate`, `when` and `validate` are functions. A JSON projection cannot
    // carry them; the schema says so instead of silently omitting them, which
    // would read as "a generator has no generate".
    for (const node of [
      schema.properties?.generate,
      schema.$defs?.prompt?.properties?.when,
      schema.$defs?.prompt?.properties?.validate,
    ]) {
      expect(node?.$comment).toContain("CODE-CARRIED, not data");
      expect(node?.type).toBe("null");
    }
  });
});
