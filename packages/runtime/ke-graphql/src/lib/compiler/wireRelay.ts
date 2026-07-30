// =============================================================================
// Pass 6 — Wire Relay: SchemaPlan → SchemaPlan
//
// Pure plan surgery (no graphql-js objects yet):
// - id/uri/kind/label/comment/definition/_meta on every non-embeddable type
// - Node membership for non-embeddable types AND for generated interfaces
//   whose concrete implementors are all non-embeddable (Relay @refetchable
//   fragments on UIBlock need Node + id)
// - list object fields → connections with the four pagination args
// - root query fields: node(id), per-type lookup + listing
// =============================================================================

import { toFull, toPrefixed } from "../dataloader/index.js";
import {
  connectionFromPage,
  createDescriptiveResolver,
  paginateUriWindow,
  selectDescriptivePredicates,
  unwrapEntities,
} from "../resolver/index.js";
import {
  COMMENT_LOCAL_NAMES,
  type CompilerContext,
  DEFINITION_LOCAL_NAMES,
  type Diagnostic,
  type EntityValue,
  LABEL_LOCAL_NAMES,
  type MappedIR,
  type OntologyIR,
  type PassResult,
  RDFS_COMMENT,
  RDFS_LABEL,
  SKOS_DEFINITION,
  SKOS_PREF_LABEL,
} from "../shared/index.js";
import type { FieldPlan, SchemaPlan } from "./emit.js";

/** Create the Relay global-ID field plan (id: ID!). */
const createIdField = (): FieldPlan => ({
  name: "id",
  type: { base: "ID", kind: "scalar", list: false, nonNull: true },
  resolve: (parent: EntityValue) => parent.uri,
  description: "Relay global ID — the entity's prefixed URI.",
});

/** Create the uri field plan (uri: String!). */
const createUriField = (): FieldPlan => ({
  name: "uri",
  type: { base: "String", kind: "scalar", list: false, nonNull: true },
  resolve: (parent: EntityValue) => parent.uri,
});

/** Create the _meta field plan (self-describing TBox access). */
const createMetaField = (): FieldPlan => ({
  name: "_meta",
  type: { base: "EntityMeta", kind: "named", list: false, nonNull: true },
  resolve: (parent: EntityValue) => parent,
  description: "Self-describing TBox access for this entity.",
});

/**
 * Create the kind field plan (kind: String!) — the runtime type name resolved
 * back to its prefixed OWL class URI, so a generic view can branch on the
 * ontology class rather than on the generated GraphQL type name.
 */
const createKindField = (mapped: MappedIR): FieldPlan => ({
  name: "kind",
  type: { base: "String", kind: "scalar", list: false, nonNull: true },
  resolve: (parent: EntityValue) => {
    const owl = mapped.nameMap.toOWL(parent.typename);
    if (owl === undefined) {
      return parent.typename;
    }
    return toPrefixed(owl, mapped.namespaces);
  },
  description:
    "The node's ontology class, as a prefixed URI — the discriminator a generic view branches on.",
});

/** Create one descriptive field plan (label/comment/definition: String). */
const createDescriptiveField = (
  name: string,
  description: string,
  owlUri: string | undefined,
  ir: OntologyIR,
  universal: readonly string[],
  localNames: readonly string[],
): FieldPlan => ({
  name,
  type: { base: "String", kind: "scalar", list: false, nonNull: false },
  resolve: createDescriptiveResolver(
    selectDescriptivePredicates(owlUri, ir, universal, localNames),
  ),
  description,
});

/** Create the label field plan (label: String) — rdfs:label, then the tier. */
const createLabelField = (owlUri: string | undefined, ir: OntologyIR) =>
  createDescriptiveField(
    "label",
    "Generic display name for this node: rdfs:label, else skos:prefLabel, else the class's own name/title predicate. Null when none is asserted — callers render uri then.",
    owlUri,
    ir,
    [RDFS_LABEL, SKOS_PREF_LABEL],
    LABEL_LOCAL_NAMES,
  );

/** Create the comment field plan (comment: String) — rdfs:comment, then the tier. */
const createCommentField = (owlUri: string | undefined, ir: OntologyIR) =>
  createDescriptiveField(
    "comment",
    "Generic incidental prose for this node: rdfs:comment, else the class's own summary predicate. Null when none is asserted.",
    owlUri,
    ir,
    [RDFS_COMMENT],
    COMMENT_LOCAL_NAMES,
  );

/** Create the definition field plan (definition: String) — skos:definition first. */
const createDefinitionField = (owlUri: string | undefined, ir: OntologyIR) =>
  createDescriptiveField(
    "definition",
    "Generic defining prose for this node: skos:definition, else the class's own description predicate. Null when none is asserted.",
    owlUri,
    ir,
    [SKOS_DEFINITION],
    DEFINITION_LOCAL_NAMES,
  );

