import {
  MAX_PAGE_SIZE,
  pluralize,
  stripVerbPrefix,
} from "@canonical/ke-graphql";
import { PragmaError } from "#error";
import extractLocalName from "../../extractLocalName.js";
import type { PragmaGraphqlApi } from "../../types/index.js";
import { activeLookupExpands, activeLookupFields } from "./buildLookupQuery.js";
import type {
  StoryPackExpand,
  StoryPackLookup,
  StoryPackNestedExpand,
} from "./types.js";
import { isNestedExpand } from "./types.js";

/**
 * Generate the ONE GraphQL document a `source: "graphql"` pack lookup
 * executes after its SPARQL name→URI resolve.
 *
 * The compiler — not the pack author — writes the GraphQL: pack
 * declarations name RDF properties, and this module maps each onto the
 * OWL-derived schema using the same naming rules the ke-graphql compiler
 * applied when it generated the schema (strip `has`/`is`, pluralize for
 * multi-valued fields), validating every derived name against the actual
 * schema type so a mismatch fails fast with a `graphqlField` hint instead
 * of silently returning nulls.
 *
 * Injection safety: the document text is composed ONLY from validated pack
 * terms (identifier-shaped names) and names read from the compiled schema;
 * the entity IRI travels via `variableValues.$uri`, never string
 * interpolation. There is no user input on this path at all — the name the
 * user typed stays in the SPARQL resolve, which escapes it as a literal.
 */

/**
 * How one selected key of the executed document unwraps back into the flat
 * pack entity shape (shape-identical to the SPARQL path, so renderers and
 * envelopes downstream cannot tell the fetch layers apart).
 */
export type FieldProjection =
  | {
      /** A leaf value: unwraps to a string. */
      readonly kind: "scalar";
      readonly name: string;
    }
  | {
      /** A singular entity reference: `{ uri }` unwraps to the IRI string. */
      readonly kind: "entity";
      readonly name: string;
    }
  | {
      /** A multi-valued projection: unwraps to an array of child rows. */
      readonly kind: "collection";
      readonly name: string;
      /** Relay connection (`edges { node }` envelope) vs plain list. */
      readonly connection: boolean;
      readonly children: readonly FieldProjection[];
    };

/** A generated lookup document with its unwrap plan. */
export interface LookupDocumentPlan {
  /** GraphQL document text, `$uri: ID!` as its only variable. */
  readonly source: string;
  /** One projection per selected key under the fragment. */
  readonly projections: readonly FieldProjection[];
}

/**
 * The subset of graphql-js type structure the generator inspects. Typed
 * structurally because pragma deliberately has no direct `graphql`
 * dependency (ke-graphql owns the graphql-js instance; a second copy would
 * risk dual-package hazards).
 */
interface CompositeTypeLike {
  readonly name: string;
  getFields(): Record<string, { readonly type: unknown }>;
}

/** Does a schema type expose fields (object or interface)? */
function isComposite(type: unknown): type is CompositeTypeLike {
  return (
    typeof type === "object" &&
    type !== null &&
    "getFields" in type &&
    typeof (type as CompositeTypeLike).getFields === "function"
  );
}

/** Unwrap NonNull/List wrappers to the named type underneath. */
function namedType(type: unknown): unknown {
  let current = type;
  while (
    typeof current === "object" &&
    current !== null &&
    "ofType" in current &&
    (current as { ofType?: unknown }).ofType
  ) {
    current = (current as { ofType: unknown }).ofType;
  }
  return current;
}

/**
 * Is the field type a GraphQL list? Detected from the type's string form
 * (`[Tier!]!` ⇒ list) — wrapper classes are not distinguishable
 * structurally, and the bracket notation is stable graphql-js API.
 */
function isListType(type: unknown): boolean {
  return String(type).includes("[");
}

/** Is the named type a generated Relay connection envelope? */
function isConnection(type: unknown): type is CompositeTypeLike {
  return (
    isComposite(type) &&
    type.name.endsWith("Connection") &&
    "edges" in type.getFields()
  );
}

