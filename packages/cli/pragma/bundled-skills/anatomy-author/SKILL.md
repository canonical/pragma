---
name: anatomy-author
description: Write component anatomy specifications using the Design System Anatomy DSL; also runs as a guided tutorial on a worked example
---

# Anatomy Author

Write component anatomy specifications using the Design System Anatomy DSL. This skill combines semantic discovery (understanding existing components) with procedural authoring (creating well-formed YAML specifications).

## When to Use

- Writing anatomy specifications for new or existing components
- Documenting component structure before implementation
- Discussing component composition with the team ("these nodes should be siblings, not parent-child")
- Auditing a codebase against its specifications
- Supporting code generation from specifications
- Serving as step 7 of the `specify-component` flow (and of `specify-pattern`)

## Description

The Anatomy DSL represents design system components as YAML trees with:
- **Named nodes**: Components with URIs (`global.component.button`)
- **Anonymous nodes**: Structural elements with roles (`content wrapper`)
- **Edges**: Parent-child relationships with cardinality and slot names
- **Styles**: Platform-agnostic properties using CTI-inspired keys

This skill helps you author these specifications correctly and consistently.

## Working mode: assistant to a design authority

Most of the time this skill runs in collaboration with a senior designer or engineer —
they are the design authority, you are the assistant whose job is to make them
successful. Default to that mode: lay out where the flow stands, do the legwork
(discovery queries, template drafting, validation) and return digestible findings, and
bring structural decisions to the person as a recommendation plus a question rather
than a fait accompli. An anatomy encodes opinions the graph cannot settle alone —
draw the person's knowledge out and use it.

Full autonomy is the exception, not the default: run the whole flow alone only when
explicitly asked to. Even then, list every judgment call made unilaterally in the
final report so a human can revisit them.

Decision gates — in collaboration, pause at each and resolve it WITH the person:

1. Node boundaries: what is a named subcomponent vs. an anonymous structural role.
2. Slot names — they become API surface.
3. Cardinality choices, especially optional vs. required parts.
4. What the anatomy fixes vs. what is deliberately left free.

The full specification ships beside this file as `ANATOMY_DSL_SPEC.md` in the
installed skill folder — `pragma skill lookup anatomy-author` renders only this
SKILL.md, so open the sibling file directly when you need the complete spec (the
appendix below carries its type system).

## Opening move: ask, or offer the tutorial

Activation is an opening, not a starting gun. Unless the first message already names
the work, ask for the starting point — as a suggestion carrying an example, not as a
form to fill in:

> To get started, tell me the component whose anatomy we're writing — a name if it is
> already in the graph, or just a sketch of its parts, like "a card with an image, a
> title and a row of actions".

A sketch is enough to begin: discovery turns it into the real node set, and the sketch
is what you check that set against. Ask again only for what the next step genuinely
blocks on.

If the activation message already carries the starting point, do not re-ask — say what
you took it to be, and go.

Offer the tutorial in the same breath, because this skill doubles as one:

> Or if you'd rather see the flow first, I can run it as a tutorial: I'll take a
> plausible example — a card, say — and walk you through it from discovery to the
> emitted anatomy.

Tutorial mode is the step narration below, turned up: the same outcome-path-conclusion
frame, with the reasoning at each decision gate made fully explicit and a check that
the person is with you before the next step. Stop short of anything that lands — no
anatomy written into the graph, no file committed — unless they ask to keep what you
built.

## Every step is narrated: outcome, path, conclusion

Every step is addressed to the person — once before it runs, once when it ends. This is
not tutorial manner. It holds in the ordinary flow too: the person is the design
authority, and they can only steer a step they saw coming. A decision gate met cold is
a decision they cannot really make.

**Open** the step with what it is FOR — the outcome it should leave behind — and how
you are about to get there. **Close** it with a sentence saying what it established and
what that means for the step after. One sentence each is enough; the failure mode is
silence, not length, and a step whose outcome looks obvious still gets its sentence
rather than a shrug.

Do:

> **Discovery, before any DSL.** The outcome is the component's real context — what it
> is composed of, and what already names its parts — so the anatomy describes the
> system instead of inventing beside it. The path is `pragma block lookup Card`, then
> the subcomponent query below.
>
> …
>
> So: Card already carries a named `Card-Header` subcomponent and no named body — the
> anatomy inherits the first and has to decide the second, which is the first
> structural gate.

Don't:

> Discovery
>
> Card exists. Has Card-Header. No body node.

Both carry the same facts. Only the first says what the step was trying to achieve and
what it settled — and only the first lets the person cut in with the thing they know
and the graph does not, which is the whole reason they are here.

