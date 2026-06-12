// =============================================================================
// Pass 7 — Compose: SchemaPlan + TBox + extensions → GraphQLSchema
//
// The single place where graphql-js type objects are constructed (they are
// immutable — see ADR §4.5/§4.6). Field thunks resolve circular references;
// connection types are created on demand per base type; every interface and
// union gets resolveType reading EntityValue.typename; extensions (object or
// factory form) are validated (C001/C002); the composed schema runs
// validateSchema (C003) and is printed to SDL for the Relay compiler.
// =============================================================================

import {
  GraphQLBoolean,
  GraphQLDeferDirective,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLFieldConfigMap,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  type GraphQLNullableOutputType,
  GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLScalarType,
  GraphQLSchema,
  GraphQLStreamDirective,
  GraphQLString,
  GraphQLUnionType,
  printSchema,
  specifiedDirectives,
  validateSchema,
} from "graphql";
import { buildTBoxSchema } from "../tbox/schema.js";
import type { FieldPlan, SchemaPlan, TypeRef } from "./emit.js";
import type {
  CompilerContext,
  Diagnostic,
  EntityValue,
  PassResult,
  SchemaExtensionsInput,
} from "./types.js";

const PHASE = "compose";

const SCALARS: Record<string, GraphQLScalarType> = {
  String: GraphQLString,
  Boolean: GraphQLBoolean,
  Int: GraphQLInt,
  Float: GraphQLFloat,
  ID: GraphQLID,
};

export interface ComposeOptions {
  extensions?: SchemaExtensionsInput;
  incremental?: boolean;
}

export interface ComposedSchema {
  schema: GraphQLSchema | null;
  sdl: string;
}

