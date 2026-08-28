# The design system graph

Everything `pragma` answers comes from one RDF graph. Six read nouns are views over it: `block`, `tier`, `modifier`, `standard`, `token`, and `ontology`. This page takes each in turn — what the entity is, what its commands return, and how to read the one answer that is not self-explanatory: a block's anatomy tree.

If you have not installed pragma yet, start with [getting started](./getting-started.md).

## How every read works

The read nouns share one grammar:

| Verb | What it does |
|---|---|
| `list` | Every entity of that kind, one line each |
| `lookup <name...>` | The full record of one or more entities, by name or glob (`'Nav*'`) |
| `sample` | A few complete entities at random — real data shapes before you write a query |

Three flags apply everywhere:

- `--detail summary|standard|detailed` — how much of the record a lookup returns.
- `--format plain|llm|json` — human text, condensed Markdown for agents, or the full `{ ok, data, meta }` envelope. When omitted, pragma picks `llm` if output is piped and `plain` on an attended terminal.
- `--verbose` — progress detail on stderr.

## Where the answers come from

Reads answer from a local store, offline. Out of the box that store is a snapshot compiled into the package; `pragma sources update` rebuilds it from the packs named in your `pragma.config.ts`, and `pragma sources status` reports which one is answering (`embedded`, `built`, or `unavailable`) and exactly what it was built from:

```bash
pragma sources update
pragma sources status
```

To pin a pack to an exact revision, put the full 40-character commit SHA in its source ref (`git+https://github.com/org/repo.git#<sha>`). An abbreviated SHA is not a valid fetch target, and the update fails naming it.

## Blocks

A **block** is one reusable piece of UI, at any of four grains:

- **component** — one interactive element (`Button`, `Tooltip`)
- **subcomponent** — a part that only exists inside its parent (`Accordion.Item`)
- **pattern** — a composition of components serving one purpose (`ActionBar`)
- **layout** — a page- or view-level arrangement (`ApplicationLayout`)

This distribution's graph carries **251** blocks. List them:

```console
$ pragma block list
## Block (251)

- `ds:global.component.accordion` — **Accordion** component | global
- `ds:global.subcomponent.accordion-item` — **Accordion.Item** subcomponent | global
- `ds:apps.pattern.action_bar` — **ActionBar** pattern | apps
⋮
- `ds:global.component.button` — **Button** component | global | Anticipation, Importance
⋮
```

Each row is the block's IRI (prefixed with `ds:`), its name, its grain, its tier, and — where it declares any — its modifier families.

`lookup` returns the full spec. It takes one or more names, or a glob when you know roughly what something is called:

```bash
pragma block lookup Button
pragma block lookup 'Nav*'
```

A full block record carries, where the graph declares them:

| Section | What it holds |
|---|---|
| Summary | What the block is and its main use cases |
| Guidelines | Accessibility and content-writing rules |
| Anatomy (DSL) | The structural node tree — see the walk-through below |
| Anatomy (classic) | A link to the drawn anatomy reference |
| Modifier Families | The variant axes this block composes, with their values |
| Properties | The block's API: name, type, optional |
| Subcomponents | The parts that ship with it |

Not every block fills every section — an absent section means the graph holds nothing for it, not that the command trimmed it. To see what fully-populated records look like before writing your own queries, ask for exemplars:

```bash
pragma block sample
```

## Reading a block's anatomy

The anatomy DSL is the structural contract of a block: which parts it is made of, how they nest, which are optional, and which design tokens style them. It is platform-agnostic — the same tree governs a React implementation and a web-components one. Here is Button's, exactly as `pragma block lookup Button` returns it:

