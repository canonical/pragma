# Displaying the TBox: design for `pragma ontology show`

**Status:** proposal (2026-07)
**Motivation:** `ontology show <prefix>` is the primary window into an
ontology's schema (its TBox — classes, properties, constraints). Today it
renders two flat alphabetical lists, which hides the one thing a schema
reader most needs: *structure*. This document describes a clean target
surface for humans and machines.

## What the current surface does (and misses)

`showOntology` returns `{ prefix, namespace, classes[], properties[] }` where
each class carries `uri`, `label`, and at most **one** `superclass`, and each
property carries `uri`, `label`, `domain?`, `range?`, `type`. The renderer
prints the two lists alphabetically.

What this loses, in order of pain:

1. **Hierarchy.** `subClassOf` is the backbone of a TBox, but the reader has
   to reconstruct the tree from `extends` pointers scattered across an
   alphabetical list. (Multiple inheritance is silently dropped — only the
   first superclass survives deduplication.)
2. **Attachment.** Properties belong with their domain class. A flat list of
   52 properties forces a mental join the machine already did.
3. **Documentation.** `rdfs:comment` is never queried, so class descriptions
   authored in the ontology are invisible everywhere.
4. **Grounding.** The store knows there are 77 Components and 15 Tiers; the
   TBox view doesn't say which classes actually have instances — the single
   most useful signal for "where do I look next".
5. **Constraints.** The store holds SHACL `NodeShape`s; none are surfaced.
6. **Metadata.** `owl:Ontology` triples (version, title, imports) are not
   shown. (Nit: the current plain header renders the prefix twice —
   `## ds: ds:`.)

## Design principles

- **A TBox is a tree with attachments, not two lists.** Render the class
  hierarchy as the primary structure; hang properties off their domain class.
- **Progressive disclosure, same as the rest of pragma.** Three altitudes:
  namespace list → one namespace's schema → one class in depth. Each level
  answers "what should I ask next" and names the command that asks it.
- **One data shape, three renderings.** The operation returns a single
  complete structure; plain/llm/json are projections of it, never separate
  queries (this is what keeps the modes data-equivalent).
- **Compact IRIs + prefix map.** Machines get lossless data without URI
  noise: every IRI is prefixed (`ds:Component`) and the payload carries the
  `prefixes` map needed to expand them.
- **Deterministic ordering.** Topological (roots first), then alphabetical
  among siblings — stable across runs so diffs and goldens work.

## Command surface

```bash
pragma ontology list                      # namespaces + counts (exists)
pragma ontology show ds                   # the TBox: tree + attached properties
pragma ontology show ds --class Component # one class in depth
pragma ontology show ds --raw             # raw Turtle escape hatch (exists as triples)
```

No new nouns; `--class` extends the existing verb the same way `--detailed`
extends lookups. On MCP the single `ontology_show` tool grows an optional
`class` parameter, mirroring the CLI exactly.

## Response shape (`--format json`, MCP `data`)

```jsonc
{
  "prefix": "ds",
  "namespace": "https://ds.canonical.com/",
  "prefixes": { "ds": "https://ds.canonical.com/", "xsd": "http://www.w3.org/2001/XMLSchema#" },
  "meta": {                       // owl:Ontology triples, when present
    "title": "Canonical Design System Ontology",
    "version": "0.1.2",
    "imports": []
  },
  "classes": [
    {
      "iri": "ds:Component",
      "label": "Component",
      "comment": "A reusable UI building block…",   // rdfs:comment, omitted if absent
      "subClassOf": ["ds:UIBlock"],                 // array — multiple inheritance survives
      "instances": 77,                              // count of ?s a ds:Component
      "properties": [                               // properties whose domain is this class
        { "iri": "ds:anatomyDsl", "label": "anatomyDsl", "kind": "datatype",
          "range": "xsd:string", "functional": false },
        { "iri": "ds:tier", "label": "tier", "kind": "object",
          "range": "ds:Tier", "functional": true }
      ]
    }
  ],
  "unattached": [                 // properties with no domain, or a domain outside this namespace
    { "iri": "ds:version", "label": "version", "kind": "datatype", "range": "ds:SemverString" }
  ],
  "constraints": [                // SHACL summaries, when shapes exist
    { "shape": "ds:ComponentShape", "targetClass": "ds:Component", "propertyCount": 4 }
  ]
}
```

Field notes:

- `subClassOf` is always an array; the tree renderer picks the first edge for
  placement and annotates extra parents ("also extends …") rather than
  dropping them.
- `instances` is one `GROUP BY ?type` count query for the whole namespace —
  a single cheap SPARQL, not per-class.
- `functional` comes from `owl:FunctionalProperty` typing (8 exist in the
  store today and are currently invisible).
- Omit empty fields (`comment`, `constraints`) rather than emitting nulls —
  consistent with the CLI's existing JSON style.

### Per-class detail (`--class Component`)

Same envelope, scoped to one class, plus what the overview can't afford:

```jsonc
{
  "class": {
    "iri": "ds:Component",
    "label": "Component",
    "comment": "…",
    "superChain": ["ds:UIBlock", "ds:UIElement", "ds:Entity"],
    "subclasses": [],
    "instances": 77,
    "properties": { "direct": [ /* … */ ], "inherited": [ /* from the superChain */ ] },
    "referencedBy": [                       // properties whose range is this class
      { "iri": "ds:implementationOf", "domain": "ds:ImplementationObject" }
    ],
    "constraints": [ /* full SHACL property shapes for this class */ ],
    "sampleInstances": ["ds:global.component.button", "ds:global.component.chip"]
  }
}
```

`sampleInstances` is the bridge out of the schema: it hands the agent (or the
human) concrete IRIs to feed to `block lookup` / `graph inspect` next.

## Plain rendering (human)

```
Ontology ds: — https://ds.canonical.com/
17 classes · 52 properties · 8 shapes · v0.1.2

Entity
├─ ImplementationLibrary (3)
├─ ImplementationObject (12) — versionedLink
├─ Property (399)
├─ Tier (15)
└─ UIElement
   ├─ Modifier (30)
   ├─ ModifierFamily (9) — values
   └─ UIBlock — anatomyDsl, whenToUse, whenNotToUse, tier →Tier
      ├─ Component (77)
      ├─ Layout (14)
      ├─ Pattern (35)
      └─ Subcomponent (31)

Unattached: version, name, summary …(6 more)

Next: pragma ontology show ds --class Component · pragma graph inspect <iri>
```

Rules: instance counts in parentheses (omitted when zero); direct properties
listed inline after the class, `→Range` only for object properties; long
property lists elide with a count; the footer always names the next command.
This stays within the CLI's existing markdown-ish plain idiom and needs no
table layout (so it is immune to the ink width-collapse problems).

## LLM rendering (`--llm`, MCP `condensed`)

The same tree, tightened: one line per class
(`ds:Component < ds:UIBlock · 77 instances · props: anatomyDsl, tier→ds:Tier`),
comments truncated to the first sentence, and the standard `tokens: ~N`
footer. Target ≤600 tokens for a namespace the size of `ds`. The decision
tree in `pragma llm` gains one line: *schema unclear → ontology show <ns>
[~400] → ontology show <ns> --class <C> [~300]*.

## Machine access beyond JSON

- **MCP resource:** expose `pragma:ontology/{prefix}` returning the same JSON
  — agents can subscribe/fetch without a tool call.
- **GraphQL:** `pragma graphql build` already compiles TTL to schema
  artifacts; the JSON shape above deliberately mirrors that extraction
  (classes → types, properties → fields) so the two surfaces describe the
  same schema in the same vocabulary.
- **Raw escape hatch:** `--raw` emits Turtle (serialized from
  `showOntologyRaw`'s triples) for anyone feeding a real ontology toolchain.

## Implementation sketch

1. Extend `queryClasses` to also select `rdfs:comment` and *all*
   `subClassOf` edges (return `subClassOf: string[]`); add the one
   `GROUP BY ?type` instance-count query; join in code.
2. Group `queryProperties` results by domain in the operation (not in
   formatters); detect `owl:FunctionalProperty`.
3. Add a pure `buildClassTree(classes)` helper (roots = classes whose
   parents are outside the namespace or absent); topological + alphabetical
   sort; cycle-safe (fall back to flat list with a warning on a cycle).
4. One new formatter per mode projecting the same `OntologyDetailed v2`.
   The MCP tool and CLI share the operation, as everywhere else.
5. Keep the current flat shape available during migration by versioning the
   JSON (`"shapeVersion": 2`) or gating with `--flat` for one release.

Cost: two additional SPARQL queries per `show` (comments/edges ride the
existing ones); the tree build is O(classes). No new dependencies.