## Asked about the skill: methodology and outcomes first

A question about what this skill does — what it covers, what its steps are, how it
works — is answered in that order: the METHOD it applies and the OUTCOMES it leaves
the person holding come first, the step-by-step breakdown comes after.

Two or three sentences of method is enough: what the skill treats as its object, the
discipline that makes it work, and what exists at the end that did not exist before.
The enumeration then reads as steps in service of something, rather than as a list to
be got through.

What this prevents is a table of contents standing in for an answer. A reply opening
with the step names tells someone who already knows the skill nothing new, and someone
who does not, nothing at all.

So, asked what this skill is:

> It writes component anatomies in the Anatomy DSL, combining semantic discovery —
> understanding what the graph already names — with procedural authoring. The
> structural choices are the substance: node boundaries, cardinality, and slot names,
> which become API surface. You end holding a well-formed anatomy whose every
> deliberate decision is one someone can revisit.

Then, and only then, the breakdown.

## Anatomy falls under standards too

Emitted anatomy is Turtle, and Turtle has standards — the `turtle` category, with
`ui-blocks` governing block modelling (take the actual set from
`pragma standard categories`, not from this list). Pull them before authoring and hold
the Do/Don't pairs open while writing the DSL and its emitted TTL; a deviation from a
pulled standard is RECORDED next to the anatomy, ideally also filed as an issue. The
standards apply independent of any package dependency and are open to contribution:
a missing or wrong modelling rule is something to propose a change for, not to
silently work around.

## Discovery Flow

Before writing an anatomy, understand the component's context:

```bash
pragma block list                               # every component, pattern, layout and subcomponent, with its type and tier
pragma block lookup Card                        # full spec: anatomy, modifiers, properties (MCP: block_lookup)
pragma graph inspect ds:global.component.card   # every triple on the entity
```

A bare name can match blocks in several tiers, and `block lookup` silently picks one —
it resolves `ds:name` globally and cannot be steered to a tier.
Confirm the tier the lookup picked from its own `- Tier:` line; the name query below lists every tier that carries the name.
The name query in Workflow §1 is the one that lists them, with each block's IRI. If the
lookup picked the wrong tier's block, read the block you want with
`pragma graph inspect <IRI from that row>`, so the lookup step and the inspect step
describe the same block. If the name has no row at all, the block may be a Group —
`block list` covers no groups; the group pre-step in Workflow §1 lists them.

### Discovery Queries

Common prefixes (`ds:`, `cs:`) are applied automatically — no PREFIX preamble needed.

**Find components by tier:**
```bash
pragma graph query "SELECT ?component ?name WHERE {
  ?component a ds:Component ;
             ds:name ?name ;
             ds:tier ds:global .
}"
```

**Find subcomponents of a component:**
```bash
pragma graph query "SELECT ?sub ?name WHERE {
  ?sub a ds:Subcomponent ;
       ds:name ?name ;
       ds:parentComponent <https://ds.canonical.com/global.component.card> .
}"
```

Inside a SPARQL body, a local name with MORE THAN ONE dot (`ds:global.component.card`)
does not parse — use the full IRI there: join `https://ds.canonical.com/` with the
dotted local name (giving `<https://ds.canonical.com/global.component.card>`), or copy
one from `pragma graph query` output, which prints absolute IRIs. Prefixed names with
no dot (`ds:global`, `ds:Component`) or a single dot (`ds:tag.needsdefinition`) work
as-is.

### The empty-anatomy worklist

The Coda sync emits `ds:anatomyDsl` as an empty string for blocks whose anatomy is not
yet written — this query IS the to-do list; pick from it, never from a copied table:

```bash
pragma graph query "SELECT ?b ?name WHERE { ?b ds:anatomyDsl ?a ; ds:name ?name . FILTER(STR(?a) = '') }"
```

The worklist rows point at blocks whose data lives under `data/` — never hand-edit
that tree: it is regenerated destructively from Coda by CI, and hand edits are
overwritten by the next sync. An authored DSL lands in the block's spec draft under
`specs/` (see `specs/README.md`) or is pasted into Coda by a human.

## DSL Reference

### YAML Format

All anatomy files must start with `---` (YAML document start marker):

```yaml
---
node:
  uri: global.component.button
  # ...
```

### Type System Overview