/** Local name of a validated pack term (`ds:Component` → `Component`). */
function termLocalName(term: string): string {
  if (term.includes("://")) {
    return extractLocalName(term);
  }
  const colon = term.indexOf(":");
  return colon === -1 ? term : term.slice(colon + 1);
}

function buildDocumentError(source: string, message: string): PragmaError {
  return PragmaError.configError(`Invalid story in ${source}: ${message}`);
}

/**
 * Resolve a pack term to the GraphQL field it maps to on a container type.
 *
 * With an explicit `graphqlField` the name is only checked for existence.
 * Otherwise the ontology→schema derivation is applied: local name, strip
 * `has`/`is`, and try both the singular and pluralized forms (the compiler
 * pluralizes multi-valued fields) — `preferPlural` orders the candidates
 * for the caller's cardinality expectation.
 */
function resolveGraphqlField(
  container: CompositeTypeLike,
  term: string,
  override: string | undefined,
  preferPlural: boolean,
  where: string,
  source: string,
): { fieldName: string; type: unknown } {
  const fields = container.getFields();
  if (override) {
    const match = fields[override];
    if (!match) {
      throw buildDocumentError(
        source,
        `"${where}.graphqlField" "${override}" is not a field of GraphQL type "${container.name}".`,
      );
    }
    return { fieldName: override, type: match.type };
  }
  if (term.includes("/") && !term.includes("://")) {
    throw buildDocumentError(
      source,
      `"${where}" uses a property path ("${term}"), which the GraphQL source cannot express — set "graphqlField" or use source "sparql".`,
    );
  }
  const base = stripVerbPrefix(termLocalName(term));
  const forms = preferPlural
    ? [pluralize(base), base]
    : [base, pluralize(base)];
  for (const candidate of [...new Set(forms)]) {
    const match = fields[candidate];
    if (match) {
      return { fieldName: candidate, type: match.type };
    }
  }
  throw buildDocumentError(
    source,
    `"${where}" property "${term}" derives no field on GraphQL type "${container.name}" (tried ${[
      ...new Set(forms),
    ].join(", ")}) — set "graphqlField" explicitly.`,
  );
}

/** A selection line plus how to unwrap its key. */
interface Selection {
  readonly text: string;
  readonly projection: FieldProjection;
}

/** Alias a selection only when the output name differs from the field. */
function aliased(name: string, fieldName: string): string {
  return name === fieldName ? name : `${name}: ${fieldName}`;
}

/**
 * Build the selection for one flat pack value (field or section): scalars
 * select bare, singular entity references select `{ uri }` (the IRI is what
 * the SPARQL path binds). Multi-valued fields are rejected — packs express
 * those as expands.
 */
function buildValueSelection(
  container: CompositeTypeLike,
  value: { name: string; property: string; graphqlField?: string },
  where: string,
  source: string,
): Selection {
  const { fieldName, type } = resolveGraphqlField(
    container,
    value.property,
    value.graphqlField,
    false,
    where,
    source,
  );
  const named = namedType(type);
  if (isConnection(named) || isListType(type)) {
    throw buildDocumentError(
      source,
      `"${where}" property "${value.property}" resolves to multi-valued GraphQL field "${container.name}.${fieldName}" — declare it as an expand.`,
    );
  }
  if (isComposite(named)) {
    return {
      text: `${aliased(value.name, fieldName)} { uri }`,
      projection: { kind: "entity", name: value.name },
    };
  }
  return {
    text: aliased(value.name, fieldName),
    projection: { kind: "scalar", name: value.name },
  };
}

/**
 * Build the selection for a multi-valued projection (an expand or a nested
 * expand): Relay connections select through the `edges { node }` envelope
 * with an explicit page bound (the schema clamps at {@link MAX_PAGE_SIZE}
 * anyway — stating it makes the fetched window explicit); embedded lists
 * select children directly.
 */
