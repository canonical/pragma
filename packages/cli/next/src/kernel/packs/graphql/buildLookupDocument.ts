/**
 * Generate the ONE GraphQL document a `source: "graphql"` pack lookup executes
 * after its SPARQL name→URI resolve.
 *
 * The compiler — not the pack author — writes the GraphQL: pack declarations
 * name RDF properties, and this module maps each onto the OWL-derived schema
 * using the same naming rules the ke-graphql compiler applied (strip `has`/`is`,
 * pluralize for multi-valued fields — see {@link ./nameMap}).
 *
 * Missing-name semantics mirror the SPARQL path's OPTIONAL clauses: a DERIVED
 * name that maps onto no schema field anywhere simply drops out of the document
 * (ontology drift degrades to emptiness, not failure). An EXPLICIT `graphqlField`
 * override that names no field is a fail-fast error, as are cardinality
 * mismatches. A property on only some concrete classes under an interface
 * fragment resolves through subtype-scoped `... on <Subtype>` fragments.
 *
 * Injection safety: the document text is composed ONLY from validated pack terms
 * and names read from the compiled schema; the entity IRI travels via
 * `variableValues.uri`, never string interpolation.
 *
 * Ported from #856; retargeted onto graphql-js `GraphQLSchema` (referenced as an
 * inline type — this module has no runtime `graphql`/`ke-graphql` import, so it
 * stays off the storeless fast path).
 */

import { PragmaError } from "../../error/PragmaError.js";
import { activeExpands, activeFields } from "./../sparql/buildLookupQuery.js";
import type {
  PackExpand,
  PackField,
  PackLookup,
  PackNestedExpand,
} from "../types.js";
import { isNestedExpand } from "../types.js";
import { MAX_PAGE_SIZE, pluralize, stripVerbPrefix } from "./nameMap.js";

type GraphQLSchema = import("graphql").GraphQLSchema;

/** Local name of an IRI (`…#Thing`/`…/Thing` → `Thing`). */
function extractLocalName(uri: string): string {
  const hash = uri.lastIndexOf("#");
  if (hash !== -1) return uri.slice(hash + 1);
  const slash = uri.lastIndexOf("/");
  if (slash !== -1) return uri.slice(slash + 1);
  return uri;
}

/** How one selected key unwraps back into the flat pack entity shape. */
export type FieldProjection =
  | { readonly kind: "scalar"; readonly name: string }
  | { readonly kind: "entity"; readonly name: string }
  | { readonly kind: "iri"; readonly name: string }
  | {
      readonly kind: "collection";
      readonly name: string;
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

/** The subset of graphql-js type structure the generator inspects. */
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

/** Is the field type a GraphQL list? Detected from the type's string form. */
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
  if (term.includes("://")) return extractLocalName(term);
  const colon = term.indexOf(":");
  return colon === -1 ? term : term.slice(colon + 1);
}

function buildDocumentError(source: string, message: string): PragmaError {
  return PragmaError.configError(`Invalid story in ${source}: ${message}`);
}

/**
 * Resolve a pack term to the GraphQL field it maps to on a container type. With
 * an explicit `graphqlField` the name is only checked for existence (a miss
 * throws). Otherwise the derivation applies; a derived miss returns `undefined`.
 */
function resolveGraphqlField(
  container: CompositeTypeLike,
  term: string,
  override: string | undefined,
  preferPlural: boolean,
  where: string,
  source: string,
): { fieldName: string; type: unknown } | undefined {
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
    if (match) return { fieldName: candidate, type: match.type };
  }
  return undefined;
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
 * Build the selection for one flat value (field or section): scalars select
 * bare, singular entity references select `{ uri }`. Multi-valued fields are
 * rejected. `undefined` when the derived name maps onto no field.
 */
function buildValueSelection(
  container: CompositeTypeLike,
  value: { name: string; property: string; graphqlField?: string },
  where: string,
  source: string,
): Selection | undefined {
  const resolved = resolveGraphqlField(
    container,
    value.property,
    value.graphqlField,
    false,
    where,
    source,
  );
  if (!resolved) return undefined;
  const { fieldName, type } = resolved;
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
  if (fieldName === "uri") {
    return {
      text: aliased(value.name, fieldName),
      projection: { kind: "iri", name: value.name },
    };
  }
  return {
    text: aliased(value.name, fieldName),
    projection: { kind: "scalar", name: value.name },
  };
}

