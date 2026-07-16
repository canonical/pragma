import type { Store } from "@canonical/ke";
import { PragmaError } from "#error";
import compactUri from "../../shared/compactUri.js";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import type {
  OntologyClass,
  OntologyClassFocus,
  OntologyConstraint,
  OntologyDetailed,
  OntologyMeta,
  OntologyProperty,
} from "../../shared/types/index.js";
import buildClassTree, { flattenClassTree } from "../helpers/buildClassTree.js";
import queryClasses from "../helpers/queryClasses.js";
import type { RawOntologyProperty } from "../helpers/queryProperties.js";
import queryProperties from "../helpers/queryProperties.js";
import {
  queryConstraints,
  queryInstanceCounts,
  queryOntologyMeta,
  querySampleInstances,
} from "../helpers/queryTboxFacts.js";
import resolvePrefix from "../helpers/resolvePrefix.js";

/** Options for {@link showOntology}. */
export interface ShowOntologyOptions {
  /** Class to deep-dive into (label, local name, or compact IRI). */
  readonly class?: string;
}

/**
 * Returns the complete TBox structure for a namespace: the class hierarchy
 * (topologically ordered, direct properties attached, instance counts),
 * unattached properties, SHACL constraint summaries, the owl:Ontology
 * header, and — when `options.class` is given — a per-class deep dive.
 *
 * This is the **single** structure every output mode projects; plain,
 * `--llm`, `--format json`, and the MCP envelope must render from it and
 * nothing else. All IRIs are compacted against the store's prefix map,
 * which is included in the result for lossless expansion.
 *
 * Accepts a short prefix (e.g. `ds`) or a full namespace URI.
 *
 * @note Queries ke store
 *
 * @param store - The ke store to query.
 * @param prefixOrUri - A short prefix or full namespace URI.
 * @param options - Optional class focus.
 * @returns An {@link OntologyDetailed} with classes and properties.
 * @throws PragmaError.invalidInput if the prefix or namespace is unknown.
 * @throws PragmaError.notFound if the namespace has no classes or
 *   properties, or the focused class does not exist.
 */
export default async function showOntology(
  store: Store,
  prefixOrUri: string,
  options: ShowOntologyOptions = {},
): Promise<OntologyDetailed> {
  const { prefix, namespace } = resolvePrefix(prefixOrUri, store.prefixes);

  const [rawClasses, rawProperties, instanceCounts, rawConstraints, rawMeta] =
    await Promise.all([
      queryClasses(store, namespace),
      queryProperties(store, namespace),
      queryInstanceCounts(store, namespace),
      queryConstraints(store, namespace),
      queryOntologyMeta(store, namespace),
    ]);

  if (rawClasses.length === 0 && rawProperties.length === 0) {
    throw PragmaError.notFound("ontology", prefixOrUri, {
      recovery: {
        message: "List loaded ontologies.",
        cli: "pragma ontology list",
        mcp: { tool: "ontology_list" },
      },
    });
  }

  // Core RDF vocabularies (xsd etc.) plus the store's resolved package
  // prefixes; the store map wins on collisions.
  const compactionMap: Readonly<Record<string, string>> = {
    ...PREFIX_MAP,
    ...store.prefixes,
  };
  const usedPrefixes = new Set<string>([prefix]);
  const compact = (uri: string): string => {
    const compacted = compactUri(uri, compactionMap);
    const colon = compacted.indexOf(":");
    if (compacted !== uri && colon > 0) {
      usedPrefixes.add(compacted.slice(0, colon));
    }
    return compacted;
  };

  const toProperty = (raw: RawOntologyProperty): OntologyProperty => ({
    iri: compact(raw.uri),
    label: raw.label,
    kind: raw.kind,
    ...(raw.domain ? { domain: compact(raw.domain) } : {}),
    ...(raw.range ? { range: compact(raw.range) } : {}),
    ...(raw.functional ? { functional: true as const } : {}),
  });

  // Attach properties to their domain class; the rest are unattached.
  const classUris = new Set(rawClasses.map((c) => c.uri));
  const byDomain = new Map<string, OntologyProperty[]>();
  const unattached: OntologyProperty[] = [];
  for (const raw of rawProperties) {
    if (raw.domain !== undefined && classUris.has(raw.domain)) {
      const attached = byDomain.get(raw.domain) ?? [];
      attached.push(toProperty(raw));
      byDomain.set(raw.domain, attached);
    } else {
      unattached.push(toProperty(raw));
    }
  }

  const unordered: OntologyClass[] = rawClasses.map((raw) => {
    const instances = instanceCounts.get(raw.uri) ?? 0;
    return {
      iri: compact(raw.uri),
      label: raw.label,
      ...(raw.comment ? { comment: raw.comment } : {}),
      subClassOf: raw.subClassOf.map(compact),
      ...(instances > 0 ? { instances } : {}),
      properties: (byDomain.get(raw.uri) ?? []).sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    };
  });

  // Canonical ordering: pre-order walk of the tree every renderer shares.
  const classes = flattenClassTree(buildClassTree(unordered));

  const constraints: OntologyConstraint[] = rawConstraints.map((raw) => ({
    shape: compact(raw.shape),
    ...(raw.targetClass ? { targetClass: compact(raw.targetClass) } : {}),
    propertyCount: raw.propertyCount,
  }));

  const meta: OntologyMeta | undefined = rawMeta
    ? {
        ...(rawMeta.title ? { title: rawMeta.title } : {}),
        ...(rawMeta.version ? { version: rawMeta.version } : {}),
        ...(rawMeta.imports.length > 0
          ? { imports: rawMeta.imports.map(compact) }
          : {}),
      }
    : undefined;

  const focus = options.class
    ? await buildFocus(store, options.class, {
        prefix,
        namespace,
        classes,
        unattached,
        constraints,
        instanceCounts,
        rawClassUris: rawClasses.map((c) => c.uri),
        compactionMap,
      })
    : undefined;

  const prefixes = Object.fromEntries(
    [...usedPrefixes]
      .sort()
      .map((p) => [p, compactionMap[p]])
      .filter(([, ns]) => ns !== undefined),
  );

  return {
    prefix,
    namespace,
    prefixes,
    ...(meta ? { meta } : {}),
    classes,
    unattached: unattached.sort((a, b) => a.label.localeCompare(b.label)),
    ...(constraints.length > 0 ? { constraints } : {}),
    ...(focus ? { focus } : {}),
  };
}