/**
 * Wire the Relay server conventions into the SchemaPlan (Pass 6): Node
 * membership with id/uri/kind/label/comment/definition/_meta on non-embeddable
 * types, connection-wrapping of list object fields, and the root
 * node/lookup/listing query fields.
 * Pure plan surgery — no graphql-js objects are constructed here.
 */
export default function wireRelay(plan: SchemaPlan): PassResult<SchemaPlan> {
  const diagnostics: Diagnostic[] = [];
  const { mapped } = plan;

  // ── connections: every list field whose base is a named non-embeddable
  //    type becomes a connection field with pagination args ──
  const wrapConnections = (fields: Map<string, FieldPlan>) => {
    for (const field of fields.values()) {
      if (!field.type.list || field.type.kind !== "named") {
        continue;
      }
      const targetType = plan.types.get(field.type.base);
      const targetInterface = plan.interfaces.get(field.type.base);
      const embeddableTarget =
        targetType?.embeddable ??
        (targetInterface ? targetInterface.embeddableOnly : false);
      if (embeddableTarget) {
        continue; // embedded lists stay plain lists
      }
      field.type = {
        base: field.type.base,
        kind: "connection",
        list: false,
        nonNull: true,
      };
      field.connectionArgs = true;
    }
  };

  for (const type of plan.types.values()) {
    wrapConnections(type.fields);
  }
  for (const iface of plan.interfaces.values()) {
    wrapConnections(iface.fields);
  }

  // ── id/uri/kind/label/comment/definition/_meta + Node membership ──
  const ir = mapped.ir;
  const structuralFields = (owlUri: string | undefined): FieldPlan[] => [
    createIdField(),
    createUriField(),
    createKindField(mapped),
    createLabelField(owlUri, ir),
    createCommentField(owlUri, ir),
    createDefinitionField(owlUri, ir),
    createMetaField(),
  ];

  for (const type of plan.types.values()) {
    if (type.embeddable) {
      continue;
    }
    const structural = structuralFields(type.owlUri);
    const existing = type.fields;
    type.fields = new Map([
      ...structural.map((f): [string, FieldPlan] => [f.name, f]),
      ...existing,
    ]);
    type.interfaces = ["Node", ...type.interfaces];
  }
  for (const iface of plan.interfaces.values()) {
    if (iface.embeddableOnly) {
      continue;
    }
    const structural = structuralFields(iface.owlUri);
    iface.fields = new Map([
      ...structural.map((f): [string, FieldPlan] => [f.name, f]),
      ...iface.fields,
    ]);
    iface.parents = ["Node", ...iface.parents];
  }

  // ── root query fields ──
  plan.queryFields.set("node", {
    name: "node",
    type: { base: "Node", kind: "named", list: false, nonNull: false },
    args: { id: { type: "ID", required: true } },
    resolve: async (_parent, args: { id?: string }, ctx: CompilerContext) => {
      if (!args.id) {
        return null;
      }
      const full = toFull(args.id, mapped.namespaces);
      if (!full) {
        return null; // unknown prefix
      }
      return ctx.entityLoader.load(full);
    },
    description: "Relay node resolution by prefixed-URI global ID.",
  });

  for (const type of plan.types.values()) {
    if (type.embeddable || !type.owlUri) {
      continue;
    }
    const mappedType = mapped.types.get(type.name);
    if (!mappedType) {
      continue;
    }
    const classUri = type.owlUri;

    plan.queryFields.set(mappedType.singularName, {
      name: mappedType.singularName,
      type: { base: type.name, kind: "named", list: false, nonNull: false },
      args: { uri: { type: "String", required: true } },
      resolve: async (
        _parent,
        args: { uri?: string },
        ctx: CompilerContext,
      ) => {
        if (!args.uri) {
          return null;
        }
        const full = toFull(args.uri, mapped.namespaces) ?? args.uri;
        return ctx.entityLoader.load(full);
      },
    });

    plan.queryFields.set(mappedType.pluralName, {
      name: mappedType.pluralName,
      type: { base: type.name, kind: "connection", list: false, nonNull: true },
      connectionArgs: true,
      resolve: async (_parent, args, ctx: CompilerContext) => {
        // Slice BEFORE hydration: cursors and pageInfo need only the
        // (name-sorted) URI list; entities are loaded for the page alone.
        const fullUris = await ctx.listLoader.load(classUri);
        const prefixed = fullUris.map((uri) =>
          toPrefixed(uri, mapped.namespaces),
        );
        const page = paginateUriWindow(prefixed, args);
        const entities = await ctx.entityLoader.loadMany(
          page.window.map((uri) => toFull(uri, mapped.namespaces) ?? uri),
        );
        return connectionFromPage(unwrapEntities(entities), page);
      },
    });
  }

  return { output: plan, diagnostics };
}