function buildCollectionSelection(
  container: CompositeTypeLike,
  expand: StoryPackExpand | StoryPackNestedExpand,
  where: string,
  source: string,
): Selection {
  const { fieldName, type } = resolveGraphqlField(
    container,
    expand.relation,
    expand.graphqlField,
    true,
    where,
    source,
  );
  const named = namedType(type);
  const connection = isConnection(named);
  if (!connection && !isListType(type)) {
    throw buildDocumentError(
      source,
      `"${where}" relation "${expand.relation}" resolves to singular GraphQL field "${container.name}.${fieldName}" — declare it as a field.`,
    );
  }
  // Child container: the node type for connections, the element type for
  // plain (embedded) lists.
  const childType = connection
    ? namedType(named.getFields().edges?.type)
    : named;
  const nodeType =
    connection && isComposite(childType)
      ? namedType(childType.getFields().node?.type)
      : childType;
  if (!isComposite(nodeType)) {
    throw buildDocumentError(
      source,
      `"${where}" relation "${expand.relation}" resolves to a list of scalars on "${container.name}" — declare it as a field or fix the relation.`,
    );
  }

  const children: Selection[] = expand.select.map((entry, index) => {
    const childWhere = `${where}.select[${index}]`;
    if (isNestedExpand(entry)) {
      return buildCollectionSelection(nodeType, entry, childWhere, source);
    }
    return buildValueSelection(nodeType, entry, childWhere, source);
  });
  const childText = children.map((child) => child.text).join(" ");
  const body = connection
    ? `(first: ${MAX_PAGE_SIZE}) { edges { node { ${childText} } } }`
    : ` { ${childText} }`;
  return {
    text: `${aliased(expand.name, fieldName)}${body}`,
    projection: {
      kind: "collection",
      name: expand.name,
      connection,
      children: children.map((child) => child.projection),
    },
  };
}

/**
 * Generate the lookup document for a pack lookup at a disclosure level.
 *
 * Level-gated fields and expands below the active level simply drop out of
 * the document (fetch-gating, mirroring the SPARQL path). The document
 * resolves the entity through the Relay `node(id:)` root — full IRIs pass
 * through the global-ID decoding — and an inline fragment on the pack's
 * GraphQL type, so one document serves every concrete class under an
 * interface (e.g. `UIBlock` for Component/Pattern/Layout/Subcomponent).
 *
 * @param lookup - A validated graphql-sourced lookup declaration.
 * @param schema - The runtime's compiled OWL-derived schema.
 * @param source - Pack source, for error attribution.
 * @param level - Active disclosure level (omitted: everything included).
 * @returns The document text and its unwrap plan.
 * @throws PragmaError with code CONFIG_ERROR when a declaration does not
 *   map onto the compiled schema.
 */
export default function buildLookupDocument(
  lookup: StoryPackLookup,
  schema: PragmaGraphqlApi["schema"],
  source: string,
  level?: string,
): LookupDocumentPlan {
  const typeName = lookup.graphqlType ?? termLocalName(lookup.type ?? "");
  const fragmentType = schema.getType(typeName);
  if (!isComposite(fragmentType)) {
    throw buildDocumentError(
      source,
      `lookup.graphqlType "${typeName}" is not an object or interface type in the compiled GraphQL schema.`,
    );
  }

  const selections: Selection[] = [
    ...activeLookupFields(lookup, level).map((field, index) =>
      buildValueSelection(
        fragmentType,
        field,
        `lookup.fields/sections[${index}]`,
        source,
      ),
    ),
    ...activeLookupExpands(lookup, level).map((expand, index) =>
      buildCollectionSelection(
        fragmentType,
        expand,
        `lookup.expand[${index}]`,
        source,
      ),
    ),
  ];

  const body = selections.map((selection) => `      ${selection.text}`);
  const text = [
    "query PackLookup($uri: ID!) {",
    "  node(id: $uri) {",
    `    ... on ${fragmentType.name} {`,
    ...(body.length > 0 ? body : ["      uri"]),
    "    }",
    "  }",
    "}",
  ].join("\n");

  return {
    source: text,
    projections: selections.map((selection) => selection.projection),
  };
}
