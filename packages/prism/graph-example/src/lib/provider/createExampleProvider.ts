// =============================================================================
// The provider itself: a schema built from the authored contract, and a tree
// of plain objects to execute it against.
//
// THERE IS NO RESOLVER MAP IN THIS FILE, OR ANYWHERE IN THIS PACKAGE. Two
// graphql-js behaviours make one unnecessary:
//
//   - `defaultFieldResolver` invokes a function-valued property as
//     `source[field](args, context, info)`, so an argument-taking field is
//     just a method on the view object.
//   - `defaultTypeResolver` reads a string `__typename` off the value, so
//     Node polymorphism needs no `resolveType`.
//
// Derived and relational fields are therefore zero-argument arrow functions,
// and scalars are plain values. Using functions uniformly for derived fields
// also sidesteps every construction-order cycle in the graph (a station's
// `_meta.type` is a class, whose `instances` are stations) without lazy
// getters, which only complicate coverage.
// =============================================================================

import { buildSchema } from "graphql";
import {
  type ConnectionArgs,
  sliceConnection,
  toCursor,
} from "./connection.js";
import {
  DEFAULT_LANG,
  GEO_POINT_CLASS_URI,
  META_CLASS_URI,
} from "./constants.js";
import { exampleDataset } from "./dataset.js";
import { localName, resolveLabel, resolveTitle } from "./descriptive.js";
import { readProviderSdl } from "./providerSdl.js";
import type {
  ExampleClass,
  ExampleClassProperty,
  ExampleDataset,
  ExampleEntity,
  ExampleGeoPoint,
  ExampleOntology,
  ExampleProperty,
  ExampleProvider,
  LangMap,
} from "./types.js";

/**
 * A view object: scalars, nested views, and zero-argument thunks. The schema
 * is the type system here — graphql-js checks every field against the SDL at
 * execution time, so restating the SDL in TypeScript would buy nothing.
 */
type View = Record<string, unknown>;

/** Arguments of the language-tagged `EntityMeta` fields. */
interface LangArgs {
  readonly lang: string;
}

/** Everything `_meta` needs. `uri` is null for an embeddable. */
interface MetaSource {
  readonly labels?: LangMap;
  readonly comments?: LangMap;
  readonly definitions?: LangMap;
  readonly uri: string | null;
  readonly typename: string;
  readonly cls: ExampleClass;
}

/** An entity paired with its resolved class and its built view. */
interface EntityRecord {
  readonly entity: ExampleEntity;
  readonly view: View;
}

/** The namespace part of an IRI — everything before the local name. */
const namespaceOf = (uri: string): string =>
  uri.slice(0, uri.length - localName(uri).length);

/**
 * Build an executable provider over `dataset`. The dataset is a parameter, not
 * a hard-wired import, so the defensive paths below (a dangling property
 * reference, a class cycle, an entity of an unknown class) are reachable from
 * tests with a purpose-built dataset rather than being untestable dead code.
 */