```
AnatomySpec
  -> node: NamedNode (root must be named)

NamedNode
  -> uri: string ("tier.type.name")
  -> styles?: Record<string, TokenPath | TokenPath[] | PrimitiveValue>
  -> edges?: Edge[]

AnonymousNode
  -> role: string ("content wrapper")
  -> styles?: Record<string, TokenPath | TokenPath[] | PrimitiveValue>
  -> edges?: Edge[]

Edge
  -> node?: NamedNode | AnonymousNode
  -> switch?: Switch (mutually exclusive with node)
  -> relation: Relation

Switch
  -> on: "props" | "internal" | "override"
  -> cases: SwitchCase[]

SwitchCase
  -> uri?: string (shorthand)
  -> node?: Node (full form)
  -> default?: boolean (marks the default case)

Relation
  -> cardinality: string ("1", "0..1", "0..*", "1..*")
  -> slotName?: string ("default", "header", "icon")
```

### URI Encoding Convention

URIs follow turtle conventions with dot-separated paths: `tier.type.name`

| Symbol | Meaning | Example |
|--------|---------|---------|
| `.` | Path hierarchy | `global.component.button` |
| `_` | Word boundary from PascalCase | `ChartLegend` → `chart_legend` |
| `-` | Dot in compound names | `Card.Header` → `card-header` |

**Examples:**

| Component | URI |
|-----------|-----|
| `Button` | `global.component.button` |
| `Accordion.Item` | `global.subcomponent.accordion-item` |
| `ChartLegend` | `global.subcomponent.chart_legend` |
| `Card.Header` | `global.subcomponent.card-header` |

**Tiers and Types:**

The tier segment comes from the live tier set — run `pragma tier list` for the tiers
that exist today; never assign a tier from a remembered list. The type segment is one
of the ontology's UIBlock classes:

| Type | Use Case |
|------|----------|
| `component` | Standalone components |
| `subcomponent` | Parts of components (user-instantiable) |
| `pattern` | UX solutions combining components |
| `layout` | Space-dividing containers |
| `group` | Repeating series of ONE sibling block (the plural of a Component) |

(`pragma block list` omits groups — read them from the graph:
`pragma graph query "SELECT ?b ?name WHERE { ?b a ds:Group ; ds:name ?name }"`.)

**Parent Reference in Subcomponents:**

Subcomponents must reference their parent in the name:

| Labelled Name | Turtle URI |
|---------------|------------|
| `Timeline.Event` | `global.subcomponent.timeline-event` |
| `Timeline.ExpansionIndicator` | `global.subcomponent.timeline-expansion_indicator` |

### Named vs Anonymous

| Type | Identifier | Use Case |
|------|------------|----------|
| Named | `uri` | User-instantiable components (things users compose in their code) |
| Anonymous | `role` | Internal structural elements not directly instantiated by users |

**Rule of thumb:** Ask "Can/should a user write `<ComponentName>` in their code?" If yes, use `uri`. If no, use `role`.

### DRY Principle

When a node has a URI (is not anonymous), it references its own DSL file. Do not inline the full tree—reference the URI only. A named child MAY carry `styles:` that override its own anatomy in this context — live, `apps_landscape.component.password_constraints` sizes down its `global.component.icon` child — but never a copy of its subtree.

```yaml
# Correct: reference only
edges:
  - node:
      uri: global.component.button
    relation:
      cardinality: "1"

# Incorrect: copying the child's own definition
edges:
  - node:
      uri: global.component.button
      styles:
        # ... full button styles duplicated here
    relation:
      cardinality: "1"

# Permitted: contextual style overrides (the live password_constraints → icon pair)
edges:
  - node:
      uri: global.component.icon
      styles:
        size.width: size/icon/small
        size.height: size/icon/small
    relation:
      cardinality: "1"
```

### Cardinality Notation

| Notation | Meaning | Example Use |
|----------|---------|-------------|
| `"1"` or `"1..1"` | Exactly one (required) | Card body |
| `"0..1"` | Zero or one (optional) | Card header, Card footer |
| `"0..*"` | Zero or more | List items |
| `"1..*"` | One or more | Accordion items (need at least one) |
| `"2..5"` | Between 2 and 5 | Bounded repeats — live: KeyboardKeys' `"2..*"` (see the Group template below) |

### Switch Construct

The `switch` construct models positions in the anatomy tree that can be filled by one of several alternatives. It operates at the edge level, parallel to `node`, making polymorphism explicit.

#### Syntax

```yaml
edges:
  - switch:
      on: <discriminator>
      cases:
        - uri: <component-uri>
          default: true  # optional, marks default case
        - uri: <component-uri>
        - uri: $custom   # reserved URI for user-provided components
    relation:
      cardinality: <cardinality>
      slotName: <slot>
```

#### Discriminator Vocabulary

