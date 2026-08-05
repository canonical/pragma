// =============================================================================
// The provider's SDL = the authored contract, verbatim, plus this package's
// extension types.
//
// The contract half is READ AT RUNTIME from @canonical/prism-contract. It is
// never vendored, never copied, never pinned to a snapshot: the whole reason
// this package is worth having is that it starts FROM the authored SDL, so it
// cannot drift from it. If the contract changes, this provider's contract test
// turns red on the next run — which is the mechanism working, not a break.
//
// NODE / BUN ONLY, for the same reason the contract package is: the extension
// file is read through node:fs off import.meta.url.
// =============================================================================

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readContractSdl } from "@canonical/prism-contract";
import {
  type FieldDefinitionNode,
  type ObjectTypeDefinitionNode,
  parse,
} from "graphql";

/** The schema directory sits at the package root, beside src/ and dist/. */
const SCHEMA_RELATIVE_PATH = "schema/extension.graphql";

/** From src/lib/provider/ (vitest) the package root is three levels up. */
const SOURCE_LAYOUT_PREFIX = "../../..";

/** From dist/esm/lib/provider/ (the tsc build) it is four levels up. */
const BUILD_LAYOUT_PREFIX = "../../../..";

/**
 * Resolve the extension SDL for whichever layout `here` — the directory this
 * module was loaded from — belongs to. Falls back to the source layout so a
 * missing file names a real, expected path. Exported for tests, which probe
 * the layouts this module cannot occupy at test time.
 */
export const resolveExtensionSchemaPath = (here: string): string => {
  const sourceCandidate = resolve(
    here,
    SOURCE_LAYOUT_PREFIX,
    SCHEMA_RELATIVE_PATH,
  );
  if (existsSync(sourceCandidate)) {
    return sourceCandidate;
  }
  const buildCandidate = resolve(
    here,
    BUILD_LAYOUT_PREFIX,
    SCHEMA_RELATIVE_PATH,
  );
  if (existsSync(buildCandidate)) {
    return buildCandidate;
  }
  return sourceCandidate;
};

/** Absolute path to this package's extension SDL file. */
export const EXTENSION_SCHEMA_PATH: string = resolveExtensionSchemaPath(
  dirname(fileURLToPath(import.meta.url)),
);

/** Read this package's extension SDL as a string. */
export const readExtensionSdl = (): string =>
  readFileSync(EXTENSION_SCHEMA_PATH, "utf8");

/**
 * Fields this provider serves that the contract is in the process of gaining,
 * declared as `extend` only for as long as the contract lacks them.
 *
 * `ClassProperty.name` and `EntityMeta.curie` are landing in a parallel PR. A
 * provider is free to be ahead of the contract — the superset rule allows any
 * extra field — but it must not declare a field twice, which is what a static
 * `extend` would do the moment the contract PR lands. So the decision is made
 * from the contract text itself, and this whole function deletes cleanly once
 * both fields are in.
 *
 * Exported for tests, which drive both branches with a synthetic contract.
 */
export const forwardCompatibleExtensions = (contractSdl: string): string => {
  const document = parse(contractSdl);
  // `fields` is typed optional on the AST node, but graphql-js always emits an
  // array — a fieldless `type Foo` parses to `fields: []`, never undefined.
  // Narrowed here rather than defaulted, because a `?? []` would be a branch
  // no input can reach and unreachable fallbacks are dead code, not defence.
  const fieldsOf = (
    definition: ObjectTypeDefinitionNode,
  ): readonly FieldDefinitionNode[] =>
    definition.fields as readonly FieldDefinitionNode[];

  const declares = (typeName: string, fieldName: string): boolean =>
    document.definitions.some(
      (definition) =>
        definition.kind === "ObjectTypeDefinition" &&
        definition.name.value === typeName &&
        fieldsOf(definition).some((field) => field.name.value === fieldName),
    );

  return [
    declares("ClassProperty", "name")
      ? ""
      : "extend type ClassProperty {\n  name: String!\n}",
    declares("EntityMeta", "curie")
      ? ""
      : "extend type EntityMeta {\n  curie: String!\n}",
  ]
    .filter((block) => block !== "")
    .join("\n\n");
};

/**
 * The full SDL this provider serves: the contract first, the extension after.
 * Handing callers text rather than a GraphQLSchema keeps every consumer free
 * to build it with THEIR graphql instance — two majors coexist in this repo.
 */
export const readProviderSdl = (): string => {
  const contract = readContractSdl();
  return [contract, forwardCompatibleExtensions(contract), readExtensionSdl()]
    .filter((block) => block !== "")
    .join("\n");
};
