<!--
  SYNCED FILE — do not edit here.

  Source: canonical/anatomy-dsl · docs/api-reference.md
  Ref:    6e679f2 (feat/namespaces-and-states, 0.6.0)
  Synced: 2026-09-14

  Two lines diverge from the upstream text, and are marked here rather than left
  silent: the `motion` row of the namespace table (3.7) and the optional-marker row
  of the retired-notation table (12) both pointed at a register row as the record for
  a name no stratum declares. An authored anatomy in this repository has no register
  row — a `#` comment on the line is the record — so both rows say that instead.
  Raise it upstream and the divergence goes away with the next sync.

  Edit the spec in canonical/anatomy-dsl and re-copy this file wholesale.
  pragma's packages/cli/pragma/bundled-skills/anatomy-author/ is regenerated
  FROM this file by `bun run bundle`, so it needs no separate edit.
-->

# Anatomy DSL — API Reference

> Consolidated reference merging WD404 (core), WD404.1 (addendum 1), WD404.2 (projections), WD404.3 (prop pinning), and WD404.4 (interaction states).

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Format](#2-file-format)
3. [Type System](#3-type-system)
   - 3.1 [AnatomySpec (root)](#31-anatomyspec-root)
   - 3.2 [Node](#32-node)
   - 3.3 [NamedNode](#33-namednode)
   - 3.4 [AnonymousNode](#34-anonymousnode)
   - 3.5 [Edge](#35-edge)
   - 3.6 [Relation](#36-relation)
   - 3.7 [Styles](#37-styles)
   - 3.8 [Switch](#38-switch)
   - 3.9 [SwitchCase](#39-switchcase)
   - 3.10 [Projection](#310-projection)
   - 3.11 [Prop](#311-prop)
   - 3.12 [Token binding](#312-token-binding)
4. [URI Encoding Convention](#4-uri-encoding-convention)
5. [Symbols and the Value Grammar](#5-symbols-and-the-value-grammar)
6. [Cardinality Notation](#6-cardinality-notation)
7. [Slot Mapping](#7-slot-mapping)
8. [Named vs Anonymous Rule](#8-named-vs-anonymous-rule)
9. [DRY Principle for Named Nodes](#9-dry-principle-for-named-nodes)
10. [Switch Construct](#10-switch-construct)
    - 10.1 [Discriminator Vocabulary](#101-discriminator-vocabulary)
    - 10.2 [Shorthand Expansion](#102-shorthand-expansion)
    - 10.3 [Reserved URI: $custom](#103-reserved-uri-custom)
11. [The Fallback List](#11-the-fallback-list)
12. [Retired Notation](#12-retired-notation)
13. [Examples](#13-examples)
14. [TypeScript Definitions](#14-typescript-definitions)
15. [Deferred Items](#15-deferred-items)
16. [References](#16-references)

---

## 1. Overview

The Anatomy DSL is a YAML-based language for describing the structural anatomy of design system components. It produces a tree of **nodes** connected by **edges**, where each edge carries a **relation** annotating cardinality and slot assignment.

### Intended Usage

| Usage           | Description                                                                                         |
|-----------------|-----------------------------------------------------------------------------------------------------|
| Documentation   | Implementation primitive for markup and style bindings.                                             |
| Specification   | Tree-based DSL to identify entities to implement and/or reuse.                                      |
| Discussion      | Shared vocabulary for design system conversations (e.g. "these nodes should be siblings").           |
| Inference       | Supports automated auditing of a codebase against its specifications, or code generation.           |

### Out of Scope

The Anatomy DSL describes **structure**, [projected](#310-projection) **graph-data bindings**, and [pinned](#311-prop) **prop values**. The following concerns are explicitly outside its scope:

- **Prop surface definition** — which props a component accepts, their types and optionality. These live in the design system ontology; the DSL only [pins values](#311-prop).
- **State machines** — transitions, triggers, and interaction logic. Appearance *per* interaction state is in scope (see [Interaction States](#37-styles)); structural state variation is the [Switch construct](#10-switch-construct)'s job.
- **Modifier definitions** — what a modifier family MEANS, which values it has, and which components declare it. These live in the design system ontology. A component's support for a family is not declared in its anatomy at all: it is CONSUMED, by binding the family's channel symbol on the key the family reaches (`[modifier.color.text, color.text]`, `[surface.color.background, color.background]`), so the family name never appears in the tree. That is the modelling convention, not a gap — see the channel rules in the sibling `SKILL.md`.

### Normative Language

The key words "MUST", "MUST NOT", "SHOULD", "SHOULD NOT", and "MAY" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

### Design Requirements

- The DSL MUST optimize for readability.
- The DSL MUST be easy to get started with and use a familiar language.
- The scope of the DSL MUST be minimized to cover only the strict necessary.
- The children of a node MUST be modelled through a reified relation for annotation purposes.
- The DSL MUST support anonymous nodes with role annotations.
- The DSL MUST support reified annotations of cardinality.
- The DSL MUST support all classes of UI Blocks (Layout, Pattern, Component, Subcomponent).

---

## 2. File Format

All anatomy files MUST use YAML and MUST begin with the YAML document start marker:

```yaml
---
node:
  uri: global.component.button
  # ...
```

**File extension**: `.anatomy.yaml`

**Language choice rationale**: YAML was chosen for its indentation-based structure and readability. JSON was rejected for verbosity. TOML maps with difficulty to deeply nested nodes. SDLang and KDL are promising but lack wide adoption.

---

## 3. Type System

The children one-to-many relation is structured following inspiration by the [Relay connection pattern](https://relay.dev/graphql/connections.htm), reifying the relationship between parent and child as a first-class **Edge** carrying metadata.

### 3.1 AnatomySpec (root)

The root of every anatomy file. Contains exactly one top-level named node.

| Field  | Type      | Required | Description                          |
|--------|-----------|----------|--------------------------------------|
| `node` | NamedNode | Yes      | The root component being described.  |

```yaml
---
node:
  uri: global.component.card
  styles: { ... }
  edges: [ ... ]
```

### 3.2 Node

A union type. Every node is either a **NamedNode** or an **AnonymousNode** — never both. Discriminated by the presence of `uri` (named) vs `role` (anonymous).

```
Node = NamedNode | AnonymousNode
```

### 3.3 NamedNode

A node representing an identifiable component in the design system — something a consumer can instantiate in code.

| Field    | Type   | Required | Description                                                       |
|----------|--------|----------|-------------------------------------------------------------------|
| `uri`    | string | Yes      | Unique identifier. See [URI Encoding Convention](#4-uri-encoding-convention). |
| `projection` | Projection | No | Graph-data binding. See [Projection](#310-projection).        |
| `props`  | Props  | No       | Pinned prop values. See [Prop](#311-prop). Named nodes only.      |
| `styles` | Styles | No       | Platform-agnostic style properties.                               |
| `edges`  | Edge[] | No       | Child nodes and their relationships.                              |

```yaml
node:
  uri: global.component.accordion
  styles:
    layout.type: grid
  edges:
    - node: { uri: global.subcomponent.accordion-item }
      relation: { cardinality: "1..*" }
```

### 3.4 AnonymousNode

A structural element without design system identity — not directly instantiated by users.

| Field    | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `role`   | string | Yes      | Human-readable description of the node's purpose.|
| `projection` | Projection | No | Graph-data binding. See [Projection](#310-projection). |
| `styles` | Styles | No       | Platform-agnostic style properties.              |
| `edges`  | Edge[] | No       | Child nodes and their relationships.             |

```yaml
node:
  role: content wrapper
  styles:
    layout.type: block
    spacing.external.block.end: spacing.gap.field.block
```

### 3.5 Edge

Represents a parent-child relationship in the anatomy tree. An edge contains either a `node` or a `switch` (mutually exclusive), plus a `relation`.

| Field      | Type     | Required | Description                                                         |
|------------|----------|----------|---------------------------------------------------------------------|
| `node`     | Node     | No*      | A single child node (named or anonymous).                           |
| `switch`   | Switch   | No*      | A polymorphic position. See [Switch Construct](#10-switch-construct).|
| `relation` | Relation | Yes      | Cardinality and slot metadata.                                      |

> \* Exactly one of `node` or `switch` MUST be present.

**Shorthand**: When an edge references a named node by URI only, `- uri: X` expands to `- node: { uri: X }`:

```yaml
# Shorthand
edges:
  - uri: global.component.button
    relation: { cardinality: "1" }

# Expands to
edges:
  - node:
      uri: global.component.button
    relation: { cardinality: "1" }
```

### 3.6 Relation

Metadata about the parent-child relationship carried by an edge.

| Field         | Type   | Required | Description                                                                    |
|---------------|--------|----------|--------------------------------------------------------------------------------|
| `cardinality` | string | Yes      | Instance count constraint. See [Cardinality Notation](#6-cardinality-notation). |
| `slotName`    | string | No       | Target slot in the parent component. See [Slot Mapping](#7-slot-mapping).       |
| `projection`  | RelationProjection | No | Traversal populating the slot. See [Projection](#310-projection). |

```yaml
relation:
  cardinality: "0..1"
  slotName: header
```

### 3.7 Styles

A flat map of platform-agnostic UI properties. A key is one member of the
**closed roster** the registry declares; a value is a **symbol**, a
**primitive**, or a **list** that is the fallback order.

```
Styles = Record<StyleKey, StyleValue>
StyleValue = Symbol | Primitive | [Symbol, ...(Symbol | Primitive)]
```

| Value Type | Example | Description |
|---|---|---|
| Symbol | `dimension.100`, `color.text`, `modifier.color.text` | The dotted name of a token symbol, verbatim. See [§5](#5-symbols-and-the-value-grammar). |
| Primitive | `flow`, `0`, `2px`, `#ccc`, `"1 / -1"` | A literal the implementation writes as it stands. |
| List | `[modifier.color.text, color.text]` | The fallback order — the implementation's own `var()` chain, terminal literal included. See [§11](#11-the-fallback-list). |

**The key roster is closed.** Keys are declared one `anatomy:StyleKey`
individual each in `definitions/registry.ttl`, generated from the roster in
`definitions/style-keys.yaml`, and `anatomy:styleKey`'s `sh:in` is projected
from the same roster. The roster is not designed: it is the right-hand column
of a table whose left-hand column was every CSS property the reference
implementations bind, measured over 89 published component stylesheets, so a
key exists because an implementation binds the property. Both files state
that provenance, and the measurement itself lives in `canonical/design-system`
— this package reads no CSS.

**Key naming**: `namespace.segment[.segment…]` — the same shape as a symbol, a
lowercase namespace then one or more segments, camelCase admitted
(`typography.lineHeight`). The registry tells a key from a symbol, so the
grammar does not have to.

| Namespace | Typical keys | What a value is |
|---|---|---|
| `layout` | `layout.type`, `layout.direction`, `layout.align`, `layout.grid.column` | Primitives: structure does not vary by theme |
| `spacing` | `spacing.gap`, `spacing.internal.inline.start`, `spacing.external.block.end` | `spacing.*` symbols, and `dimension.*` while the implementations still bind it |
| `appearance` | `appearance.background`, `appearance.radius`, `appearance.border.color`, `appearance.outline.width` | `color.*` or `dimension.*` symbols, channels included |
| `typography` | `typography.size`, `typography.weight`, `typography.color`, `typography.lineHeight` | `typography.*`, `dimension.*` or `color.*` symbols |
| `size` | `size.width`, `size.height`, `size.max.width` | `dimension.*` symbols, or a primitive |
| `interaction` | `interaction.cursor`, `interaction.select` | Primitives |
| `motion` | `motion.property`, `motion.duration`, `motion.easing` | `motion.*` symbols — a namespace no stratum declares yet, so the binding is not written and a `#` comment on the line records what the implementation reads |

**Which of the three a key takes** is `anatomy:valueKind` on the key —
`token`, `primitive` or `either` — and it was measured from the reference
rather than asserted: a key whose every reference value read a `var()` is
`token`, one where a literal appeared too is `either`, one that took no symbol
at all is `primitive`. **Which symbols** it takes is
`anatomy:tokenNamespace`, a set of dotted prefixes that includes the
`modifier.` and `surface.` spellings wherever a channel is legal. A key may
admit **more than one base namespace**: the roster's `namespace` field takes
one dotted prefix or a list of them, and each member is projected into its
own three spellings, grouped by namespace and in the order the roster states
them. That is how every `spacing.*` key admits `dimension.*` alongside
`spacing.*` — the implementations read `--dimension-*` directly for padding
and gaps, and the second namespace comes out of the roster once semantic
spacing lands. Both are [§3.12](#312-token-binding)'s subject.

#### Interaction states (`@state`)

A style key MAY take an `@state` suffix scoping its value to an interaction
state. The unmarked key is the default state; `@default` is invalid (absence
*is* the default). States re-value channels only — they never add structure.

```yaml
styles:
  interaction.cursor: pointer
  interaction.cursor@disabled: not-allowed
  appearance.background: [modifier.color.foreground.primary, color.foreground.primary]
  appearance.background@hover: color.foreground.primary.hover
  # A slot may read a channel only in one state.
  appearance.outline.color@focus: [modifier.color.focusRing, color.focusRing, currentColor]
```

**Vocabulary (closed, registry-governed):**

| State | Meaning | Cross-system mapping |
|-------|---------|----------------------|
| `hover` | Pointer over the element | universal |
| `active` | Being pressed/activated | MD3 *pressed*, Spectrum *down*, CSS `:active` |
| `focus` | Keyboard focus indication | Spectrum *key-focus*; web implementations map to `:focus-visible` |
| `disabled` | Interaction unavailable | CSS `:disabled`, `aria-disabled` |
| `selected` | Chosen within a set | `aria-selected`, SLDS/Spectrum *selected* |
| `expanded` | A disclosure is open | `[open]`, `aria-expanded`, MD3 *expanded* |
| `indeterminate` | A checkbox or progress is mixed, on neither setting | CSS `:indeterminate`, `aria-checked="mixed"` |
| `invalid` | Validation has failed | CSS `:invalid`, `aria-invalid` |

Every mature system governs states as closed-with-registry (Spectrum's states
registry, ARIA's list of ten, SLDS's linted grammar). Candidate additions —
`checked`, `visited`, `dragged`, `pending`, `error`, `read-only` — enter
through the registry with a definition and per-platform mapping, never by
loosening the schema. `expanded`, `indeterminate` and `invalid` entered that
way, and the line they sit on is worth stating: a state is admitted where the
implementation RE-VALUES a channel in it, and refused where it changes what
exists. A disclosure header that takes a different background while open is
the first; the panel that exists only while open is the second, and stays the
Switch construct's territory — so `expanded` is a state and the panel's
presence is not. `open` is not admitted as a second spelling of `expanded`.

**Rules:**

- States hold style values only. A state that changes the tree MUST be
  modelled as a `switch` (e.g. async-button's internal states), not a state.
- The gate and the appearance are separate questions: `props: { disabled: true }`
  (or the consumer) *puts* a node in the disabled state; `…@disabled` styles
  say how it *looks* there.
- A state-scoped value that differs from its base state's is REPORTED, never
  rejected — a **lint, not a constraint**. The reference does it: Button's
  `:disabled` reads `color.text.disabled`, a different symbol from its
  resting `color.text`, and the reference is the source. The finding names
  the ranks at which the two differ, and a state key whose base state carries
  no binding at all is not compared (Chip's `dismiss` child has a `:hover`
  background and no unmarked one, which is the standing case). No shape here
  enforces agreement between a value's spelling and the key's `@state`.
- Compound states are reserved as repeatable markers (`@selected@hover`,
  canonical order: value/control state before user-action state). This
  version permits a single `@` per key.

In Turtle, the state is one optional dimension on the Style tuple:

```turtle
:hasStyle
    [ a :Style ; :styleKey "appearance.background" ;
      :styleValue "[modifier.color.foreground.primary, color.foreground.primary]" ;
      :consumes ( dt:modifier.color.foreground.primary dt:color.foreground.primary ) ] ,
    [ a :Style ; :styleKey "appearance.background" ; :styleState "hover" ;
      :styleValue "color.foreground.primary.hover" ;
      :consumes ( dt:color.foreground.primary.hover ) ]
```

**Platform mapping examples**:

| DSL Key                  | CSS                       | SwiftUI                           | Flutter                          |
|--------------------------|---------------------------|-----------------------------------|----------------------------------|
| `layout.type: flex`      | `display: flex`           | `VStack` / `HStack`              | `Column` / `Row`                 |
| `layout.align: center`   | `align-items: center`     | `alignment: .center`             | `crossAxisAlignment: center`     |
| `spacing.internal.inline.start` | `padding-inline-start` | `.padding(.leading)`       | `EdgeInsetsDirectional`          |
| `spacing.gap`            | `gap`                     | `spacing` parameter              | `SizedBox` between               |
| `appearance.background`  | `background`              | `.background()`                  | `Container` color                |
| `appearance.radius`      | `border-radius`           | `.cornerRadius()`                | `BorderRadius`                   |
| `size.width: 100%`       | `width: 100%`             | `.frame(maxWidth: .infinity)`    | `double.infinity`                |

### 3.8 Switch

Models a polymorphic position in the anatomy tree — a place that can be filled by one of several alternatives. Appears at the edge level, parallel to `node`.

| Field   | Type                | Required | Description                                                                         |
|---------|---------------------|----------|-------------------------------------------------------------------------------------|
| `on`    | SwitchDiscriminator | Yes      | What determines which case applies. See [Discriminator Vocabulary](#101-discriminator-vocabulary). |
| `cases` | SwitchCase[]        | Yes      | The available alternatives.                                                         |

```yaml
edges:
  - switch:
      on: props
      cases:
        - uri: global.component.checkbox
        - uri: global.component.radio
        - uri: global.component.text-input
    relation:
      cardinality: "1"
      slotName: input
```

### 3.9 SwitchCase

An individual case within a switch. Supports both shorthand (`uri`) and full form (`node`).

| Field  | Type   | Required | Description                          |
|--------|--------|----------|--------------------------------------|
| `uri`  | string | No*      | Shorthand for `node: { uri: ... }`.  |
| `node` | Node   | No*      | Full node definition with styles/edges. |

> \* Exactly one of `uri` or `node` MUST be present.

### 3.10 Projection

A fragment-style binding of the anatomy tree to graph data, after the Relay
colocation pattern: the tree carries its data requirements the way a Relay
component carries its fragment.

**On a node:**

| Field   | Type   | Required | Description                                                                 |
|---------|--------|----------|-----------------------------------------------------------------------------|
| `on`    | string | No*      | GraphQL type condition — a type name from the provider schema (e.g. `Component`). |
| `field` | string | No*      | Dot-delimited GraphQL field path relative to the enclosing data context (e.g. `_meta.title`). The node renders this field's value. |

> \* At least one of `on` or `field` MUST be present.

**On a relation:**

| Field   | Type   | Required | Description                                                     |
|---------|--------|----------|-----------------------------------------------------------------|
| `field` | string | Yes      | The traversal populating the slot — a field of the current data context. |

A relation projection MUST NOT carry `on`: type narrowing belongs on the child
node, never on the relation.

**Semantics:**

- The **root node's** `on` establishes the data context: the anatomy is a
  parameterized view over one entity of that type, like
  `fragment EntityCard on Component`. Children inherit the parent's context.
- `field` on a **relation** is a traversal: the slot is populated from that
  field of the current context. The DSL names the field only — never
  `edges.node`. Anatomy cardinality on the relation corresponds to
  multiplicity on the graph.
- `on` on a **child node** narrows the traversed entity's type — the analog of
  an inline fragment. Switch cases carrying different `on` values mirror an
  interface-typed connection resolved through inline fragments.
- `field` on a **node** (leaf usage) means the node renders that field's value.

**Cardinality mapping.** The relation's cardinality decomposes into two claims
about the projected field, both checkable against the provider SDL:

| Cardinality | Claim on the projected field                                     |
|-------------|------------------------------------------------------------------|
| `1`         | Non-null object or scalar field.                                 |
| `0..1`      | Nullable object or scalar field.                                 |
| `0..*`      | Connection or list, possibly empty.                              |
| `1..*`      | Connection or list, asserted non-empty — deliberately stronger than GraphQL can express; checkable only at runtime. |

The **upper bound** maps to multiplicity (`..1` singular, `..*` plural); the
**lower bound** maps to nullability (`0..` tolerates `null`, `1..` requires
the provider to always have the value). A projection under `cardinality: "1"`
MUST target a field the provider makes total (e.g. `_meta.title`); a nullable
field like `summary` MUST sit under `0..1`.

**Mechanism-blindness.** Whether a plural field is a Relay connection
(`subcomponents`) or a plain list (`properties`) is a provider mechanism, not
an anatomy fact. Anatomies MUST NOT spell out unwrapping paths such as
`edges.node`; consumers discover the field's shape from the SDL and unwrap it
when needed. An anatomy therefore survives a provider promoting a list to a
connection unchanged.

These two rules constrain projections against a *schema*, so they cannot be
enforced by this package's SHACL shapes; enforcement belongs to a
consumer-side checker holding the provider SDL.

```yaml
node:
  uri: global.component.entity-card
  projection:
    on: Component
  edges:
    - node:
        uri: global.subcomponent.entity-card-header
        projection:
          field: _meta.title
      relation:
        cardinality: "1"
        slotName: header
    - node:
        uri: global.component.chip
        projection:
          field: _meta.title      # relative to the traversed entity
      relation:
        cardinality: "0..*"
        slotName: tags
        projection:
          field: documentationStages  # a connection field on Component
```

Field and type names are anchored to the GraphQL schema of the provider the
consumer runs against; the committed provider SDL is the naming authority.

**Name grammar.** Both fields carry schema names, and `ProjectionShape`
constrains their *syntax* (never their existence):

| Field   | Pattern                                                | Reads as                                             |
|---------|--------------------------------------------------------|------------------------------------------------------|
| `on`    | `^[A-Z][A-Za-z0-9_]*$`                                   | A single GraphQL type name (`Component`).             |
| `field` | `^[_A-Za-z][_A-Za-z0-9]*(\.[_A-Za-z][_A-Za-z0-9]*)*$`     | Dot-delimited GraphQL field names (`_meta.title`).     |

Whether the names so formed exist in the provider schema — and whether the
field's shape matches the relation's cardinality — remains a consumer-side
check, per the two rules above.

**In Turtle**, projections reify like styles do, with an explicit type so
`ProjectionShape` targets them. The same blank-node tuple serves both
positions — on a node, and on the reified relation:

```turtle
# On a node: type condition, field, or both.
:hasProjection
    [ a :Projection ; :projectionType "Component" ]

# On a relation: the traversal populating the slot.
:hasRelation
    [ a :Relation ;
      :cardinality "0..*" ;
      :slotName "tags" ;
      :hasProjection [ a :Projection ; :projectionField "documentationStages" ] ]
```

Attaching to the reified `Relation` is what makes slot-level traversal
annotation possible without changing the `Edge` class.

#### Derived fragment

A fully projected anatomy is mechanically equivalent to a GraphQL fragment.
The derivation below is the consumption contract a renderer implements; it is
walked on the `entity-card` example (`examples/yaml/entity-card.anatomy.yaml`).

1. The root's `on` becomes the fragment's type condition:
   `fragment EntityCardAnatomy on Component`.
2. Each node `field` becomes a selection in the current scope, expanding dot
   paths into nested selections: `_meta.title` → `_meta { title }`.
3. Each relation `field` becomes a nested selection that shifts the scope for
   the child subtree. If the SDL types the field as a connection, the
   consumer inserts the `edges { node { … } }` unwrapping — the anatomy never
   spells it (mechanism-blindness); a plain list or object field nests
   directly.
4. Each child or switch-case `on` differing from the scope's type becomes an
   inline fragment: `... on Pattern { … }`.
5. Nodes and relations without projections contribute no selections —
   structure-only positions are invisible to the fragment.

Applied to `entity-card`:

```graphql
fragment EntityCardAnatomy on Component {
  _meta { title }                        # header node
  summary                                # summary text node
  documentationStages {                  # tags relation (connection per SDL)
    edges { node { _meta { title } } }   #   chip node, traversed scope
  }
  variants {                             # switch relation (interface-typed)
    edges { node {
      ... on Component { _meta { title } }   # variant case
      ... on Pattern   { _meta { title } }   # pattern case
    } }
  }
}
```

The derivation is deterministic, so a consumer can generate fragments from
anatomies at build time (the Relay-compiler moment) or interpret them at
runtime; both read the same triples.

### 3.11 Prop

A **pinned prop value**: the anatomy fixes one prop of the referenced
component at this tree position. Authored as a flat map on a named node:

```yaml
node:
  uri: global.component.icon
  props:
    icon: chevron-down
```

| Aspect  | Rule                                                                   |
|---------|------------------------------------------------------------------------|
| Keys    | Prop names as defined on the component in the design system ontology (camelCase). |
| Values  | Scalars (string, number, boolean), coerced to strings. No token paths, no fallback arrays — pins are values, not styles. |
| Nodes   | Named nodes only. Anonymous nodes have no prop surface; `props` under a `role` node MUST be rejected. |

**Definition vs pinning.** The DSL never *defines* a prop surface — a
component's prop names, types, and optionality live in the design system
ontology (`ds:hasProperty`). A pin *asserts one value at one position*.
Whether the pinned prop exists on the component, and whether the value is
admissible (e.g. a glyph name present in the icon set), are consumer-side
checks against the design system graph — the same enforcement posture as the
projection rules in §3.10, which check against the provider SDL.

**Icons are the canonical pinning case.** The design system models the icon
as a component whose glyph is a required prop
(`ds:global.component.icon` › `ds:hasProperty [ ds:name "icon" ]`), so icon
usage in anatomies splits into exactly two cases and needs no icon-specific
construct:

| Case | Authoring |
|------|-----------|
| Consumer-filled icon slot (e.g. Button's `slotName: icon`) | Icon-component edge with a slot and **no pin** — the consumer chooses the glyph. |
| Component-intrinsic icon (accordion chevron, modal close ×, status glyphs) | Icon-component node with `props: { icon: … }` — the spec fixes the glyph. |

**Static by design.** A data-driven value is a [projection](#310-projection)
(`projection: { field: … }`); a state-driven one is a
[switch](#10-switch-construct) whose cases pin different values. Pins never
vary at runtime.

In Turtle, pins reify like styles, with an explicit type so `PropShape`
targets them:

```turtle
:hasProp
    [ a :Prop ; :propName "icon" ; :propValue "chevron-down" ]
```

### 3.12 Token binding

A **consumed symbol**: the anatomy states, per slot and per state, which token
symbols the implementation reads there and in what order it falls back through
them. Authored as an ordinary style value — there is no binding construct:

```yaml
node:
  uri: global.component.button
  styles:
    typography.color: [modifier.color.text, color.text]
```

| Aspect | Rule |
|---|---|
| Keys | One member of the closed roster in `definitions/registry.ttl`. |
| Values | A symbol, a primitive, or a list that is the fallback order — symbols with at most one primitive, and only as the last element. |
| Symbols | The `dt:` symbol's own dotted name, verbatim: `color.text`, `dimension.100`, `typography.weight.semiBold`. camelCase segments are the symbol's spelling and are not renamed. |
| Channels | A channel is a symbol like any other: `modifier.color.text`, `surface.color.background`. The anatomy consumes it by name where the implementation reads the channel, and the semantic token by name where it reads the token. Nothing is inferred from the spelling. |
| Order | The list is the fallback order: element 1 is the primary symbol, each next is what the implementation falls back to when the one before is undefined. |
| Literals | A terminal literal the chain ends in (`currentColor`, `0`, `2px`) is kept as the last element. It is not a symbol and is consumed by nothing. |

**Definition versus binding.** The DSL never *defines* a token — a symbol's
value, its coverage and its resolved values at each coordinate live in the
token graph (`@canonical/token-ontology`, strata S1–S4). A binding *asserts
which symbols one slot consumes*. Two consequences follow. Whether a symbol
exists at all is not asked here: a name no stratum declares is kept as
consumed, with a comment and a row in the corpus's register, because the
programme represents what the implementations do and takes no new token
decisions. And whether the symbol is *appropriate* for the key is the
registry's `anatomy:tokenNamespace`, which is a declaration and not a
derivation.

**Consumer-side validation.** The same posture as [§3.10](#310-projection)'s
projections and [§3.11](#311-prop)'s pins. This package checks the form: the
grammar, the closed key roster, the shape of the `anatomy:consumes` list, and
that the retired notation cannot reach the graph. A consumer holding the token
graph checks the facts:

| Check | Who | Outcome |
|---|---|---|
| the value parses, the key is in the roster | this package | parse error, or a SHACL violation |
| every element of `consumes` is a `dt:` symbol IRI | this package (SHACL) | violation |
| a token-kind key consumes at least one symbol | this package (SHACL) | violation |
| the symbol RESOLVES in S1 or S2 | the consumer | a finding, unless the register admits it |
| the symbol is inside the key's `tokenNamespace` | the consumer | a finding, unless the register admits it |
| a state's value differs from its base state's | the consumer | a **lint**: reported with its ranks, never rejected |

**The worked case.** Button's root reads, in the reference implementation:

```css
.ds.button {
  color: var(--modifier-color-text, var(--button-color-text));
}
:root {
  --button-color-text: var(--color-text);
}
```

Two names, one chain: the text *channel* first — through which the anticipation
and emphasis families reach the component without it knowing their members —
then the plain text token. The component-local `--button-color-text` is
followed through its own definition and replaced by what it consumes. So the
anatomy says:

```yaml
typography.color: [modifier.color.text, color.text]
```

and that is correct at every importance, because the channel is what the slot
reads; which symbol the channel is *worth* under a given importance is the
platform's business, not the anatomy's. A single symbol per key could not
carry this, and a fallback declared once on the channel could not either:
Button's background and Button's text fall back differently.

In Turtle, the seam is an ordered `rdf:List` on the style tuple, beside the
authored spelling it was lifted from:

```turtle
:hasStyle
    [ a :Style ;
      :styleKey "typography.color" ;
      :styleValue "[modifier.color.text, color.text]" ;
      :consumes ( dt:modifier.color.text dt:color.text ) ]
```

`:styleValue` keeps the authored spelling verbatim, as the evidence of what
the reference says — it is where a terminal literal lives, since a literal is
not a symbol — and `:consumes` is the form a query can walk. The design system
graph reifies the same fact one record per symbol per rank
(`ds:TokenBinding`, `ds:consumesSymbol`, `ds:rank`), which is what answers
"which symbols does this component consume, and which arrive through a
subcomponent".


---

## 4. URI Encoding Convention

URIs follow Turtle-inspired conventions with dot-separated paths.

| Symbol | Meaning                              | Example                           |
|--------|--------------------------------------|-----------------------------------|
| `.`    | Path hierarchy                       | `global.component.button`         |
| `_`    | Word boundary (from PascalCase)      | `CardHeader` -> `card_header`     |
| `-`    | Compound name (from dot in label)    | `Card.Header` -> `card-header`    |

### Examples

| Component      | URI                                  |
|----------------|--------------------------------------|
| Button         | `global.component.button`            |
| Accordion.Item | `global.subcomponent.accordion-item` |
| CardHeader     | `global.subcomponent.card_header`    |

### Parent Reference in Subcomponents

Subcomponents MUST reference their parent in the name:

| Labelled Name        | Turtle URI                                  |
|----------------------|---------------------------------------------|
| Timeline.Item        | `global.subcomponent.timeline-item`         |
| Accordion.ItemHeader | `global.subcomponent.accordion-item_header` |

---

## 5. Symbols and the Value Grammar

A **symbol** is the name of a token in the token graph, written in the
symbol's own dotted spelling and nothing else: no slash paths, no marker, no
prefix that means something the reader has to know. The grammar below runs
over the **parsed document** — a scalar, or a sequence of scalars — and never
over raw text.

```ebnf
Binding    = Key ("@" State)? Value       ; a mapping entry: the key scalar, then the value node
Key        = Path                         ; the registry closes the roster (§3.7)
State      = "hover" | "active" | "focus" | "disabled" | "selected"
           | "expanded" | "indeterminate" | "invalid"
Value      = Symbol | Primitive | List
List       = Symbol+ (Symbol | Primitive) ; a sequence of two or more scalars, in fallback order
Symbol     = Path
Path       = Namespace ("." Segment)+
Namespace  = [a-z]+                       ; color, spacing, dimension, typography, modifier, surface
Segment    = [A-Za-z0-9]+                 ; text, focusRing, 100
Primitive  = Keyword | Number | Dimension | Color | Quoted
Keyword    = [a-zA-Z]+ ("-" [a-zA-Z]+)*   ; currentColor, inherit, auto, flow, not-allowed, space-between
Number     = "-"? [0-9]+ ("." [0-9]+)?    ; 0, 1.6, 600
Dimension  = Number ([a-z]+ | "%")        ; 2px, 1s, 0.25ch, 0%
Color      = "#" [0-9a-fA-F]{3,8}         ; #ccc
Quoted     = any other text               ; "1 / -1", "*" — a literal holding a space or a slash
```

### Examples

| Value | Reads as |
|---|---|
| `color.text` | one symbol |
| `dimension.100` | one symbol; a numeric segment is a segment |
| `typography.weight.semiBold` | one symbol; camelCase is the symbol's own spelling |
| `modifier.color.text` | one symbol — a channel, consumed by name |
| `[modifier.color.text, color.text]` | two symbols, in fallback order |
| `[modifier.color.icon, modifier.color.text, currentColor]` | two symbols and the literal the chain ends in |
| `flow` | one primitive, for a key whose `valueKind` admits one |
| `"1 / -1"` | one primitive: a literal holding a slash is a literal, not a path |

**A key and a symbol are one shape.** Both are a `Path`; the registry tells
them apart, which is why neither needs a sigil.

**Classification is by shape, not by quoting.** A scalar satisfying `Path` is
that symbol however it was written; one satisfying no primitive form either is
`Quoted` — which is what a literal tail holding a space or a slash needs. So
`"1 / -1"` is a primitive whether or not YAML required the quotes.

**A primitive may stand alone** only for a key the registry says takes one,
and **may end a list** for any key that takes a token, where it is the
terminal fallback the implementation writes last. It may not appear anywhere
else: a primitive before the end of a list is a parse error, because the
sequence is a fallback order and a literal resolves against nothing.

**Rejections.** Each is a typed error naming the value and the rule:

| Value | Rule |
|---|---|
| `spacing/medium`, `color/focus-ring` | the slash-delimited path is retired (§12) |
| `color.surface.button?`, `color/surface/button?` | the trailing `?` marker is retired (§12) |
| `$root`, `color.$root.text`, `color.root.text` | `root` and `$root` are not value segments |
| `[2px, dimension.stroke.thickness.large]` | a primitive may only end a value |
| `[color.text]` | a sequence is a fallback order and needs two or more elements |

A value that satisfies the grammar may still be a **placeholder**: a segment
in `definitions/style-keys.yaml`'s `placeholders` list (`sth`, `tbd`, `xxx`,
`todo`) makes `dimension.radius.sth` parse and then fail the corpus's second
check, which removes the binding and registers it. The list is data, not a
rule in the parser.

**One lift, shared.** `liftSymbols(value)` returns the symbols in fallback
order and is exported, so every consumer lifts identically;
`definitions/lift.fixture.json` is the committed case list both this package
and design-system assert against.

---

## 6. Cardinality Notation

Cardinality values follow standard data modelling notation:

```
cardinality = exact | range
exact       = digit+
range       = digit+ ".." ( digit+ | "*" )
```

| Value    | Meaning                |
|----------|------------------------|
| `"1"`    | Exactly one (required) |
| `"0..1"` | Zero or one (optional) |
| `"0..*"` | Zero or more           |
| `"1..*"` | One or more            |
| `"2..5"` | Between 2 and 5        |

Cardinality values MUST be quoted strings in YAML to avoid parsing ambiguity.

---

## 7. Slot Mapping

The `slotName` field on a relation maps content to a named slot in the parent component.

| Value       | Meaning                                                                 |
|-------------|-------------------------------------------------------------------------|
| `"default"` | Main content slot (`children` in React, default slot in Vue).           |
| `"header"`  | Header slot.                                                            |
| `"footer"`  | Footer slot.                                                            |
| `"icon"`    | Icon placement.                                                         |
| `"label"`   | Text label.                                                             |
| *(custom)*  | Any application-specific slot name.                                     |

When `slotName` is omitted, the edge does not target a specific named slot.

---

## 8. Named vs Anonymous Rule

| Type      | Identifier | Use Case                                                    |
|-----------|------------|-------------------------------------------------------------|
| Named     | `uri`      | User-instantiable components (things users compose in code) |
| Anonymous | `role`     | Internal structural elements not directly instantiated      |

**Rule of thumb**: Ask "Can/should a user write `<ComponentName>` in their code?" If yes, use `uri`. If no, use `role`.

---

## 9. DRY Principle for Named Nodes

When a node has a URI, it references its own anatomy file. Do not inline the full tree — reference the URI only. This keeps anatomy files focused and avoids duplication.

```yaml
# Correct: reference only
edges:
  - node:
      uri: global.component.button
    relation:
      cardinality: "1"

# Incorrect: inlining full definition
edges:
  - node:
      uri: global.component.button
      styles:
        # ... full button styles duplicated here
      edges:
        # ... full button edges duplicated here
    relation:
      cardinality: "1"
```

---

## 10. Switch Construct

The `switch` construct models positions in the anatomy tree that can be filled by one of several alternatives. It operates at the edge level, parallel to `node`, making polymorphism explicit in the structure.

### Syntax

```yaml
edges:
  - switch:
      on: <discriminator>
      cases:
        - uri: <component-uri>
        - uri: <component-uri>
    relation:
      cardinality: <cardinality>
      slotName: <slot>
```

### 10.1 Discriminator Vocabulary

| Value      | Meaning                                  | Use Case                                                   |
|------------|------------------------------------------|------------------------------------------------------------|
| `props`    | Consumer chooses via component props     | `<Field type="checkbox">` renders Checkbox vs Radio        |
| `internal` | Component manages choice internally      | AsyncButton shows Loading/Success/Error based on state     |
| `override` | Consumer can replace with custom component | Timeline accepts custom Event component via slot         |

### 10.2 Shorthand Expansion

The shorthand `- uri: X` expands to `- node: { uri: X }`. This allows cases to be expressed concisely when no additional metadata is needed, while permitting full node definitions when case-specific styles or nested edges are required.

```yaml
# Shorthand (common case)
cases:
  - uri: global.component.checkbox

# Expands to full form
cases:
  - node:
      uri: global.component.checkbox
```

When a case requires additional properties:

```yaml
cases:
  - node:
      uri: global.component.textarea
      styles:
        size.height: hug
        size.min.height: dimension.1600
```

### 10.3 Reserved URI: $custom

The `$custom` URI is a reserved value indicating that the position accepts a user-provided component. This keeps case entries uniform under the `uri` key while signalling extensibility points.

```yaml
cases:
  - uri: global.subcomponent.timeline-event
  - uri: $custom
```

---

## 11. The Fallback List

**The list is the value form, not a special case of it.** A style value is a
symbol, a primitive, or a list; where it is a list, the list *is* the fallback
order — a one-to-one transcription of the implementation's own `var()` chain.

```yaml
styles:
  typography.color: [modifier.color.text, color.text]
```

which the reference writes as
`color: var(--modifier-color-text, var(--color-text))`. Element 1 is the
primary symbol; each next is what the implementation falls back to when the
one before it is undefined. A terminal literal stays as the last element:

```yaml
  typography.color: [modifier.color.icon, modifier.color.text, currentColor]
```

Three reasons the list is the form rather than an option:

1. **The fallback is a per-slot choice.** Button's background falls back
   through the primary-foreground channel to the primary foreground token; its
   text falls back through the text channel to the plain text token; its
   border falls back to a *highlighted* border that itself falls back to the
   plain one. No rule declared once on a symbol can carry that, because the
   slots differ.
2. **Some slots consume a channel and some the token.** Button's root colour
   reads the text channel; its `.link` variant reads no channel at all.
   Whether a slot subscribes to a family is a fact about the slot, and only
   the anatomy can state it.
3. **The chain is the information.** An implementation generated or checked
   from the anatomy must be able to write
   `var(--modifier-color-text, var(--color-text))` from what the anatomy says,
   `currentColor` included where the reference has it.

In the graph the list becomes `anatomy:consumes`, an ordered `rdf:List` whose
head is the primary symbol; `anatomy:styleValue` keeps the authored spelling
beside it. See [§3.12](#312-token-binding).

---

## 12. Retired Notation

Three notations this reference described before 0.4.0 are **retired**, and
each is now a parse error and a SHACL violation. They are listed so a reader
of an older anatomy knows what they are looking at.

| Retired | Example | What to write | Why |
|---|---|---|---|
| The slash path | `spacing/medium` | the symbol's dotted name, `spacing.gap.field.block` | The paths named no symbols. Checked against the token graph, `color/fill/default` matched nothing, `spacing/small` matched nothing, `radius/button` matched nothing: the anatomy spoke a parallel vocabulary and nothing caught it. |
| The optional marker | `color/surface/button?` | the symbol the implementation reads; a name no stratum declares is not written at all, and a `#` comment on the line records it | A sigil that means "may be undefined in some themes" is a rule the reader has to memorise, and it stated an exception in a place no validator could reconcile with the list of exceptions. |
| The `$root` segment | `color/surface/$root` | the dotted name without it | It was an artefact of the token files' own shape, not part of a symbol's name. |

**The kebab-to-dotted bridge.** An older value migrates by splitting on `/`,
dropping a trailing `root` or `$root`, stripping a trailing `?`, camelCasing
each kebab segment (`focus-ring` → `focusRing`) and joining with `.`. Where
the result is a symbol the token graph declares, that is the value; where it
is not, a correspondence table decides, and nothing is substituted merely to
make a name resolve.

**What replaces the marker.** The question the `?` tried to answer — "is this
value guaranteed to exist?" — is a **query over the token graph**, not an
annotation on the value. A symbol's coverage is S2's (`dt:covers`: which
families provision it, at which coordinates) and its resolved values are S3's
(one row per symbol per coordinate per mode). So:

- *does this symbol exist?* — is it a `dt:TokenSymbol` in S1, or a channel
  minted in S2;
- *is it worth anything under this modifier?* — has S3 a resolved value for
  it at that coordinate;
- *which families reach this slot?* — follow the consumed channel's
  `dt:channelOf` to its base symbol, then S2's coverage.

None of those is a fact the anatomy could have carried, and all of them are
answerable now that the value names a symbol. Where a name resolves nowhere at
all it is kept as consumed, with a comment and a row in the corpus's committed
register — regenerated by a validator from what fails to resolve, so the
exceptions and the document that lists them cannot drift apart without a diff
saying so.

---

## 13. Examples

The nine examples ship with the package, as a YAML file and the Turtle it
transforms to:

```
examples/yaml/<name>.anatomy.yaml     the anatomy
examples/turtle/<name>.ttl            the emission, regenerated by `bun run generate goldens`
```

They are **corpus, not decoration**: the round-trip test reads them
byte-for-byte, the SHACL run validates them against the shapes and the
registry, and every symbol they consume is asserted to resolve in the token
graph's S1 or S2. That is also why they are not copied into this document —
the pair is generated, and a third copy in prose would be a second statement
of one notation, which is the drift this release exists to end. Read them in
the repository; the worked case below is the one exception, because
[§3.12](#312-token-binding) argues from it.

| Example | Reference | Demonstrates |
|---|---|---|
| `accordion` | `react/ds-global` `Accordion` | nested named nodes at three depths, a repeating child (`1..*`), a surface fallback, `motion.*` bindings |
| `card` | `react/ds-global` `Card` | four subgrid sections, a three-slot `border` split into width, style and colour, a quoted grid-line literal, an anonymous node |
| `stateful-button` | `react/ds-global` `Button` | `@state` keys across default/hover/active/focus/disabled, three-rank chains, two channels then `currentColor` |
| `field` | — | a `props` switch with URI-shorthand cases |
| `async-button` | — | an `internal` switch with four cases |
| `timeline` | — | an `override` switch with the reserved `$custom` |
| `input-group` | `react/ds-global-form` `TextArea` | a switch with mixed cases, and a token-kind key that admits no bare primitive |
| `entity-card` | — | projections on nodes, relations and switch cases, beside style bindings |
| `status-header` | — | pinned props (intrinsic icons), a status switch, an unpinned consumer-filled slot |

### The worked case: Button's root and icon

The anatomy (`examples/yaml/stateful-button.anatomy.yaml`, abridged):

```yaml
---
node:
  uri: global.component.button
  styles:
    layout.type: inline-flex
    interaction.cursor: pointer
    interaction.cursor@disabled: not-allowed
    appearance.background: [modifier.color.foreground.primary, color.foreground.primary]
    appearance.border.color: [modifier.color.border, color.border.highlighted, color.border]
    typography.color: [modifier.color.text, color.text]
    typography.color@disabled: color.text.disabled
    spacing.internal.inline.start: spacing.inset.action.inline
    appearance.outline.color@focus: [modifier.color.focusRing, color.focusRing, currentColor]
  edges:
    - node:
        uri: global.component.icon
        styles:
          typography.color: [modifier.color.icon, modifier.color.text, currentColor]
      relation:
        cardinality: "0..1"
        slotName: icon
```

and what it emits, for the root's colour and the icon's:

```turtle
@prefix : <https://anatomy.canonical.com/> .
@prefix dt: <https://dt.canonical.com/> .

[ a :Style ; :styleKey "typography.color" ;
  :styleValue "[modifier.color.text, color.text]" ;
  :consumes ( dt:modifier.color.text dt:color.text ) ]

[ a :Style ; :styleKey "typography.color" ;
  :styleValue "[modifier.color.icon, modifier.color.text, currentColor]" ;
  :consumes ( dt:modifier.color.icon dt:modifier.color.text ) ]
```

The icon's terminal `currentColor` is in the spelling and in neither of the
consumed symbols, which is the division of labour the two terms exist for.

### Projections gallery

Each entry shows the authored YAML, the emitted Turtle for the interesting
subtree (produced by `anatomyToTTL`, elided to the relevant blank node), and
the fragment selection it derives. Type and field names reference the prism
provider schema.

#### Leaf field

The header renders the entity's total title; `cardinality: "1"` is sound
because `_meta.title` is total in the contract (see the cardinality mapping
in §3.10).

```yaml
- node:
    uri: global.subcomponent.entity-card-header
    projection:
      field: _meta.title
  relation:
    cardinality: "1"
    slotName: header
```

```turtle
:edgeTarget [
    a :NamedNode ;
    :uri "global.subcomponent.entity-card-header" ;
    :hasProjection [ a :Projection ; :projectionField "_meta.title" ]
] ;
:hasRelation [ a :Relation ; :cardinality "1" ; :slotName "header" ]
```

Derives: `_meta { title }`.

#### Type condition and field together

The node renders a field *and* asserts the type of what it renders — the
combined form every switch case uses.

```yaml
- node:
    uri: global.component.badge
    projection:
      on: Tier
      field: tier
  relation:
    cardinality: "0..1"
    slotName: badge
```

```turtle
:hasProjection [ a :Projection ; :projectionType "Tier" ; :projectionField "tier" ]
```

Derives: `tier { … }` with the child scope typed `Tier`. Note `0..1`, not
`1`: `Component.tier` is nullable, and the lower bound maps to nullability.

#### Connection traversal filling a slot

The relation names the connection field; each traversed entity binds one
chip. The anatomy never spells `edges.node`.

```yaml
- node:
    uri: global.component.chip
    projection:
      field: _meta.title      # relative to the traversed Tag
  relation:
    cardinality: "0..*"
    slotName: tags
    projection:
      field: documentationStages
```

```turtle
:hasRelation [
    a :Relation ;
    :cardinality "0..*" ;
    :slotName "tags" ;
    :hasProjection [ a :Projection ; :projectionField "documentationStages" ]
]
```

Derives: `documentationStages { edges { node { _meta { title } } } }` — the
unwrapping comes from the SDL typing the field as a connection, not from the
anatomy.

#### Singular traversal

An object field, not a connection: same construct, singular cardinality.

```yaml
- node:
    uri: global.component.link
    projection:
      field: _meta.title
  relation:
    cardinality: "0..1"
    slotName: parent
    projection:
      field: superclass
```

Derives: `superclass { _meta { title } }`.

#### Plain-list traversal

Identical authoring to the connection case — `Component.properties` is
`[Property!]!` in the prism SDL, so the consumer nests directly with no
unwrapping. The anatomy is unchanged if the provider later promotes the list
to a connection (mechanism-blindness, §3.10).

```yaml
- node:
    role: property row
    projection:
      field: _meta.title
  relation:
    cardinality: "0..*"
    projection:
      field: properties
```

Derives: `properties { _meta { title } }`.

#### Nested traversals

A child inherits the traversed scope, narrows it, and traverses again — a
recursive view over the class hierarchy.

```yaml
node:
  uri: global.component.class-tree
  projection:
    on: OntologyClass
  edges:
    - node:
        uri: global.subcomponent.class-tree-item
        projection:
          on: OntologyClass
          field: _meta.title
        edges:
          - node:
              role: instance row
              projection:
                field: _meta.title
            relation:
              cardinality: "0..*"
              projection:
                field: instances
      relation:
        cardinality: "0..*"
        slotName: children
        projection:
          field: subclasses
```

Derives:

```graphql
fragment ClassTreeAnatomy on OntologyClass {
  subclasses {
    _meta { title }
    instances { edges { node { _meta { title } } } }
  }
}
```

For switch cases narrowing an interface-typed traversal into inline
fragments, see `examples/yaml/entity-card.anatomy.yaml` and step 4 of the
derivation in §3.10.

---

## 14. TypeScript Definitions

The complete type system expressed as TypeScript interfaces.

```typescript
// ─── Value Types ────────────────────────────────────────────────

/**
 * The dotted name of a token symbol, verbatim: "color.text",
 * "dimension.100", "modifier.color.text". A channel is a symbol like any
 * other. Whether the token graph declares it is a consumer-side check.
 */
type Symbol = string;

/**
 * A literal the implementation writes as it stands: a CSS-wide keyword, a
 * number, a dimension, a colour, or any other text. It resolves against
 * nothing by design.
 */
type Primitive = string | number;

/**
 * One member of the closed roster in definitions/registry.ttl. Same shape as
 * a symbol — a lowercase namespace then one or more segments — because the
 * registry is what tells the two apart.
 */
type StyleKey = string;

/**
 * A symbol, a primitive, or a sequence that is the fallback order: symbols
 * with at most one primitive, and only as the last element.
 */
type StyleValue = Symbol | Primitive | (Symbol | Primitive)[];

/**
 * Platform-agnostic style properties. A key MAY carry an interaction-state
 * marker: "appearance.background@hover". The unmarked key is the default
 * state.
 */
type Styles = Record<StyleKey, StyleValue>;

// ─── Projection ─────────────────────────────────────────────────

/**
 * Fragment-style binding of a node to graph data.
 * At least one of `on` / `field` is required.
 */
type Projection =
  | { on: string; field?: string }
  | { on?: string; field: string };

/**
 * Traversal populating a slot. The field is required; target typing
 * lives on the child node's own `on`, never on the relation.
 */
interface RelationProjection {
  field: string;
}

// ─── Relation ───────────────────────────────────────────────────

interface Relation {
  /** Instance count constraint (e.g. "1", "0..1", "1..*"). */
  cardinality: string;

  /** Target slot in the parent component. */
  slotName?: string;

  /** Traversal populating the slot. */
  projection?: RelationProjection;
}

// ─── Nodes ──────────────────────────────────────────────────────

interface BaseNode {
  /** Graph-data binding. */
  projection?: Projection;

  /** Style properties using CTI-inspired keys. */
  styles?: Styles;

  /** Child nodes and their relationships. */
  edges?: Edge[];
}

/**
 * Pinned prop values: the anatomy fixes props of the referenced component
 * at this position. Keys are prop names defined on the component in the
 * design system ontology; values are scalars. Named nodes only.
 */
type Props = Record<string, string | number | boolean>;

/** Identifiable component in the design system. */
interface NamedNode extends BaseNode {
  /** Unique identifier (e.g. "global.component.button"). */
  uri: string;

  /** Pinned prop values (e.g. { icon: "chevron-down" }). */
  props?: Props;
}

/** Structural element without design system identity. */
interface AnonymousNode extends BaseNode {
  /** Human-readable description of the node's purpose. */
  role: string;
}

type Node = NamedNode | AnonymousNode;

// ─── Switch ─────────────────────────────────────────────────────

/**
 * Discriminator types for switch construct.
 * - props: Consumer chooses via component props.
 * - internal: Component manages choice internally.
 * - override: Consumer can replace with custom component.
 */
type SwitchDiscriminator = "props" | "internal" | "override";

/** A case in a switch construct. */
interface SwitchCase {
  /** Shorthand for node.uri. */
  uri?: string;

  /** Full node definition (expanded form). */
  node?: Node;
}

/** Polymorphic position in the anatomy tree. */
interface Switch {
  /** What determines which case applies. */
  on: SwitchDiscriminator;

  /** Available alternatives. */
  cases: SwitchCase[];
}

// ─── Edge ───────────────────────────────────────────────────────

interface Edge {
  /** Single node (mutually exclusive with switch). */
  node?: Node;

  /** Polymorphic alternatives (mutually exclusive with node). */
  switch?: Switch;

  /** Relationship metadata. */
  relation: Relation;
}

// ─── Root ───────────────────────────────────────────────────────

/** Root of an anatomy file. Top-level node must be named. */
interface AnatomySpec {
  node: NamedNode;
}
```

---

## 15. Deferred Items

| Item                 | Description                                                                        |
|----------------------|------------------------------------------------------------------------------------|
| A JSON Schema for the YAML | `schemas/anatomy-dsl.schema.json` was DELETED in 0.4.0: it documented the retired notation — the slash path, the `?` marker — and an open key vocabulary, so the package would have shipped two contradictory statements of one notation. Generating a replacement from §5's grammar and the registry's roster is deferred until a consumer needs one. |
| Pseudo elements      | No grammar construct: there is no pseudo-element type, and no field that records which pseudo-element a node is. The part itself is NOT deferred — it is modelled, by convention, as an anonymous role node carrying a `# drawn as ::before` note, and the authored corpus does it that way. What a first-class construct would add is machine-readability of that note. |
| Portal nodes         | Representation of related nodes displayed in portals.                              |
| Conditional display  | Representation of conditionality in display.                                       |
| Style inheritance    | Inheritance reference for styles (e.g. "NetworkCard" inherits styles from "Card"). |

---

## 16. References

- [Relay GraphQL Connection Specification](https://relay.dev/graphql/connections.htm) — inspiration for the reified edge/connection pattern
- [Relay Fragment Colocation](https://relay.dev/docs/guides/fragment-composition/) — inspiration for the projection construct
- [Open UI W3C Working Group](https://open-ui.org/) — code-based anatomy for component specifications ([example](https://open-ui.org/components/select/))
- Nathan Curtis — ["Components as Data"](https://medium.com/eightshapes-llc/components-as-data-6e5fc295e30d)
- [W3C Design Token Format](https://design-tokens.github.io/community-group/format/) — token naming conventions
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) — normative language keywords (MUST, SHOULD, MAY)
- [Wikipedia: Cardinality (data modeling)](https://en.wikipedia.org/wiki/Cardinality_(data_modeling))