| Value | Meaning | Use Case |
|-------|---------|----------|
| `props` | Consumer chooses via component props | `<Field type="checkbox">` renders Checkbox vs Radio |
| `internal` | Component manages choice internally | AsyncButton shows Loading/Success/Error based on state (hypothetical — see the labelled example below) |
| `override` | Consumer can replace with custom component | Timeline accepts custom Event component via slot |

This enum is NORMATIVE. Live anatomies that predate it may carry qualified
discriminators (`props/<prop>`) or a `with:` map in exploratory drafts — do not
copy those into new anatomies.

#### Shorthand Expansion

The shorthand `- uri: X` expands to `- node: { uri: X }`. This allows cases to be expressed concisely when no additional metadata is needed:

```yaml
# Shorthand (common case)
cases:
  - uri: global.subcomponent.checkbox_input

# Expands to full form
cases:
  - node:
      uri: global.subcomponent.checkbox_input
```

When a case requires additional properties (styles, nested edges), use the full node form:

```yaml
cases:
  - node:
      uri: global.subcomponent.textarea_input
      styles:
        size.height: hug
        size.min.height: size/input/multiline
```

#### Reserved URI: `$custom`

The `$custom` URI indicates that the position accepts a user-provided component:

```yaml
cases:
  - uri: global.subcomponent.timeline-event
  - uri: $custom  # consumer can provide custom component
```

#### Examples

**Field with prop-based switch:**

```yaml
---
node:
  uri: global.pattern.field
  edges:
    - switch:
        on: props
        cases:
          - uri: global.subcomponent.checkbox_input
          - uri: global.subcomponent.radio_input
          - uri: global.subcomponent.text_input
      relation:
        cardinality: "1"
        slotName: input
```

**Async button with internal state switch** (the `async_button` family is hypothetical —
an illustration of the `internal` discriminator, not a live block):

```yaml
---
node:
  uri: global.component.async_button
  edges:
    - switch:
        on: internal
        cases:
          - uri: global.subcomponent.async_button-idle
          - uri: global.subcomponent.async_button-loading
          - uri: global.subcomponent.async_button-success
          - uri: global.subcomponent.async_button-error
      relation:
        cardinality: "1"
```

**Timeline with override-capable slot:**

```yaml
---
node:
  uri: global.pattern.timeline
  edges:
    - switch:
        on: override
        cases:
          - uri: global.subcomponent.timeline-event
          - uri: $custom
      relation:
        cardinality: "1..*"
```

### Slot Names

Common slot conventions:

| Slot | Purpose |
|------|---------|
| `default` | Main content area (React children, Vue default slot) |
| `header` | Header content |
| `footer` | Footer content |
| `icon` | Icon placement |
| `label` | Text label |
| `media` | Image/video content |
| `actions` | Action buttons |

**Convention:** `slotName: default` implies the main children slot (`children` in React, default slot in Vue).

### Style Key Categories

Styles use CTI-inspired dot-notation: `category.type[.item]`

#### Layout (typically invariant)
```yaml
layout.type: stack | flow | grid
layout.direction: horizontal | vertical
layout.align: start | center | end | stretch
layout.justify: start | center | end | space-between | space-around
layout.wrap: true | false
layout.display: block | flex | grid | none
layout.flex: 1 | auto
layout.overflow: hidden | scroll | visible
```

#### Spacing (invariant if literal, themeable if token)
```yaml
spacing.internal: spacing/medium          # padding (themeable)
spacing.external: spacing/large           # margin (themeable)
spacing.gap: spacing/small                # gap between children (themeable)
spacing.margin.bottom: spacing/small      # specific margin
```

#### Appearance (typically themeable)
```yaml
appearance.background: color/surface/card
appearance.border: border/style/default
appearance.border.top: border/style/divider
appearance.shadow: shadow/elevated/medium
appearance.radius: shape/rounded/full
```

#### Size (invariant if structural, themeable if token)
```yaml
size.width: fill | hug | 100%             # invariant
size.width: size/card/width               # themeable
size.max.width: size/container/max
size.max.height: size/media/max
size.min.height: 48px
```

#### Typography (typically themeable)
```yaml
typography.size: font/size/body
typography.weight: font/weight/bold
typography.color: color/text/primary
typography.align: center | left | right    # can be invariant
typography.line.height: 1.5
```

#### Interaction (typically invariant)
```yaml
interaction.cursor: pointer | default
interaction.transition.property: background
interaction.transition.duration: transition/duration   # token = themeable
interaction.transition.timing: ease
```

#### Object (for media)
```yaml
object.fit: cover | contain | fill
object.position: center | top
```

## Templates

### Basic Component Template