export const compose = (
  plan: SchemaPlan,
  options: ComposeOptions = {},
): PassResult<ComposedSchema> => {
  const diagnostics: Diagnostic[] = [];

  // ── shared structural types ──
  const resolveTypename = (value: unknown): string | undefined =>
    (value as EntityValue | undefined)?.typename;

  const nodeInterface: GraphQLInterfaceType = new GraphQLInterfaceType({
    name: "Node",
    fields: () => ({
      id: { type: new GraphQLNonNull(GraphQLID) },
      uri: { type: new GraphQLNonNull(GraphQLString) },
    }),
    resolveType: resolveTypename,
  });

  const pageInfo = new GraphQLObjectType({
    name: "PageInfo",
    fields: {
      hasNextPage: { type: new GraphQLNonNull(GraphQLBoolean) },
      hasPreviousPage: { type: new GraphQLNonNull(GraphQLBoolean) },
      startCursor: { type: GraphQLString },
      endCursor: { type: GraphQLString },
    },
  });

  // ── registries with lazy construction ──
  const objectTypes = new Map<string, GraphQLObjectType>();
  const interfaceTypes = new Map<string, GraphQLInterfaceType>();
  const unionTypes = new Map<string, GraphQLUnionType>();
  const connectionTypes = new Map<string, GraphQLObjectType>();

  const namedType = (name: string): GraphQLNullableOutputType | undefined =>
    objectTypes.get(name) ??
    interfaceTypes.get(name) ??
    unionTypes.get(name) ??
    (name === "Node" ? nodeInterface : undefined) ??
    (name === "EntityMeta" ? tbox.entityMeta : undefined) ??
    SCALARS[name];

  const connectionFor = (base: string): GraphQLObjectType => {
    let connection = connectionTypes.get(`${base}Connection`);
    if (connection) {
      return connection;
    }
    const edge = new GraphQLObjectType({
      name: `${base}Edge`,
      fields: () => ({
        node: {
          type: new GraphQLNonNull(namedType(base) ?? GraphQLString),
          resolve: (parent: { node: EntityValue }) => parent.node,
        },
        cursor: { type: new GraphQLNonNull(GraphQLString) },
      }),
    });
    connection = new GraphQLObjectType({
      name: `${base}Connection`,
      fields: () => ({
        edges: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(edge))),
        },
        pageInfo: { type: new GraphQLNonNull(pageInfo) },
      }),
    });
    connectionTypes.set(`${base}Connection`, connection);
    return connection;
  };

  const typeFor = (ref: TypeRef): GraphQLOutputType => {
    const base: GraphQLNullableOutputType =
      ref.kind === "connection"
        ? connectionFor(ref.base)
        : (namedType(ref.base) ?? GraphQLString);
    if (ref.kind !== "connection" && ref.list) {
      // List fields are always [T!]! (KG.07): resolvers filter missing
      // items rather than nulling them, and an empty list is the default.
      return new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(base)));
    }
    return ref.nonNull ? new GraphQLNonNull(base) : base;
  };

  const connectionArgs: GraphQLFieldConfigArgumentMap = {
    first: { type: GraphQLInt },
    after: { type: GraphQLString },
    last: { type: GraphQLInt },
    before: { type: GraphQLString },
  };

  const argsFor = (plan: FieldPlan): GraphQLFieldConfigArgumentMap => {
    const args: GraphQLFieldConfigArgumentMap = {};
    if (plan.connectionArgs) {
      Object.assign(args, connectionArgs);
    }
    for (const [name, spec] of Object.entries(plan.args ?? {})) {
      const scalar = SCALARS[spec.type] ?? GraphQLString;
      args[name] = {
        type: spec.required ? new GraphQLNonNull(scalar) : scalar,
      };
    }
    return args;
  };

  const fieldConfig = (
    plan: FieldPlan,
  ): GraphQLFieldConfig<EntityValue, CompilerContext> => ({
    type: typeFor(plan.type),
    args: argsFor(plan),
    resolve: plan.resolve,
    description: plan.description,
  });

  const fieldsConfig = (
    fields: Map<string, FieldPlan>,
  ): GraphQLFieldConfigMap<EntityValue, CompilerContext> => {
    const config: GraphQLFieldConfigMap<EntityValue, CompilerContext> = {};
    for (const [name, plan] of fields) {
      config[name] = fieldConfig(plan);
    }
    return config;
  };

  // ── TBox (needs the Node interface and the NodeConnection factory) ──
  const tbox = buildTBoxSchema(plan.mapped, nodeInterface, () =>
    connectionFor("Node"),
  );

  // ── generated interfaces ──
  for (const iface of plan.interfaces.values()) {
    interfaceTypes.set(
      iface.name,
      new GraphQLInterfaceType({
        name: iface.name,
        description: iface.description,
        interfaces: () =>
          iface.parents
            .map((p) => (p === "Node" ? nodeInterface : interfaceTypes.get(p)))
            .filter((i): i is GraphQLInterfaceType => i !== undefined),
        fields: () => fieldsConfig(iface.fields),
        resolveType: resolveTypename,
      }),
    );
  }

  // ── generated unions ──
  for (const union of plan.unions.values()) {
    unionTypes.set(
      union.name,
      new GraphQLUnionType({
        name: union.name,
        types: () =>
          union.members
            .map((m) => objectTypes.get(m))
            .filter((t): t is GraphQLObjectType => t !== undefined),
        resolveType: resolveTypename,
      }),
    );
  }

  // ── extensions (validated below, merged into type construction) ──
  const resolveExtensions = (
    input: SchemaExtensionsInput | undefined,
  ): Record<
    string,
    Record<string, GraphQLFieldConfig<EntityValue, CompilerContext>>
  > => {
    if (!input) {
      return {};
    }
    if (typeof input === "function") {
      return input({
        type: (name) => objectTypes.get(name),
        iface: (name) =>
          interfaceTypes.get(name) ??
          (name === "Node" ? nodeInterface : undefined),
      });
    }
    return input;
  };

  // Extension lookup is lazy (inside field thunks) so the factory form can
  // reference generated types that exist by the time fields are resolved.
  let extensionsCache:
    | Record<
        string,
        Record<string, GraphQLFieldConfig<EntityValue, CompilerContext>>
      >
    | undefined;
  const extensionsFor = (
    typeName: string,
  ): Record<string, GraphQLFieldConfig<EntityValue, CompilerContext>> => {
    extensionsCache ??= resolveExtensions(options.extensions);
    return extensionsCache[typeName] ?? {};
  };

  // ── generated object types ──
  for (const type of plan.types.values()) {
    objectTypes.set(
      type.name,
      new GraphQLObjectType<EntityValue, CompilerContext>({
        name: type.name,
        description: type.description,
        interfaces: () =>
          type.interfaces
            .map((i) => (i === "Node" ? nodeInterface : interfaceTypes.get(i)))
            .filter((i): i is GraphQLInterfaceType => i !== undefined),
        fields: () => {
          const generated = fieldsConfig(type.fields);
          for (const [name, config] of Object.entries(
            extensionsFor(type.name),
          )) {
            if (generated[name]) {
              diagnostics.push({
                severity: "error",
                code: "C002",
                message: `extension field ${type.name}.${name} conflicts with a generated field`,
                phase: PHASE,
              });
              continue;
            }
            generated[name] = config;
          }
          return generated;
        },
      }),
    );
  }

  // C001 — extensions referencing unknown types (Query is always known).
  extensionsCache ??= resolveExtensions(options.extensions);
  for (const typeName of Object.keys(extensionsCache)) {
    if (typeName !== "Query" && !plan.types.has(typeName)) {
      diagnostics.push({
        severity: "error",
        code: "C001",
        message: `extension references unknown type ${typeName}`,
        phase: PHASE,
      });
    }
  }

  // ── Query ──
  const queryType = new GraphQLObjectType<unknown, CompilerContext>({
    name: "Query",
    fields: () => {
      const fields: GraphQLFieldConfigMap<unknown, CompilerContext> = {
        ...tbox.queryFields,
      };
      for (const [name, fieldPlan] of plan.queryFields) {
        fields[name] = fieldConfig(fieldPlan) as GraphQLFieldConfig<
          unknown,
          CompilerContext
        >;
      }
      for (const [name, config] of Object.entries(extensionsFor("Query"))) {
        if (fields[name]) {
          diagnostics.push({
            severity: "error",
            code: "C002",
            message: `extension field Query.${name} conflicts with a generated field`,
            phase: PHASE,
          });
          continue;
        }
        fields[name] = config as GraphQLFieldConfig<unknown, CompilerContext>;
      }
      return fields;
    },
  });

  // ── schema ──
  // Embeddable-only interfaces and their implementors may be unreachable
  // from Query; list every generated type explicitly so they are retained.
  const allTypes = [
    ...objectTypes.values(),
    ...interfaceTypes.values(),
    ...unionTypes.values(),
    tbox.entityMeta,
  ];

  const directives = options.incremental
    ? [...specifiedDirectives, GraphQLDeferDirective, GraphQLStreamDirective]
    : [...specifiedDirectives];

  let schema: GraphQLSchema | null = null;
  let sdl = "";
  try {
    schema = new GraphQLSchema({
      query: queryType,
      types: allTypes,
      directives,
    });
    const validationErrors = validateSchema(schema);
    for (const error of validationErrors) {
      diagnostics.push({
        severity: "error",
        code: "C003",
        message: error.message,
        phase: PHASE,
      });
    }
    if (validationErrors.length > 0) {
      schema = null;
    } else {
      sdl = printSchema(schema);
    }
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "C003",
      message: error instanceof Error ? error.message : String(error),
      phase: PHASE,
    });
    schema = null;
  }

  return { output: { schema, sdl }, diagnostics };
};
