# @canonical/react-ds-experiments

A **playground** for advanced, graph-shaped design-system components, developed
in isolation from the shipped tiers (`ds-global`, `ds-global-form`, …). Nothing
here is published; it exists so we can prototype the harder ideas — starting with
a **graph representation of the knowledge graph** — against the real toolchain
(Storybook, Relay, the code standards) before promoting anything.

> Status: **experimental**. `private: true`, not part of the published DS.

## What's in the box

A small kit for drawing a slice of the Pragma ontology as an interactive graph,
built on [React Flow](https://reactflow.dev) (`@xyflow/react`):

| Export | Kind | What it is |
| --- | --- | --- |
| `GraphCanvas` | pure | The composition root. Give it plain `entities` + `relations`; it draws the graph, a legend, controls, and background. |
| `EntityNode` | pure | The node renderer — a card showing an entity's category, label, tier, and summary. Registered as the `entity` node type. |
| `RelationEdge` | pure | The edge renderer for **associative** relations (`uses`, `governs`, `refines`) — a curved, tinted, labelled edge. |
| `SubclassEdge` | pure | The edge renderer for the **taxonomic** `SUBCLASS_OF` ("is a") — an orthogonal edge with a hollow generalisation arrowhead. |
| `GraphLegend` | pure | The key: every entity kind and relation kind with the colour used to draw it. |
| helpers | pure | `buildGraphElements`, `computeGraphLayout`, `resolveEntityAppearance`, `resolveRelationAppearance`. |
| `OntologyGraph` | **projection** | Binds a Relay query and hands the result to `GraphCanvas`. Demonstrated in Storybook (see below), not exported from the build. |

### How edges are modelled

Two archetypes, because the ontology has two:

- **Taxonomy** — `SUBCLASS_OF`, the "is a" backbone. Drawn by `SubclassEdge`
  with the UML generalisation arrow (a hollow triangle) so `Button is a
  Component` reads as a classification.
- **Association** — `uses` / `governs` / `refines`, drawn by `RelationEdge`,
  each tinted by kind and carrying its verb as a label.

`buildGraphElements` routes each relation to the right renderer via
`resolveRelationAppearance`, so adding a relation kind is a one-line change in
one resolver — the canvas and the legend both follow.

## Architecture: pure components vs the projection

This mirrors the split from the A-workstream ADRs (`advl/pragma-adrs`,
`A.06.COMPOSITION`):

- **Pure components** are presentational. They take a plain graph slice as props
  and render it. They fetch nothing, so they build, typecheck, and test on their
  own, and they are the package's public API.
- The **projection** (`OntologyGraph`) binds a GraphQL query and maps its result
  to the pure `GraphCanvas`. That binding — the same query a human sees rendered
  and an agent would issue — is the bi-modal invariant. It is demonstrated in
  Storybook rather than shipped in `dist`, because a Relay `graphql` tag has to
  be rewritten by the compiler and would not survive a plain `tsc` build.

```
query (OntologyGraphQuery)  ──useLazyLoadQuery──▶  OntologyGraph  ──▶  GraphCanvas
                                                    (projection)        (pure)
```

## Relay setup

Wired exactly like `apps/react/boilerplate-vite`:

- **`relay.config.json`** points the compiler at `src/relay/schema.graphql` and
  emits TypeScript artifacts into `src/relay/__generated__` (committed, and
  excluded from Biome).
- **`vite-plugin-relay-lite`** (`codegen: false`) rewrites `graphql` tags into
  imports of those artifacts; Storybook's react-vite framework merges the config.
- **`@canonical/storybook-addon-relay`** supplies a `relay-test-utils` mock
  environment per story via `parameters.relay` — see
  `OntologyGraph.stories.tsx`.
- **`src/relay/schema.ts`** builds an executable mock schema over the same
  `ontologySample` fixture, so `OntologyGraph` can also run against
  `createExperimentsEnvironment` with no backend (the graph-shaped analogue of
  the boilerplate's catalog mock).

Regenerate artifacts after changing a query:

```sh
bun run relay        # one-shot
bun run relay:watch  # on change
```

### A note on the Relay version

This package was requested with "compiler v21", but the whole workspace is
pinned to **Relay `18.2.0`** (patched in `patches/` for React 19 + packaging
fixes), and `@canonical/storybook-addon-relay` declares a peer range of
`react-relay >=18 <19`. Pinning v21 here would fork Relay in the monorepo,
bypass those patches, and break the addon's peer requirement. So this package
tracks the workspace at 18.2.0; bumping the whole repo to Relay 21 is a separate,
repo-wide change.

## Develop

```sh
bun run storybook   # play with the components (port 6011)
bun run test        # unit tests (helpers + GraphLegend)
bun run check       # biome + tsc
bun run relay       # regenerate Relay artifacts
```

## Conventions

Components follow the `summon component react` generator layout —
`Component.tsx` · `types.ts` (named `…Props`) · `index.ts` (`export type *`) ·
`Component.stories.tsx` · `Component.tests.tsx` — and the repo code standards
(folder named for the component, `ds`-prefixed class-name construction, per-file
default exports, verb-named helper functions). The graph canvas and its
nodes/edges are gated visually through Storybook/Chromatic rather than jsdom
unit tests, since React Flow measures a real layout; the deterministic logic is
unit-tested.