/**
 * Build the selection for a multi-valued projection (an expand or nested
 * expand): Relay connections select through `edges { node }`; embedded lists
 * select children directly. `undefined` when the relation maps onto no field or
 * every child selection was omitted.
 */
function buildCollectionSelection(
  container: CompositeTypeLike,
  expand: PackExpand | PackNestedExpand,
  where: string,
  source: string,
): Selection | undefined {
  const resolved = resolveGraphqlField(
    container,
    expand.relation,
    expand.graphqlField,
    true,
    where,
    source,
  );
  if (!resolved) return undefined;
  const { fieldName, type } = resolved;
  const named = namedType(type);
  const connection = isConnection(named);
  if (!connection && !isListType(type)) {
    throw buildDocumentError(
      source,
      `"${where}" relation "${expand.relation}" resolves to singular GraphQL field "${container.name}.${fieldName}" — declare it as a field.`,
    );
  }
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

  const children: Selection[] = expand.select
    .map((entry, index) => {
      const childWhere = `${where}.select[${index}]`;
      if (isNestedExpand(entry)) {
        return buildCollectionSelection(nodeType, entry, childWhere, source);
      }
      return buildValueSelection(nodeType, entry, childWhere, source);
    })
    .filter((child): child is Selection => child !== undefined);
  if (children.length === 0) return undefined;
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

/** The concrete object types under an interface fragment (empty for object types). */
function possibleSubtypes(
  schema: GraphQLSchema,
  fragmentType: CompositeTypeLike,
): CompositeTypeLike[] {
  const lookup = (
    schema as unknown as {
      getPossibleTypes(type: unknown): readonly unknown[];
    }
  ).getPossibleTypes;
  return lookup.call(schema, fragmentType).filter(isComposite);
}

/**
 * Build one top-level selection, falling back to subtype scoping: a term that
 * does not resolve on the fragment type is tried on each concrete class under it
 * and selected inside `... on <Subtype>` fragments. `undefined` when the term
 * resolves nowhere (omitted, mirroring an unbound OPTIONAL).
 */
function buildScopedSelection(
  schema: GraphQLSchema,
  fragmentType: CompositeTypeLike,
  build: (container: CompositeTypeLike) => Selection | undefined,
): Selection | undefined {
  const direct = build(fragmentType);
  if (direct) return direct;
  const scoped = possibleSubtypes(schema, fragmentType)
    .map((subtype) => {
      const selection = build(subtype);
      return selection === undefined
        ? undefined
        : {
            ...selection,
            text: `... on ${subtype.name} { ${selection.text} }`,
          };
    })
    .filter((selection): selection is Selection => selection !== undefined);
  if (scoped.length === 0) return undefined;
  return {
    text: scoped.map((selection) => selection.text).join(" "),
    projection: (scoped[0] as Selection).projection,
  };
}

/**
 * Generate the lookup document for a pack lookup at a canonical level.
 *
 * @param lookup - A validated graphql-sourced lookup declaration.
 * @param schema - The runtime's compiled OWL-derived schema.
 * @param source - Pack source, for error attribution.
 * @param level - Active canonical level (undefined: everything included).
 * @returns The document text and its unwrap plan.
 * @throws PragmaError CONFIG_ERROR when a declaration does not map onto the schema.
 */
export function buildLookupDocument(
  lookup: PackLookup,
  schema: GraphQLSchema,
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
    ...activeFields(lookup, level).map((field: PackField, index) =>
      buildScopedSelection(schema, fragmentType, (container) =>
        buildValueSelection(
          container,
          field,
          `lookup.fields/sections[${index}]`,
          source,
        ),
      ),
    ),
    ...activeExpands(lookup, level).map((expand, index) =>
      buildScopedSelection(schema, fragmentType, (container) =>
        buildCollectionSelection(
          container,
          expand,
          `lookup.expand[${index}]`,
          source,
        ),
      ),
    ),
  ].filter((selection): selection is Selection => selection !== undefined);

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