interface FocusContext {
  readonly prefix: string;
  readonly namespace: string;
  readonly classes: readonly OntologyClass[];
  readonly unattached: readonly OntologyProperty[];
  readonly constraints: readonly OntologyConstraint[];
  readonly instanceCounts: ReadonlyMap<string, number>;
  readonly rawClassUris: readonly string[];
  readonly compactionMap: Readonly<Record<string, string>>;
}

/**
 * Assemble the per-class deep dive from the already-loaded structure plus
 * one sample-instances query. Everything else (chain, subclasses, reverse
 * references, inherited properties) derives from the namespace data.
 */
async function buildFocus(
  store: Store,
  classQuery: string,
  ctx: FocusContext,
): Promise<OntologyClassFocus> {
  const needle = classQuery.toLowerCase();
  const target = ctx.classes.find(
    (c) =>
      c.iri.toLowerCase() === needle ||
      c.label.toLowerCase() === needle ||
      localName(c.iri).toLowerCase() === needle,
  );

  if (!target) {
    throw PragmaError.notFound("class", classQuery, {
      suggestions: ctx.classes
        .map((c) => localName(c.iri))
        .filter((name) => name.toLowerCase().includes(needle))
        .slice(0, 5),
      recovery: {
        message: "Show the namespace's class hierarchy.",
        cli: `pragma ontology show ${ctx.prefix}`,
        mcp: { tool: "ontology_show", params: { prefix: ctx.prefix } },
      },
    });
  }

  const byIri = new Map(ctx.classes.map((c) => [c.iri, c]));

  // Superclass chain within the namespace, nearest first, cycle-safe.
  const superChain: string[] = [];
  let cursor = target.subClassOf.find((p) => byIri.has(p));
  while (cursor !== undefined && !superChain.includes(cursor)) {
    superChain.push(cursor);
    cursor = byIri.get(cursor)?.subClassOf.find((p) => byIri.has(p));
  }

  const inheritedProperties = superChain.flatMap(
    (iri) => byIri.get(iri)?.properties ?? [],
  );

  const allProperties = [
    ...ctx.classes.flatMap((c) => c.properties),
    ...ctx.unattached,
  ];

  // The focused class's full URI is recoverable from the raw list (same
  // index space as ctx.classes before ordering is irrelevant — match by
  // compacted form).
  const fullUri =
    ctx.rawClassUris.find(
      (uri) => compactUri(uri, ctx.compactionMap) === target.iri,
    ) ?? target.iri;

  const sampleInstances = (await querySampleInstances(store, fullUri)).map(
    (uri) => compactUri(uri, ctx.compactionMap),
  );

  return {
    iri: target.iri,
    label: target.label,
    ...(target.comment ? { comment: target.comment } : {}),
    superChain,
    subclasses: ctx.classes
      .filter((c) => c.subClassOf.includes(target.iri))
      .map((c) => c.iri)
      .sort(),
    instances: ctx.instanceCounts.get(fullUri) ?? 0,
    directProperties: target.properties,
    inheritedProperties,
    referencedBy: allProperties
      .filter((p) => p.range === target.iri && p.domain !== target.iri)
      .sort((a, b) => a.label.localeCompare(b.label)),
    sampleInstances,
  };
}

function localName(iri: string): string {
  const colon = iri.lastIndexOf(":");
  const slash = iri.lastIndexOf("/");
  return iri.slice(Math.max(colon, slash) + 1);
}