export const createExampleProvider = (
  dataset: ExampleDataset = exampleDataset,
): ExampleProvider => {
  const sdl = readProviderSdl();
  const schema = buildSchema(sdl);

  const classByUri = new Map(dataset.classes.map((cls) => [cls.uri, cls]));
  const propertyByUri = new Map(dataset.properties.map((p) => [p.uri, p]));

  // -------------------------------------------------------------------
  // TBox traversal
  // -------------------------------------------------------------------

  /**
   * The compact (curie) form of an IRI: the declared prefix of the longest
   * namespace the IRI starts with, plus the remainder.
   *
   * Longest-match, not first-match, so a namespace that is a prefix of another
   * cannot shadow it. Falls back to the whole IRI when nothing is declared,
   * which keeps the field total.
   *
   * Note this resolves against `dataset.ontologies` — the same prefix/namespace
   * pairs `Query.ontologies` publishes — so a client can derive exactly the
   * same string itself. The compact form is a convenience, never a secret.
   */
  const curieOf = (uri: string): string => {
    const match = dataset.ontologies
      .filter((ontology) => uri.startsWith(ontology.namespace))
      .sort((a, b) => b.namespace.length - a.namespace.length)[0];
    return match === undefined
      ? uri
      : `${match.prefix}:${uri.slice(match.namespace.length)}`;
  };

  const superclassOf = (cls: ExampleClass): ExampleClass | undefined =>
    cls.superclass === undefined ? undefined : classByUri.get(cls.superclass);

  /** The transitive superclass chain, nearest first. `seen` breaks cycles. */
  const ancestorsOf = (
    cls: ExampleClass,
    seen: Set<string> = new Set([cls.uri]),
  ): ExampleClass[] => {
    const parent = superclassOf(cls);
    if (parent === undefined || seen.has(parent.uri)) {
      return [];
    }
    seen.add(parent.uri);
    return [parent, ...ancestorsOf(parent, seen)];
  };

  /**
   * The class's own cardinality declarations followed by every ancestor's,
   * marked `inherited`. Paired with the property IRI so `_meta.field(name:)`
   * has something to match on — see the note on that field below.
   */
  const fieldsOf = (cls: ExampleClass): { uri: string; view: View }[] =>
    [
      ...cls.properties.map((cp) => ({ cp, inherited: false })),
      ...ancestorsOf(cls).flatMap((ancestor) =>
        ancestor.properties.map((cp) => ({ cp, inherited: true })),
      ),
    ].flatMap(({ cp, inherited }) => {
      const property = propertyByUri.get(cp.property);
      return property === undefined
        ? []
        : [
            {
              uri: property.uri,
              view: classPropertyView(cp, property, inherited),
            },
          ];
    });

  // -------------------------------------------------------------------
  // Views
  // -------------------------------------------------------------------

  const nullableClassView = (uri: string | undefined): View | null => {
    const cls = uri === undefined ? undefined : classByUri.get(uri);
    return cls === undefined ? null : classView(cls);
  };

  function propertyView(property: ExampleProperty): View {
    return {
      uri: property.uri,
      label: resolveLabel(property.labels, DEFAULT_LANG),
      definition: resolveLabel(property.definitions, DEFAULT_LANG),
      domain: () => nullableClassView(property.domain),
      range: property.range,
      kind: property.kind,
      functional: property.functional,
      inverse: () => {
        const inverse =
          property.inverse === undefined
            ? undefined
            : propertyByUri.get(property.inverse);
        return inverse === undefined ? null : propertyView(inverse);
      },
      namespace: namespaceOf(property.uri),
    };
  }

  function classPropertyView(
    cp: ExampleClassProperty,
    property: ExampleProperty,
    inherited: boolean,
  ): View {
    return {
      // The key `_meta.field(name:)` accepts. The contract requires the field
      // but cannot say what a hand-written provider should put in it: for the
      // compiler `name` means "the GraphQL field name I derived", and this
      // provider derives nothing. So it states its own rule — the property
      // IRI's local name — and serves it here so the argument round-trips:
      // read `name` off `_meta.fields`, pass it straight back to `field()`.
      name: localName(property.uri),
      property: () => propertyView(property),
      required: cp.required,
      singular: cp.singular,
      inherited,
    };
  }

  function metaView(source: MetaSource): View {
    return {
      title: (args: LangArgs) =>
        resolveTitle(source.labels, args.lang, source.uri, source.typename),
      label: (args: LangArgs) => resolveLabel(source.labels, args.lang),
      comment: (args: LangArgs) => resolveLabel(source.comments, args.lang),
      definition: (args: LangArgs) =>
        resolveLabel(source.definitions, args.lang),
      // The compact display form of this entity's IRI. An embeddable has no
      // IRI of its own, so it compacts its CLASS instead — still curie-shaped
      // and still meaningful ("this is a geo:GeoPoint"), which a bare
      // typename would not be.
      curie: () => curieOf(source.uri ?? source.cls.uri),
      type: () => classView(source.cls),
      fields: () => fieldsOf(source.cls).map((field) => field.view),
      // Matches `ClassProperty.name` exactly — the value this provider serves
      // on every entry of `fields`. The argument round-trips: enumerate
      // `_meta.fields`, read `name`, pass it straight back here.
      field: (args: { name: string }) =>
        fieldsOf(source.cls).find((field) => localName(field.uri) === args.name)
          ?.view ?? null,
    };
  }

  function classView(cls: ExampleClass): View {
    return {
      __typename: "OntologyClass",
      uri: cls.uri,
      _meta: () =>
        metaView({
          labels: cls.labels,
          comments: cls.comments,
          definitions: cls.definitions,
          uri: cls.uri,
          typename: "OntologyClass",
          // A class is an instance of the metaclass when the dataset declares
          // one, and of itself otherwise: `type` is non-null, so there is no
          // third answer.
          cls: classByUri.get(META_CLASS_URI) ?? cls,
        }),
      label: resolveLabel(cls.labels, DEFAULT_LANG),
      definition: resolveLabel(cls.definitions, DEFAULT_LANG),
      superclass: () => nullableClassView(cls.superclass),
      superclasses: () => ancestorsOf(cls).map(classView),
      subclasses: () =>
        dataset.classes
          .filter((other) => other.superclass === cls.uri)
          .map(classView),
      properties: () => fieldsOf(cls).map((field) => field.view),
      instances: (args: ConnectionArgs) =>
        connectionView(instancesOf(cls), args),
      instanceCount: () => instancesOf(cls).length,
      isAbstract: cls.isAbstract,
      namespace: namespaceOf(cls.uri),
    };
  }

  const geoPointClass = classByUri.get(GEO_POINT_CLASS_URI);

  const geoPointView = (point: ExampleGeoPoint | undefined): View | null =>
    point === undefined || geoPointClass === undefined
      ? null
      : {
          _meta: () =>
            metaView({ uri: null, typename: "GeoPoint", cls: geoPointClass }),
          latitude: point.latitude,
          longitude: point.longitude,
        };

  const entityView = (entity: ExampleEntity, cls: ExampleClass): View => ({
    __typename: entity.typename,
    uri: entity.uri,
    _meta: () =>
      metaView({
        labels: entity.labels,
        comments: entity.comments,
        definitions: entity.definitions,
        uri: entity.uri,
        typename: entity.typename,
        cls,
      }),
    name: resolveLabel(entity.labels, DEFAULT_LANG),
    platformCount: entity.platformCount ?? null,
    transferMinutes: entity.transferMinutes ?? null,
    location: () => geoPointView(entity.location),
    inZone: () =>
      entity.inZone === undefined
        ? null
        : (viewByUri.get(entity.inZone) ?? null),
    servesLine: () =>
      (entity.servesLine ?? []).flatMap((uri) => {
        const line = viewByUri.get(uri);
        return line === undefined ? [] : [line];
      }),
    servedBy: () =>
      records
        .filter((record) =>
          (record.entity.servesLine ?? []).includes(entity.uri),
        )
        .map((record) => record.view),
  });

  const ontologyView = (ontology: ExampleOntology): View => ({
    prefix: ontology.prefix,
    namespace: ontology.namespace,
    label: ontology.label ?? null,
    classes: () =>
      dataset.classes
        .filter((cls) => cls.uri.startsWith(ontology.namespace))
        .map(classView),
    properties: () =>
      dataset.properties
        .filter((property) => property.uri.startsWith(ontology.namespace))
        .map(propertyView),
  });

  // -------------------------------------------------------------------
  // ABox index. Entities of an unknown class are dropped: `_meta.type` is
  // non-null, so an entity whose class the TBox does not declare has no
  // conformant representation and must not be served at all.
  // -------------------------------------------------------------------

  const records: EntityRecord[] = [...dataset.entities]
    .sort((a, b) => a.uri.localeCompare(b.uri))
    .flatMap((entity) => {
      const cls = classByUri.get(entity.type);
      return cls === undefined
        ? []
        : [{ entity, view: entityView(entity, cls) }];
    });

  const viewByUri = new Map(
    records.map((record) => [record.entity.uri, record.view]),
  );

  /** Instances of a class, including instances of its subclasses. */
  const instancesOf = (cls: ExampleClass): EntityRecord[] =>
    records.filter((record) => {
      const recordClass = classByUri.get(record.entity.type);
      return (
        recordClass !== undefined &&
        (recordClass.uri === cls.uri ||
          ancestorsOf(recordClass).some((ancestor) => ancestor.uri === cls.uri))
      );
    });

  const connectionView = (
    items: readonly EntityRecord[],
    args: ConnectionArgs,
  ): View => {
    const page = sliceConnection(items, (record) => record.entity.uri, args);
    const edges = page.items.map((record) => ({
      node: record.view,
      cursor: toCursor(record.entity.uri),
    }));
    return {
      edges,
      pageInfo: {
        hasNextPage: page.hasNextPage,
        hasPreviousPage: page.hasPreviousPage,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
    };
  };

  /**
   * Expand the prefixed convenience form (`"metro:Station"`) to an absolute
   * IRI. An absolute IRI passes through untouched: its scheme is never a
   * declared prefix.
   */
  const expandUri = (value: string): string => {
    const colon = value.indexOf(":");
    const ontology = dataset.ontologies.find(
      (candidate) => candidate.prefix === value.slice(0, colon),
    );
    return ontology === undefined
      ? value
      : `${ontology.namespace}${value.slice(colon + 1)}`;
  };

  // -------------------------------------------------------------------
  // The contract's five root fields. Nothing is added to Query: every type
  // this provider declares is reachable from here.
  // -------------------------------------------------------------------

  const rootValue: Record<string, unknown> = {
    node: (args: { id: string }) =>
      viewByUri.get(args.id) ?? nullableClassView(args.id),
    ontologies: () => dataset.ontologies.map(ontologyView),
    ontology: (args: { prefix: string }) => {
      const ontology = dataset.ontologies.find(
        (candidate) => candidate.prefix === args.prefix,
      );
      return ontology === undefined ? null : ontologyView(ontology);
    },
    ontologyClass: (args: { uri: string }) =>
      nullableClassView(expandUri(args.uri)),
    ontologyProperty: (args: { uri: string }) => {
      const property = propertyByUri.get(expandUri(args.uri));
      return property === undefined ? null : propertyView(property);
    },
  };

  return { schema, rootValue, sdl };
};
