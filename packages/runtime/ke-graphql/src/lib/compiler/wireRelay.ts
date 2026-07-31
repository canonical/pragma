// =============================================================================
// Pass 6 — Wire Relay: SchemaPlan → SchemaPlan
//
// Pure plan surgery (no graphql-js objects yet):
// - uri + _meta on every non-embeddable type; _meta alone on embeddables
//   (self-description is a fact about the class, not about identity)
// - Node membership for non-embeddable types AND for generated interfaces
//   whose concrete implementors are all non-embeddable (Relay @refetchable
//   fragments on UIBlock need Node)
// - list object fields → connections with the four pagination args
// - root query fields: node(id), per-type lookup + listing
//
// Identity is the ABSOLUTE IRI end to end: EntityValue.uri, Node.uri, the
// node(id:) argument, the listing's URI window, and the cursors derived from
// it are all the same string. The prefixed form survives only as the singular
// `<type>(uri:)` lookup's INPUT convenience, expanded by toFull.
// =============================================================================

import { toFull } from "../dataloader/index.js";
import { isAbsoluteIri } from "../hardening/index.js";
import {
  connectionFromPage,
  paginateUriWindow,
  unwrapEntities,
} from "../resolver/index.js";
import type {
  CompilerContext,
  Diagnostic,
  EntityValue,
  PassResult,
} from "../shared/index.js";
import type { FieldPlan, SchemaPlan } from "./emit.js";

/** Create the uri field plan (uri: ID!) — the entity's absolute IRI. */
const createUriField = (): FieldPlan => ({
  name: "uri",
  type: { base: "ID", kind: "scalar", list: false, nonNull: true },
  resolve: (parent: EntityValue) => parent.uri,
  description: "The entity's absolute IRI — the primary key.",
});

/** Create the _meta field plan (self-describing TBox access). */
const createMetaField = (): FieldPlan => ({
  name: "_meta",
  type: { base: "EntityMeta", kind: "named", list: false, nonNull: true },
  resolve: (parent: EntityValue) => parent,
  description: "Self-describing TBox access for this entity.",
});

/**
 * The structural fields injected ahead of the generated ones. Embeddable
 * containers get `_meta` only: a blank node has no IRI to expose, but it does
 * have a class — and a zero-property embeddable would otherwise emit a type
 * with no fields at all (a C003 validateSchema failure).
 */
const structuralFields = (embeddable: boolean): FieldPlan[] =>
  embeddable ? [createMetaField()] : [createUriField(), createMetaField()];

/**
 * Wire the Relay server conventions into the SchemaPlan (Pass 6): Node
 * membership with uri/_meta on non-embeddable types, _meta on embeddable ones,
 * connection-wrapping of list object fields, and the root node/lookup/listing
 * query fields.
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

  // ── uri/_meta + Node membership ──
  // Map merge note: a duplicate key keeps the FIRST position but takes the
  // LAST value, so an ontology field named `uri` would replace the structural
  // one. Pass 4 drops those with M005 — this merge must never see one.
  for (const type of plan.types.values()) {
    const structural = structuralFields(type.embeddable);
    type.fields = new Map([
      ...structural.map((f): [string, FieldPlan] => [f.name, f]),
      ...type.fields,
    ]);
    if (!type.embeddable) {
      type.interfaces = ["Node", ...type.interfaces];
    }
  }
  for (const iface of plan.interfaces.values()) {
    const structural = structuralFields(iface.embeddableOnly);
    iface.fields = new Map([
      ...structural.map((f): [string, FieldPlan] => [f.name, f]),
      ...iface.fields,
    ]);
    if (!iface.embeddableOnly) {
      iface.parents = ["Node", ...iface.parents];
    }
  }

  // ── root query fields ──
  plan.queryFields.set("node", {
    name: "node",
    type: { base: "Node", kind: "named", list: false, nonNull: false },
    args: { id: { type: "ID", required: true } },
    resolve: async (_parent, args: { id?: string }, ctx: CompilerContext) => {
      // The argument keeps the Relay name `id`; its VALUE is the absolute IRI
      // (which is also `Node.uri`). No prefix map is consulted: an id that is
      // not a syntactically absolute IRI resolves to null, never to a guess.
      if (!args.id || !isAbsoluteIri(args.id)) {
        return null;
      }
      return ctx.entityLoader.load(args.id);
    },
    description: "Relay node resolution by absolute IRI.",
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
      // Deliberately String!, not ID!: this argument accepts the PREFIXED
      // convenience form, and promoting it to ID! would reject every existing
      // client query declaring `$uri: String!` (String is not a subtype of ID).
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
        // (name-sorted) IRI list; entities are loaded for the page alone.
        // The list is already in the loader's absolute-IRI currency, which is
        // exactly what the cursors encode — no round-trip, no drift.
        const uris = await ctx.listLoader.load(classUri);
        const page = paginateUriWindow(uris, args);
        const entities = await ctx.entityLoader.loadMany(page.window);
        return connectionFromPage(unwrapEntities(entities), page);
      },
    });
  }

  return { output: plan, diagnostics };
}