```yaml
node:
  uri: {tier}.component.{name}
  styles:
    # Structural (invariant)
    layout.type: stack
    layout.direction: vertical

    # Themeable
    appearance.background: color/surface/{name}
    spacing.internal: spacing/medium

  edges:
    - node:
        uri: {tier}.subcomponent.{name}-content
      relation:
        cardinality: "1..1"
        slotName: default
```

### Component with Optional Parts

```yaml
node:
  uri: global.component.card
  styles:
    layout.type: stack
    layout.direction: vertical
    appearance.background: color/surface/card
    appearance.shadow: shadow/card
    appearance.radius: shape/rounded/full

  edges:
    # Named children reference their URI only (DRY Principle above) — each
    # carries its own styles in its own anatomy; the live Card does the same.
    - node:
        uri: global.subcomponent.card-header
      relation:
        cardinality: "0..1"        # optional
        slotName: header

    - node:
        uri: global.subcomponent.card-content
      relation:
        cardinality: "1..1"        # required
        slotName: default

    - node:
        uri: global.subcomponent.card-footer
      relation:
        cardinality: "0..1"        # optional
        slotName: footer
```

### Nested Components (Repeating)

```yaml
node:
  uri: global.component.accordion
  styles:
    layout.type: stack
    layout.direction: vertical
    appearance.border: border/style/accordion

  edges:
    # The repeating child is NAMED — reference its URI only (DRY Principle
    # above); its subtree lives in its own anatomy. The live Accordion does
    # the same.
    - node:
        uri: global.subcomponent.accordion-item
      relation:
        cardinality: "1..*"       # one or more items
        slotName: default
```

The child's own anatomy — a separate spec on `global.subcomponent.accordion-item`
(transcribed from the live block) — is where the subtree lives; its parts are
anonymous roles:

```yaml
node:
  uri: global.subcomponent.accordion-item
  styles:
    layout.type: stack
    layout.direction: vertical
  edges:
    - node:
        role: header tab
        styles:
          layout.type: flow
          layout.direction: horizontal
          layout.align: center
          interaction.cursor: pointer
        edges:
          - node:
              role: control
              styles:
                size.width: size/icon/small
                size.height: size/icon/small
            relation:
              cardinality: "1"
          - node:
              role: heading
            relation:
              cardinality: "1"
              slotName: default
      relation:
        cardinality: "1"
        slotName: header

    - node:
        role: content panel
        styles:
          layout.overflow: hidden
      relation:
        cardinality: "1"
        slotName: default
```

### Group (repeating siblings)

A Group is the plural of ONE sibling block: a named root carrying only layout and
spacing styles, and a single URI-only edge whose cardinality bounds the repetition.
Transcribed from the live `global.group.keyboard_keys`:

```yaml
node:
  uri: global.group.keyboard_keys
  styles:
    layout.display: inline-flex
    layout.align: center
    spacing.gap: spacing/horizontal/xsmall
  edges:
    - node:
        uri: global.component.keyboard_key
      relation:
        cardinality: "2..*"       # a group needs at least two keys
        slotName: default
```

### Anonymous Wrapper Node

Use when you need a structural element without design system identity:

```yaml
node:
  uri: global.pattern.modal
  styles:
    layout.type: stack
    appearance.background: color/surface/modal

  edges:
    - node:
        role: backdrop overlay    # anonymous - no uri
        styles:
          layout.display: block
          appearance.background: color/overlay/dark
          interaction.cursor: pointer
      relation:
        cardinality: "1..1"

    - node:
        role: content container   # anonymous wrapper
        styles:
          layout.type: stack
          size.max.width: size/modal/max
          spacing.internal: spacing/large
        edges:
          - node:
              uri: global.subcomponent.modal-header
            relation:
              cardinality: "0..1"
              slotName: header
          - node:
              uri: global.subcomponent.modal-content
            relation:
              cardinality: "1..1"
              slotName: default
      relation:
        cardinality: "1..1"
```

### Simple Button Example

The live Button models its icon and label as ANONYMOUS roles — a user writes `<Button>`
with props and children, never a `Button.Icon` — so the children carry `role`, not `uri`
(the Named vs Anonymous rule above):

```yaml
node:
  uri: global.component.button
  styles:
    # Structural
    layout.type: flow
    layout.direction: horizontal
    layout.align: center
    layout.justify: center

    # Themeable
    spacing.internal: spacing/button
    spacing.gap: spacing/small
    appearance.background: color/action/primary
    appearance.radius: shape/rounded/button
    typography.weight: font/weight/medium

    # Interaction
    interaction.cursor: pointer
    interaction.transition.property: background, transform
    interaction.transition.duration: transition/fast

  edges:
    - node:
        role: icon
        styles:
          size.width: size/icon/small
          size.height: size/icon/small
      relation:
        cardinality: "0..1"
        slotName: icon

    - node:
        role: label
        styles:
          typography.size: font/size/button
          typography.color: color/text/on-action
      relation:
        cardinality: "0..1"
        slotName: default
```