```yaml
---
node:
  uri: app-launchpad.component.button
  styles:
    layout.type: stack
    layout.direction: horizontal
    layout.align: center
    spacing.internal: spacing/inline/small
    appearance.background: color/background/neutral/default
    appearance.border: border/style/solid
    appearance.radius: radius/medium
    typography.size: typography/paragraph/default
  edges:
    - node:
        role: content container
        styles:
          layout.type: grid
          layout.direction: horizontal
          spacing.gap: spacing/inline/icon
        edges:
          - node:
              role: icon container
            relation:
              cardinality: "0..1"
              slotName: iconLeft
          - node:
              role: label text
            relation:
              cardinality: "1"
              slotName: default
          - node:
              role: icon container
            relation:
              cardinality: "0..1"
              slotName: iconRight
      relation:
        cardinality: "1"
    - node:
        role: loader container
        edges:
          - uri: app-launchpad.component.spinner
            relation:
              cardinality: "1"
      relation:
        cardinality: "0..1"
        slotName: loader
```

Read it top-down:

- **`node`** is the tree. The root is the block itself; everything under `edges` is a child, and children nest.
- **A node is named or anonymous.** A named node carries a `uri` and points at a block in the graph — the loader above contains the real `spinner` component. An anonymous node carries a `role` instead (`label text`, `icon container`): a structural part with no independent identity.
- **`styles`** binds the node to design decisions, keyed by facet: `layout.*` and a handful of primitives (`stack`, `grid`, `center`), plus `spacing.*`, `appearance.*`, and `typography.*` whose values are token paths (`spacing/inline/small`, `radius/medium`) resolved against the active theme. A style lives on the node it applies to — the gap between icon and label belongs to the content container, not to the root.
- **`relation`** describes the edge from parent to child. **`cardinality`** is how many of the child may appear: `"1"` means exactly one, `"0..1"` optional, and the general form is `min..max` with `*` for unbounded. **`slotName`** names the slot a consumer fills — it is the anatomy's half of the block's API.

So Button's tree says, in one screen: a horizontal stack holding a required content container (an optional left icon, exactly one label, an optional right icon, laid out as a grid with icon-gap spacing) and an optional loader slot that renders a Spinner. When you implement or review a Button, that is the structure to match — and the Properties section (`loading`, `disabled`, …) is the behavioral API layered on top of it.

## Tiers

A **tier** is a scope in the design system: `Global` holds what every product shares, and narrower tiers hold what one product family or product adds. The hierarchy is written in the tier's slash-separated name — `Global`, `Apps`, `Apps/LXD` — and a lower tier inherits from its ancestors: working at `Apps/LXD` you have LXD's own blocks, plus everything `Apps` and `Global` provide. Where the same block name appears at two tiers, the nearer tier's spec is the one that governs — that is what "inherits and overrides" means here, and why the graph carries both a `global` Badge and an `apps_launchpad` Badge without contradiction.

This distribution's graph has **15** tiers:

```console
$ pragma tier list
## Tier (15)

- `ds:apps` — **Apps**
- `ds:apps_anbox` — **Apps/Anbox**
- `ds:apps_juju` — **Apps/Juju**
- `ds:apps_lxd` — **Apps/LXD**
⋮
- `ds:global` — **Global**
- `ds:sites` — **Sites**
- `ds:stores` — **Stores**
```

`tier lookup` resolves a tier by name and lists the blocks scoped **directly** to it — its own additions, not the inherited chain:

```console
$ pragma tier lookup Apps/LXD
## Apps/LXD

### Blocks
- name: BackLink
- name: CodeSnippetWithCopyButton
- name: ConfirmationCheckbox
⋮
```

## Modifiers

A **modifier family** is a named variant axis with a fixed set of values, declared once for the whole design system. Where ad-hoc props let every component invent its own `variant="danger" | "warn" | "error"`, a family settles the axis and its vocabulary graph-wide: Anticipation is always Caution, Constructive, or Destructive, whichever block composes it. A variant is a relationship in the graph, not a string.

```console
$ pragma modifier list
## Modifier (11)

- `ds:global.modifier_family.anticipation` — **Anticipation** Caution, Constructive, Destructive
- `ds:global.modifier_family.criticality` — **Criticality** Error, Information, Success, Warning
- `ds:global.modifier_family.density` — **Density** Comfortable, Dense
- `ds:global.modifier_family.importance` — **Importance** Primary, Secondary, Tertiary
- `ds:global.modifier_family.lifecycle` — **Lifecycle** Completed, Failed, In Progress, Planned
- `ds:global.modifier_family.mode` — **Mode** Dark, Light
- `ds:global.modifier_family.release` — **Release** Alpha, Beta, Experimental, Stable
- `ds:global.modifier_family.surface` — **Surface** Modal, Surface1, Surface2, Surface3
⋮
```

