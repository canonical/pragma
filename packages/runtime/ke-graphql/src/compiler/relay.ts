// =============================================================================
// Pass 6 — Wire Relay: SchemaPlan → SchemaPlan
//
// Pure plan surgery (no graphql-js objects yet):
// - id/uri/_meta on every non-embeddable type
// - Node membership for non-embeddable types AND for generated interfaces
//   whose concrete implementors are all non-embeddable (Relay @refetchable
//   fragments on UIBlock need Node + id)
// - list object fields → connections with the four pagination args
// - root query fields: node(id), per-type lookup + listing
// =============================================================================

import { toFull, toPrefixed } from "../dataloader/uris.js";
import {
  connectionFromPage,
  paginateUriWindow,
  unwrapEntities,
} from "../resolver/connection.js";
import type { FieldPlan, SchemaPlan } from "./emit.js";
import type {
  CompilerContext,
  Diagnostic,
  EntityValue,
  PassResult,
} from "./types.js";

const idField = (): FieldPlan => ({
  name: "id",
  type: { base: "ID", kind: "scalar", list: false, nonNull: true },
  resolve: (parent: EntityValue) => parent.uri,
  description: "Relay global ID — the entity's prefixed URI (KG.10).",
});

const uriField = (): FieldPlan => ({
  name: "uri",
  type: { base: "String", kind: "scalar", list: false, nonNull: true },
  resolve: (parent: EntityValue) => parent.uri,
});

const metaField = (): FieldPlan => ({
  name: "_meta",
  type: { base: "EntityMeta", kind: "named", list: false, nonNull: true },
  resolve: (parent: EntityValue) => parent,
  description: "Self-describing TBox access for this entity (KG.03).",
});

export const wireRelay = (plan: SchemaPlan): PassResult<SchemaPlan> => {
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
        continue; // embedded lists stay plain lists (KG.13)
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

  // ── id/uri/_meta + Node membership ──
  for (const type of plan.types.values()) {
    if (type.embeddable) {
      continue;
    }
    const structural = [idField(), uriField(), metaField()];
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
    const structural = [idField(), uriField(), metaField()];
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
};