## Workflow

### 1. Identify the Component

First, a pre-step: could the name be a Group? Run the group query before the
lookup — neither `pragma block lookup` nor `pragma block list` covers groups, and
a name can be BOTH a Group and another tier's block (`BlogCards` is the Group
`sites.group.blog_cards` AND the Component
`sites_webcomponentsprototype.component.blog_cards`; the lookup answers with the
component and never mentions the group):

```bash
pragma graph query "SELECT ?b ?name WHERE { ?b a ds:Group ; ds:name ?name }"
```

If the name is in the answer and the Group is the block you were asked to write,
it is an existing block: take the URI from that query row (no §3 derivation),
gather its context with `pragma graph inspect <IRI>`, and continue from §2.

Otherwise, determine if the component exists in the design system:

```bash
pragma block lookup Card
```

Two branches:

- **Not found** (`ENTITY_NOT_FOUND`) — this is a NEW block: derive its URI in §3
  below, then continue from §2.
- **Found** — this is a draft for an existing block (the empty-anatomy worklist path):
  take the URI from the block's `pragma block list` row and skip §3. The list carries a
  row per block it covers, not per tier declaring the name, and the lookup above
  resolved it globally — the name query
  `pragma graph query "SELECT ?b WHERE { ?b ds:name ?n . FILTER(LCASE(?n) = LCASE('<Name>')) }"`
  lists every tier's IRI, so you take the one you meant.
  Gather the full context — anatomy, modifiers, properties come with the lookup (a
  bare name can match several tiers: see the multi-tier note in the Discovery Flow
  above); every raw triple with:

  ```bash
  pragma graph inspect ds:global.component.card
  ```

### 2. Gather Structural Requirements

Ask:
- What are the main parts? (header, body, footer, icon, label)
- Which parts are required vs optional?
- Can any parts repeat?
- Are there anonymous structural wrappers needed?

### 3. Determine Tier and Type

The URI is `{tier}.{type}.{snake_name}` (see URI Encoding Convention above). The tier
segment comes from the live tier set — run `pragma tier list` and pick from what it
answers, never from a remembered list; the type segment is one of the ontology's
UIBlock classes:

| Question | Answer | Result |
|----------|--------|--------|
| Is it universal? | Yes | `global.component.{name}` |
| Is it app-specific? | Yes | `{apps_tier}.component.{name}` — the app's own tier from `pragma tier list` (e.g. `apps_lxd`) |
| Is it a subpart? | Yes | `{tier}.subcomponent.{parent}-{part}` |
| Is it a UX solution? | Yes | `{tier}.pattern.{name}` |
| Does it divide space? | Yes | `{tier}.layout.{name}` |
| Is it many instances of ONE sibling block laid out together? | Yes | `{tier}.group.{name}` |

### 4. Define Edges

For each child:
1. Is it named (in DS) or anonymous (structural wrapper)?
2. What is its cardinality?
3. Does it map to a slot?

### 5. Apply Styles

For each node, consider:
- **Layout**: How is content arranged?
- **Spacing**: Internal padding, gaps between children
- **Appearance**: Background, borders, shadows, radius
- **Size**: Width/height constraints
- **Typography**: Text styling (for text-containing nodes)
- **Interaction**: Cursor, transitions (for interactive nodes)

**Rule of thumb**:
- Structural values (stack, center, fill) = invariant
- Token references (spacing/medium) = themeable

### 6. Validate

Check your anatomy against:
- [ ] Root node is named (has `uri`)
- [ ] All cardinalities are valid notation
- [ ] Style keys follow CTI convention
- [ ] Token paths use `/` delimiter
- [ ] Anonymous nodes have `role`, not `uri`
- [ ] Multi-word names encode word boundaries with `_`; `-` appears only where the name carries a dot (per the URI Encoding Convention table)
- [ ] Every non-root `uri:` either resolves (`pragma graph inspect ds:<uri>`) or is `$custom`, a template placeholder, or a new block or child this same spec introduces (§3)
- [ ] Named (`uri:`) children carry no copy of their own subtree — contextual style overrides only
- [ ] Nested components make semantic sense

## Response Format

When creating an anatomy, respond with:

```markdown
## Anatomy: {ComponentName}

**URI:** `{tier}.{type}.{snake_name}`
**Tier:** {tier} - {rationale}

### Structure Overview
- {Part 1} (required/optional)
- {Part 2} (required/optional)
- ...

### Specification

\`\`\`yaml
{yaml content}
\`\`\`

### Notes
- {Design decision 1}
- {Design decision 2}

### Next Steps
1. Land the DSL in the block's spec draft under `specs/` (see `specs/README.md`) —
   as step 7 of a specify flow that is the step-6 spec file; never under `data/`
2. A human enters the content into Coda, the database of record
```

## Tips

1. **Start simple**: Begin with just structure, add styles incrementally
2. **Use discovery**: Query existing components for patterns and consistency
3. **Name thoughtfully**: URIs are identifiers - choose clear, consistent names
   (see the URI Encoding Convention table above)
4. **Annotate decisions**: Use YAML comments for non-obvious choices
5. **Validate cardinality**: Think through edge cases (empty states, maximums)
6. **Separate concerns**: Structural styles vs themeable styles
7. **Anonymous nodes are OK**: Don't force DS identity on pure wrappers

## Limitations

- Does not handle conditional rendering (show/hide based on state)
- Does not represent portal content (elements rendered elsewhere in DOM)
- Style inheritance is not yet supported (e.g., "inherits from Card")
- No runtime behavior specification (only static structure)

## References