Three further entries render with parenthesized names — `(Color luminosity)`, `(Emphasis)`, `(Other)` — groupings the data has not yet promoted to settled families; treat them as provisional.

Families combine by composition. A block declares which families apply to it, and takes at most one value from each; the axes are independent, so a block composing Anticipation and Importance offers their full cross-product (a Destructive Secondary button is one point in it). `block list` shows each block's families in its row; `block lookup` shows the values:

```console
$ pragma block lookup Tag
⋮
### Modifier Families
- name: Anticipation | values: Caution, Constructive, Destructive
- name: Criticality | values: Error, Information, Success, Warning
- name: Importance | values: Primary, Secondary, Tertiary
⋮
```

One family on its own:

```bash
pragma modifier lookup Importance
```

## Standards

A **standard** is one do/don't coding rule, categorized by stack and linked to the blocks it governs. The graph carries **21** categories:

```bash
pragma standard categories
```

Categories are a hierarchy, and a parent answers for its whole branch — `--category testing` returns all 8 testing standards, not only the one filed directly on `testing`:

```bash
pragma standard list
pragma standard list --category testing
pragma standard list --search naming
```

A slug the graph does not carry is refused, with the ones it does carry named — so a typo is a corrected call, not a silent empty list.

Each row carries the standard's full rule text, so `list` is often all you need. `lookup` adds the worked code examples, gated by detail level — the default is a summary, `--detail standard` adds the **Do** examples, `--detail detailed` adds the **Don't**:

```bash
pragma standard lookup 'react/component/tsdoc' --detail detailed
```

**The name `list` prints is the name `lookup` answers to.** Take a row's `Name` column verbatim; most standards carry no separate display title (the canonical identifier is the IRI), so that name is derived from the IRI — `cs:react.component.tsdoc` prints, and resolves, as `react/component/tsdoc`. The prefixed IRI works too, and globs work over either spelling:

```bash
pragma standard lookup 'react/component/*' --detail detailed
pragma standard lookup 'cs:react.*' --detail detailed
```

## Tokens

A **token** is one themeable design value — a color, a spacing step, a radius — resolved per theme. The anatomy trees above already reference tokens by path (`spacing/inline/small`). As catalog entries, however:

```console
$ pragma token list
## Token (0)

No token entries found.
```

That zero is a real answer: this distribution's graph ships no token entities, and the command says so rather than inventing. The catalog populates when a pack that ships tokens is configured and built — the surface is already declared.

## The ontology, and asking directly

The schema the graph conforms to is itself readable. `ontology list` names the vocabularies in the store; `ontology lookup` prints one vocabulary's classes and properties, with instance counts:

```console
$ pragma ontology list
## Ontologies (3)

- `anatomy` — 9 classes, 15 properties (`http://anatomy-dsl.example.org/ontology#`)
- `cs` — 3 classes, 9 properties (`http://pragma.canonical.com/codestandards#`)
- `ds` — 17 classes, 50 properties (`https://ds.canonical.com/`)
```

```bash
pragma ontology lookup ds
```

Anything the read nouns don't cover, ask in SPARQL — prefixes like `ds:` are bound automatically from the active pack, and each noun's `sample` verb shows real data shapes before you write the query:

```bash
pragma graph query "SELECT ?s WHERE { ?s a ds:Component }"
```

For the story of how the graph itself is made — the ontology, the packs, the build — the graph narrates it:

```bash
pragma colophon
```

## Where next

- [Command & tool reference](./reference/index.md) — every command, flag, and detail level.
- [Configuration model](./config-model.md) — pointing pragma at your own design system's packs.
- [MCP integration](./mcp-integration.md) — the same reads, projected as tools for your agent.