- [Open UI W3C Working Group](https://open-ui.org/) - Inspiration for code-based anatomy
- [Components as Data](https://medium.com/@nathanacurtis/components-as-data-2be178777f21) - Nathan Curtis's exploration
- [W3C Design Token Format](https://design-tokens.github.io/community-group/format/) - Token path conventions

---

## Appendix: Anatomy DSL Specification

The complete type system for the Anatomy DSL. This specification defines the formal structure for representing component anatomies.

### Abstract

This specification presents a DSL to represent design system anatomies, providing an accurate platform-agnostic markup primitive to precede implementation.

### Intended Usage

1. **Documentation**: Implementation primitive for markup and style bindings
2. **Specification**: Using the tree-based DSL to identify entities to implement and/or reuse
3. **Discussion**: Using the DSL to discuss across conversations related to DS (e.g., "I believe these nodes should be siblings, not parents of one another")
4. **Inference**: Supporting automated inference to audit a codebase against its specifications or to support code generation

### Requirements

**General DSL Requirements:**
- The DSL MUST optimize for readability
- The DSL MUST be easy to get started with and use a familiar language
- The scope of the DSL MUST be minimized to cover only the strict necessary - additional specification information being covered in the schema

**Modelling Requirements:**
- The children of a node MUST be modelled through a reified relation for annotation purposes
- The DSL MUST support anonymous nodes (nodes that are not named components). In this case, the DSL should support role annotations
- The DSL MUST support reified annotations of cardinality
- The DSL MUST support all classes of UI Blocks identified in the ontology (Layout, Pattern, Component, Subcomponent, Group)

### Type System

The children one-to-many relation follows inspiration from the [Relay connection pattern](https://relay.dev/graphql/connections.htm).

```typescript
/* Reusable types */

/**
 * Styles use a CTI (Category-Type-Item) inspired flat key structure
 * for platform-agnostic UI properties.
 *
 * KEY NAMING CONVENTION:
 * Properties follow dot-notation: "category.type[.item]"
 * - Category: Primary concern (layout, spacing, appearance, typography, size)
 * - Type: Specific aspect within that category
 * - Item: Optional further specification
 *
 * INVARIANT VS THEMEABLE:
 * - Invariant (structural): layout.type, layout.direction, size.width: "fill"
 * - Themeable (brand/theme): appearance.*, spacing.* (when using tokens)
 */
type Styles = Record<string, TokenPath | TokenPath[] | PrimitiveValue>;

/**
 * TokenPath: Forward-slash delimited path to a design token.
 * Examples: "spacing/medium", "color/surface/primary", "font/size/heading/1"
 */
type TokenPath = string;

/**
 * PrimitiveValue: Direct values not resolved from tokens.
 * Examples: "stack", "center", "fill", 1.5, true
 */
type PrimitiveValue = string | number | boolean;

/* Main types */

interface Relation {
  /**
   * Cardinality: Number of allowed instances.
   * - "1"     : Exactly one (required)
   * - "0..1"  : Zero or one (optional)
   * - "0..*"  : Zero or more
   * - "1..*"  : One or more
   * - "2..5"  : Between 2 and 5
   */
  cardinality: string;

  /**
   * Maps content to a specific slot in the parent component.
   * Common values: "default", "header", "footer", "icon", "label"
   */
  slotName?: string;
}

/**
 * Base interface for all nodes in the anatomy tree.
 */
interface BaseNode {
  /**
   * Style properties using CTI-inspired keys.
   *
   * Categories:
   * - layout.*   : type, direction, align, justify, wrap, display, flex, overflow
   * - spacing.*  : internal, external, gap, margin.*, padding.*
   * - appearance.*: background, border, shadow, radius
   * - size.*     : width, height, max.*, min.*
   * - typography.*: size, weight, color, align, line.height
   * - interaction.*: cursor, transition.*
   * - object.*   : fit, position
   */
  styles?: Styles;

  /** Child nodes and their relationships. */
  edges?: Edge[];
}

/**
 * Named nodes represent identifiable components in the design system.
 */
interface NamedNode extends BaseNode {
  /**
   * Unique identifier following "tier.type.name" pattern.
   * Examples: "global.component.button", "apps.layout.application_layout"
   */
  uri: string;
}

/**
 * Anonymous nodes represent structural elements without DS identity.
 */
interface AnonymousNode extends BaseNode {
  /**
   * Human-readable description of the node's purpose.
   * Examples: "content wrapper", "spacer element", "icon container"
   */
  role: string;
}

type Node = NamedNode | AnonymousNode;

/**
 * A switch fills one position with ONE of several alternatives.
 * The discriminator says who chooses: "props" (consumer chooses via
 * component props), "internal" (the component chooses from its own
 * state), "override" (the consumer may replace the default with a
 * custom component).
 */
interface Switch {
  on: "props" | "internal" | "override";
  cases: SwitchCase[];
}

/**
 * One switch alternative — exactly one of `uri` or `node`.
 * `uri` is the shorthand for `node: { uri }`; use the full `node` form
 * when the case carries styles or edges. The reserved URI `$custom`
 * marks a case filled by a user-provided component.
 */
interface SwitchCase {
  uri?: string;
  node?: Node;

  /** Marks the default case. */
  default?: boolean;
}

interface Edge {
  /** The child node — exactly one of `node` or `switch`. */
  node?: Node;

  /** A polymorphic position (mutually exclusive with node). */
  switch?: Switch;

  relation: Relation;
}

/**
 * Root specification for a component anatomy.
 * The top-level node must always be Named.
 */
interface AnatomySpec {
  node: NamedNode;
}
```

### Language Choice

YAML is chosen as the markup language for its:
- Indentation-based structure matching tree hierarchies
- Readability over JSON's verbosity
- Wide adoption and tooling support

Alternatives considered and rejected:
- JSON: Too verbose for deep nesting
- TOML: Difficulty with deeply nested maps
- SDLang/KDL: Promising but lacking wide adoption

### Complete Example: Accordion

```yaml
node:
  uri: global.component.accordion
  styles:
    # Structural (invariant)
    layout.type: stack
    layout.direction: vertical

    # Themeable
    appearance.border: border/style/accordion

  edges:
    # The repeating child is NAMED — reference its URI only (DRY Principle);
    # its subtree lives in its own anatomy. The live Accordion does the same.
    - node:
        uri: global.subcomponent.accordion-item
      relation:
        cardinality: "1..*"
        slotName: default
```

The child's own anatomy — a separate spec on `global.subcomponent.accordion-item`
(transcribed from the live block) — carries the subtree as anonymous roles:

```yaml
node:
  uri: global.subcomponent.accordion-item
  styles:
    layout.type: stack
    layout.direction: vertical
  edges:
    - node:
        role: header tab
        styles:
          layout.type: flow
          layout.direction: horizontal
          layout.align: center
          interaction.cursor: pointer
        edges:
          - node:
              role: control
              styles:
                size.width: size/icon/small
                size.height: size/icon/small
            relation:
              cardinality: "1"
          - node:
              role: heading
            relation:
              cardinality: "1"
              slotName: default
      relation:
        cardinality: "1"
        slotName: header

    - node:
        role: content panel
        styles:
          layout.overflow: hidden
      relation:
        cardinality: "1"
        slotName: default
```

### Future Work

The following features would require additional work:
- Representation of related nodes displayed in portals
- Representation of conditional display
- Inheritance reference for styles (e.g., "NetworkCard inherits from Card")

## Support

If this skill leads somewhere broken — a command that errors, guidance that
contradicts what the live system answers, a gap the flow cannot cover — you are not
stuck:

- Raise an issue in the pragma repo: https://github.com/canonical/pragma/issues —
  include the skill name, what was run, and expected vs. actual outcome.
- Or contact the design-system team owners directly through your organization's
  professional messaging channels for assistance.
