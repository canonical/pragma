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
- **Projections**: Graph-data bindings — which entity type a subtree is a view over, and which field each position renders
- **Props**: Pinned prop values fixing a referenced component's configuration at one position (the icon case)
- **Interaction states**: Style values scoped to a state via an `@state` key suffix (`appearance.background@hover`)

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
appendix below carries its type system). That file is a verbatim copy of
`docs/api-reference.md` in canonical/anatomy-dsl, which is the normative source for
the NOTATION: the grammar, the type system, what parses and what does not. Where this
SKILL.md and the sibling spec disagree about the notation, the spec wins, and the
disagreement is a bug to report. Reach for it for the parts too long to restate
here — the worked projections gallery, the derived-fragment contract, and the
full example set.

The spec's reach stops at the grammar, and one boundary is worth stating because it
reads like a contradiction otherwise. The spec's Deferred Items and Out of Scope
tables list what the GRAMMAR does not provide — a construct, a keyword, a schema. They
do not rule on how an author models something the grammar has no construct for. Where a
modelling convention is what is at issue — a pseudo-element drawn by the stylesheet, a
modifier family a component supports — this SKILL.md is the authority, and it says so
at each of those places. The authored corpus follows this file.

**And this file, in the design-system repository, is the authority over the copy
`pragma skill lookup anatomy-author` prints.** That copy is bundled into a pragma
release and lags the repository until the next one, so a sentence you find there and
cannot find here is old text, not a second opinion. Read the repository file when the
two differ.

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

A bare name resolves `ds:name` globally, so where several tiers carry the name the
lookup answers with EVERY one of them: the full writeups concatenated, each under its
own `## <Name>` heading with its own `- Tier:` line. `pragma block lookup Chip` returns
the global Chip and the launchpad Chip in one answer, and they are DIFFERENT blocks —
separately authored, with different properties and different anatomies — not repeats of
one. So the read is not "confirm the tier it picked": scroll the whole answer, read
every `- Tier:` line, count the headings, and pick the block you were asked to write.
Stopping at the first heading is how a second, unrelated component's anatomy gets
transcribed by mistake.

`block lookup` also takes a `ds:` IRI, which answers with exactly one block and skips
the disambiguation: `pragma block lookup ds:global.component.chip`. The bare dotted
name is NOT a key — a `block list` row prints `ds:apps_lxd.component.meter`, and
dropping the `ds:` prefix comes back `ENTITY_NOT_FOUND`. A glob (`*chip*`) fans out the
same way a shared display name does, one block per tier.

The name query in Workflow §1 lists every tier carrying the name with each block's IRI,
which is the read when you want the list rather than the writeups. If the name has no
row at all, the block may be a Group — `block list` covers no groups; the group
pre-step in Workflow §1 lists them.

### The token graph answers whether a symbol exists

Every symbol you are about to write is queryable, and guessing is not authoring. Two
questions come up while transcribing a stylesheet — does this symbol exist, and what
does this variable stand for — and three commands answer them:

```bash
pragma token lookup color.text          # one symbol in full: type, description, every
                                        # definition behind it, the families that may
                                        # rebind it, and what it resolves to
pragma token list --search focus        # which symbols exist around a word
pragma variable lookup modifier-color-text   # what a CSS variable stands for
```

`token lookup` answers with the symbol's `- Type:`, its `- Description:`, a
`### Definitions` list, a `### Covered by` list of the families that may rebind it,
and a `### Values` list. A name nothing declares comes back as `ENTITY_NOT_FOUND`,
and that is the answer: it is not a value to write. `token list --search motion`
answers `## Token (0)` today, which is why no anatomy binds a `motion.*` symbol.

`token list` is the read for "does this family exist under some other name", and it
needs a filter to be trusted. It pages at 300 rows sorted by name, so a bare
`pragma token list` returns colour tokens and nothing else — every `dimension.`,
`number.`, `typography.` and `fontWeight` symbol is off the first page. The output says
so, in a heading ending "and more exist" and a closing line offering an `--after`
cursor, but a bare list piped through `grep` swallows both and reads as an absence that
is not there. Narrow instead: `--search <word>` over name and description,
`--type <type>` for one type's population, `--channel-of <symbol>` for the channels
provisioning one symbol, and `--limit` raised past 300 when the whole population is
what you want.

`variable lookup` is the other direction, and it is the one that reads a stylesheet.
Give it the custom property WITHOUT its leading dashes. It has THREE outcomes, and only
the first two are usually anticipated:

1. **It resolves and carries a `- Symbol:` line.** That symbol is what the variable
   stands for, and it is what the anatomy binds. The answer also carries a
   `### Declarations` list — one row per declaration, each naming its `selector`, its
   `inAtRule` layer, what it `emits` and the `file:line` it is declared at.
   `modifier-color-text` answers with one row per modifier, which is the whole family's
   coverage in one read.
2. **It resolves and carries NO `- Symbol:` line at all.** The variable is a DERIVED
   one — a state product or a delta, autogenerated from another variable rather than
   authored — and it stands for no symbol, so there is nothing to bind.
   `hover--color-foreground-secondary` is one: it resolves, its tier is
   `dt:tier.derived`, its `emits` is an `oklch(from …)` expression, and no `- Symbol:`
   row appears. Do not read the missing line as a failed lookup and do not bind the
   name. Ask what it reaches, and carry on down the implementation's own fallback chain
   to the next variable, which is usually where the real symbol is:

   ```bash
   pragma variable chain --variable hover--color-foreground-secondary
   ```

3. **`ENTITY_NOT_FOUND`.** The graph has never heard of the name — `--button-gap`,
   `--icon-size` and `--focus-outline-width` all answer this way, because they are
   component-local properties and not design tokens. That is the case for a `#` comment
   on the line rather than a binding.

**A component-local variable is rarely the end of the chain — follow every hop.** The
`ENTITY_NOT_FOUND` says the token graph does not declare the NAME; it says nothing about
what the stylesheet declares the name AS. A component's own `:root` block routinely
aliases a declared variable behind a local one, and the alias can be several hops deep:

```css
:root {
  --chip-color-background: var(--color-foreground-secondary);
}
```

`chip-color-background` is `ENTITY_NOT_FOUND`, and `color-foreground-secondary`
resolves to `color.foreground.secondary`. Skipping the hop loses a real binding. So for
every `ENTITY_NOT_FOUND` on a `--<component>-*` name, go back to the component's own
stylesheet, read what that property is declared as, and look THAT name up — repeating
until you reach a declared variable (bind its symbol) or a literal (write the literal
where the key admits one, and comment it where it does not). Only a chain that ends in
neither is a `#` comment saying what the implementation reads.

The same verbs are MCP tools under the names `token_lookup`, `token_list`,
`variable_lookup` and `variable_chain`, with the same arguments; use whichever surface
you are on, and take the current catalog from `pragma capabilities`.

### Discovery Queries

Common prefixes (`ds:`, `cs:`, `dt:`) are applied automatically — no PREFIX preamble
needed.

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
       ds:parentComponent ds:global.component.card .
}"
```

A prefixed name carrying dots or slashes parses inside a SPARQL body, so write the name
the graph prints: `ds:global.component.card` and `dt:s4/web/cond/layer-ds-states/universal`
both resolve, as do the dot-free (`ds:Component`) and single-dot
(`ds:tag.needsdefinition`) forms. The full IRI
(`<https://ds.canonical.com/global.component.card>`) is accepted too and answers
identically — it is what `pragma graph query` prints back, so a copied row is always
safe. What is NOT accepted is the prefixed name inside angle brackets, `<ds:…>`: that
returns an EMPTY table rather than an error, which reads as "no such thing" when the
thing is there.

### The empty-anatomy worklist

The Coda sync emits `ds:anatomyDsl` as an empty string for blocks whose anatomy is not
yet written — this query IS the to-do list; pick from it, never from a copied table:

```bash
pragma graph query "SELECT ?b ?name WHERE { ?b ds:anatomyDsl ?a ; ds:name ?name . FILTER(STR(?a) = '') }"
```

The worklist rows point at blocks whose data lives under `data/` — never hand-edit
that tree: it is regenerated destructively from Coda by CI, and hand edits are
overwritten by the next sync. An authored anatomy lands in a file of its own, and
"Where the anatomy lands" below is the whole path from that file to the document.

### Where the anatomy lands

An anatomy is written by hand, from the component's implementation stylesheet, into
one file in the design-system repository:

    anatomies/authored/<tier>/<uri>.yaml

The file name IS the dotted uri (`anatomies/authored/global/global.component.button.yaml`),
which is how the write finds the row it belongs to, and the text of the file is the
text of the `anatomy_dsl` cell verbatim. Open the file with a comment saying where it
was read from — the package, the stylesheet and the selector — because the next reader
has to be able to check it:

```yaml
---
# Authored 2026-09-13 from @canonical/react-ds-global src/lib/component/Button/styles.css on .ds.button
node:
  uri: global.component.button
```

Then, in order:

1. **Check it offline.** `bun src/cli.ts anatomies validate --authored` reads every
   authored file and runs the law over it, with no network and no document. It answers
   with the count it read, any warnings, and a verdict — `✓ 19 warning(s), 0 findings
   — every file is lawful` — and exits 0 when the corpus is lawful. Findings are what
   you fix; the `AT11` state-differs-from-base lint is a warning and is usually the
   implementation telling the truth.
2. **Review it as a file.** The file goes through a pull request like any other
   change, which is the point of authoring in files: the node boundaries, the
   comments and the symbol choices are all readable in a diff.
3. **Write it to the document.** `anatomies write` sends the authored files to the
   `anatomy_dsl` cells, and it is dry by default — run it with no flags first and read
   the plan, then one anatomy as a canary with `--only <uri> --apply` and look at the
   cell, then `--apply` for the rest. It snapshots every cell it is about to touch
   before its first write, and `anatomies restore <snapshot>` puts them back. The
   repository README's anatomies section is the authority on the gates that step runs
   behind; do not improvise around them.

**After the write, the document is the source of record.** `data/` is regenerated from
it by the pull sync, the pack is built from `data/`, and that is the chain a
`pragma block lookup` answer comes down. Until an authored anatomy has been written
and the pack rebuilt, `block lookup`'s `### Anatomy (DSL)` section still answers with
whatever the cell said before — today, for most blocks, the retired notation. A
`color/text/muted` in that output is history, not a house style to copy.

There is no derivation step, no `references.yaml` and no register category for a
stylesheet fact: reading an implementation and choosing the node, the key and the
symbol is judgement, which is why it happens in a file under review.

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

Style keys may carry an @state suffix ("appearance.background@hover");
the unmarked key is the default state.

NamedNode
  -> uri: string ("tier.type.name")
  -> projection?: Projection
  -> props?: Record<string, string | number | boolean>
  -> styles?: Record<StyleKey, Symbol | [...Symbol[], Primitive?] | Primitive>
  -> edges?: Edge[]

AnonymousNode
  -> role: string ("content wrapper")
  -> projection?: Projection
  -> styles?: Record<StyleKey, Symbol | [...Symbol[], Primitive?] | Primitive>
  -> edges?: Edge[]
  (no props — anonymous nodes have no prop surface)

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
  (exactly one of the two; there is NO `default` marker)

Relation
  -> cardinality: string ("1", "0..1", "0..*", "1..*")
  -> slotName?: string ("default", "header", "icon")
  -> projection?: RelationProjection

Projection            (on a node — at least one of the two)
  -> on?: string      GraphQL type condition ("Component")
  -> field?: string   dot-delimited field path ("_meta.title")

RelationProjection    (on a relation — the traversal filling the slot)
  -> field: string    required; never carries `on`
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

**A part the stylesheet draws with `::before` or `::after` is a node.** It is visible,
it takes paint of its own, and it is not something a consumer fills — so it is an
anonymous `role:` node with a comment saying how it is drawn, and it has no
`slotName`. The live checkbox glyph is the case:

```yaml
edges:
  - node:
      # drawn as ::before
      role: selection glyph
      styles:
        layout.position: absolute
        appearance.background@selected: [surface.color.foreground.checkbox.checkmark, color.foreground.checkbox.checkmark]
    relation:
      cardinality: "1"
```

The DSL has no pseudo-element construct, and it does not need one: the node above is an
ordinary anonymous node, and the `# drawn as ::before` comment is what records which
pseudo-element the implementation used. The spec's Deferred Items row on pseudo-elements
is about that missing GRAMMAR — a first-class pseudo-element type — not about whether
the part is modelled. It is modelled, by the convention above, and the authored corpus
does it this way. So a `::before` separator, glyph or overlay is never left out of a
tree because the grammar has no keyword for it.

**A native control's own chrome is turned off, not modelled.** Where the
implementation writes `appearance: none` over a native `<input>` or `<select>` and
draws the control itself, the anatomy says so on the node that IS the control:

```yaml
node:
  uri: global.subcomponent.checkbox_input
  styles:
    appearance.native: none
    appearance.border.color: color.border
```

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
        size.width: dimension.300
        size.height: dimension.300
    relation:
      cardinality: "1"
```

**Which blocks a `uri:` may reach.** A reference points at a block in the same tier or
in `global`, and never the other way: a `global` anatomy that reached into an app
tier would make the global block depend on one product. Where the part is real but the
block it would name does not exist, write an anonymous `role:` node and say so in a
comment — the reference is a claim about the graph, and a claim about a block nobody
has created is one an anatomy must not make:

```yaml
edges:
  - node:
      # The list is the Landscape table's own, and no block names it yet.
      role: result list
    relation:
      cardinality: "1"
      slotName: default
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

A case carries `uri` or `node`, and nothing else. There is no `default:` marker
in the DSL: `SwitchCase` is `additionalProperties: false`, so a case carrying one
FAILS schema validation. Which alternative is the fallback is the component's
behaviour, not its anatomy — say it in a YAML comment if it matters.

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
        size.min.height: 6rem
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

### Projections

A projection binds a position in the tree to graph data, after the Relay
fragment-colocation pattern: the tree carries its own data requirements. Two
places take one, and they mean different things.

```yaml
---
node:
  uri: global.component.entity-card
  projection:
    on: Component              # type condition — this tree is a view over one Component
  edges:
    - node:
        uri: global.subcomponent.entity-card-header
        projection:
          field: _meta.title   # this node RENDERS the entity's title
      relation:
        cardinality: "1"
        slotName: header
    - node:
        uri: global.component.chip
        projection:
          field: _meta.title   # relative to the TRAVERSED entity, not the root
      relation:
        cardinality: "0..*"
        slotName: tags
        projection:
          field: documentationStages   # traversal populating the slot
```

| Position | Field | Means |
|----------|-------|-------|
| Root node | `on` | Establishes the data context — the anatomy is a view over one entity of that type. Children inherit it. |
| Child node | `on` | Narrows the traversed entity's type — the analog of an inline fragment. |
| Any node | `field` | This node renders that field's value. |
| Relation | `field` | Traversal: the slot is populated from that field of the current context. Required, and never carries `on`. |

A node projection needs at least one of `on` / `field`. Both are schema names:
`on` matches `^[A-Z][A-Za-z0-9_]*$`, `field` is dot-delimited
(`^[_A-Za-z][_A-Za-z0-9]*(\.[_A-Za-z][_A-Za-z0-9]*)*$`).

Two rules a checker cannot enforce from the anatomy alone — hold them yourself:

- **Cardinality decomposes against the schema.** The upper bound claims
  multiplicity (`..1` an object or scalar field, `..*` a connection or list);
  the lower bound claims nullability (`0..` tolerates `null`, `1..` requires the
  provider to always have the value). So `field: _meta.title` may sit under
  `cardinality: "1"`, but a nullable `summary` must sit under `0..1`. `1..*`
  asserts a non-empty list — stronger than GraphQL can express, checkable only
  at runtime.
- **Mechanism-blindness.** Whether a plural field is a Relay connection or a
  plain list is a provider mechanism, not an anatomy fact. NEVER write an
  unwrapping path like `edges.node` — consumers discover the shape from the SDL.
  This is what lets an anatomy survive a provider promoting a list to a
  connection unchanged.

Projections are optional. A structure-only anatomy stays valid, and unprojected
positions simply contribute nothing to the derived fragment. Add them when the
component's whole point is rendering a known entity; leave them off for generic
containers. The committed provider SDL is the naming authority — check field
names against it rather than guessing.

### Pinned Props

A named node can PIN props of the component it references, fixing a value at
one tree position:

```yaml
node:
  uri: global.component.icon
  props:
    icon: chevron-down
```

| Aspect | Rule |
|--------|------|
| Keys | Prop names as defined on the component in the DS ontology (camelCase). |
| Values | Scalars only — no token paths, no fallback arrays. Pins are values, not styles. |
| Nodes | Named nodes ONLY. `props` under a `role` node is rejected by the parser and the schema. |

The DSL never DEFINES a prop surface — names, types and optionality live in the
DS ontology (`ds:hasProperty`). A pin asserts one value at one position. Whether
the prop exists, and whether the value is admissible, are checks against the
graph: `pragma block lookup <Component>` lists the properties.

**Icons are the canonical case**, and need no icon-specific construct. The icon
is a component whose glyph is a required prop, so icon usage splits in two:

| Case | Authoring |
|------|-----------|
| Consumer-filled icon slot (Button's `slotName: icon`) | Icon-component edge with a slot and NO pin — the consumer chooses the glyph, and the anatomy correctly says nothing. |
| Component-intrinsic icon (accordion chevron, modal close ×, status glyph) | Icon-component node with `props: { icon: … }` — the spec fixes the glyph. |

**Pins are static by design.** A data-driven value is a projection
(`projection: { field: … }`); a state-driven one is a `switch` whose cases pin
different values. If a value varies at runtime, it is not a pin.

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

### A style value is the symbol consumed

A style value is **the name of a token symbol**, written in the symbol's own dotted
spelling — or **an ordered list of symbol names**, which is the fallback order the
implementation reads, ending in the one literal it falls back to last.

```yaml
styles:
  # One symbol.
  typography.weight: typography.weight.medium
  # A fallback order: the channel first, then the semantic token behind it. This is
  # the implementation's own `var()` chain, transcribed.
  typography.color: [modifier.color.text, color.text]
  # A chain that ends in a literal keeps the literal: an implementation regenerated
  # from this anatomy has to be able to write the whole chain.
  appearance.outline.color@focus: [modifier.color.focusRing, color.focusRing, currentColor]
  # A primitive is a literal the implementation writes, and resolves against nothing.
  layout.type: inline-flex
```

Three things that are **retired** and rejected by the parser:

| Retired | Write instead |
|---|---|
| a slash path — `color/text/muted` | the symbol's dotted name — `color.text.muted` |
| a trailing `?` marker — `shadow/card?` | nothing: a name no stratum declares is not written at all, and a `#` comment on the line records it |
| `root` or `$root` inside a value | the dotted name without it — `color.text` |

**Consume the channel where the implementation reads the channel.** A modifier or
surface family reaches a component through a channel variable, and the anatomy says so
by consuming the channel by name: `modifier.color.text` is the channel of `color.text`,
and it is a symbol of its own. Where the implementation reads the semantic token
directly, the anatomy consumes the semantic token. Nothing is inferred either way.

**This is also how a component's SUPPORT for a modifier family is expressed — and it is
the only way.** There is no key that names a family, no `@state` for one, and no
`switch` discriminator over one: a family is never written into an anatomy by name.
What an anatomy says is which channels it reads, and a channel is where a family lands.
So `typography.color: [modifier.color.text, color.text]` is the statement "whatever
family covers `color.text` reaches this node's text colour", and
`appearance.background: [surface.color.background, color.background]` is the same
statement for the surface side. Which families those are is a question for the token
graph, not the anatomy — `pragma token lookup color.text` lists them under
`### Covered by`, and `pragma token values --symbol modifier.color.text` shows the
routing per modifier. Button is the worked chain: it carries the Anticipation family,
its text colour consumes `modifier.color.text`, and that channel routes
`anticipation.caution` to `color.text.warning` and `anticipation.destructive` to
`color.text.destructive` — while Button's own anatomy says the word "Anticipation"
nowhere. The family is in the channel, not in the tree.

Two consequences worth holding on to. A component whose spec claims a family and whose
anatomy consumes no channel of the symbols that family covers does not in fact support
it — that mismatch is a finding, and the anatomy is where it shows. And the reverse:
where the stylesheet reads the plain semantic token with no channel in front of it, the
anatomy binds the plain token, and the component is correctly saying it is NOT
family-sensitive at that key. Do not add a channel to express a family the
implementation does not read.

**A name no stratum declares is never written. The comment is the record.** An
implementation reads plenty of variables that stand for no symbol — a component-local
`--button-gap`, a state variable the stylesheet computes, a family that has not
landed. The rule is to bind what does resolve and say in a `#` comment what the
implementation reads first, on the line it belongs to:

```yaml
styles:
  # reads --modifier-color-text-disabled first; no symbol declares it.
  typography.color@disabled: color.text.disabled
  # The transition reads --motion-duration-fast and --motion-easing-standard; both
  # bindings are dropped because no symbol declares either name and neither var()
  # carries a literal fallback.
  motion.property: "background-color, color"
```

The comment is where a reader meets the fact, and it travels with the value — there is
no register row for an authored file, and nothing is substituted merely to make a name
resolve. `pragma token lookup <symbol>` settles whether a name resolves before you
write it; `pragma variable lookup <name>` settles what a variable in the stylesheet
stands for (see Discovery Flow above).

**A list is the implementation's fallback chain, and the first element wins.** The head
is what the slot reads, each later element is what it falls back to, and a chain may
end in the one literal the implementation writes last. A list of one element is written
as the scalar instead, and a primitive anywhere but last is a parse error.

### The style keys are a closed roster

There are 111 style keys and they are the DSL's own vocabulary, published as
`@canonical/anatomy-dsl`'s `definitions/style-keys.yaml`. That file is the authority
on every question of the form "what does this key take" — it is installed, so read it
rather than reasoning from the examples here:

```bash
less node_modules/@canonical/anatomy-dsl/definitions/style-keys.yaml
```

Each key carries a `valueKind` (`token`, `primitive` or `either`) and, where it takes a
token, the one `namespace` whose symbols it admits. Those two fields settle it: if a key
says `either`, a literal is legal there whatever the examples below happen to show, and
if it names a namespace, a symbol outside that namespace is not legal there however
well it reads. The roster's own header says how each value was measured, which is worth
reading once — a key exists because an implementation binds the property, and
`valueKind` is what the measurement found, not a preference.

A key outside the roster is rejected, and each key states what it admits:

- **token** — a symbol, always. `appearance.border.color`, `size.inline`.
- **primitive** — a literal, always. `layout.type`, `appearance.border.style`.
- **either** — a symbol or a literal, because the corpus binds both.
  `appearance.background`, `spacing.gap`.

And each token-taking key admits ONE namespace, in three spellings — the family, its
modifier channel and its surface channel:

| Key family | Namespace it admits |
|---|---|
| `appearance.background`, `appearance.border.*.color`, `appearance.outline.color`, `typography.color` | `color.`, `modifier.color.`, `surface.color.` |
| `appearance.border.width`, `appearance.outline.*`, `appearance.radius`, `layout.flex.basis`, `layout.offset.*`, `size.*`, `typography.letterSpacing`, `typography.size`, `typography.decoration.*` | `dimension.`, `modifier.dimension.`, `surface.dimension.` |
| `spacing.gap*`, `spacing.internal.*`, `spacing.external.*` | `spacing.`, `modifier.spacing.`, `surface.spacing.` |
| `typography.font`, `typography.fontFamily`, `typography.lineHeight`, `typography.weight` | `typography.`, `modifier.typography.`, `surface.typography.` |
| `motion.duration`, `motion.easing` | `motion.`, `modifier.motion.`, `surface.motion.` |

Read the table as a summary of the roster, not as a substitute for it: where the two
differ the roster is right and this table is stale. Note in particular that several
keys in the `dimension.` row are `either`, not `token` — `appearance.radius` is one, so
`appearance.radius: 1rem` is a lawful binding where the implementation writes `1rem`
literally and declares no variable. The namespace constrains which SYMBOL may go on a
key; it does not turn an `either` key into a token-only one.

**Spacing keys admit `dimension.*` too, for now.** Not one of the twelve `spacing.*`
roles resolves to the same dimension in every product context, and the implementations
read `--dimension-*` directly for padding and gaps. So where the stylesheet reads
`--dimension-200`, the anatomy writes `dimension.200` on the spacing key, and the
second namespace is in the roster for exactly as long as that is true — it comes back
out once a semantic spacing namespace lands. Write the symbol the implementation reads,
not the role you would have chosen.

**Not every CSS property has a key.** `box-shadow`, `animation`, a vendor prefix, a
mask: no key in the roster takes them, so an anatomy does not bind what the
implementation consumes through them, and a `#` comment on the node says what was
left unbound. Do not invent a key for a property that has none.

### The keys, by family

Every key below is in the roster, and the comment says what it admits. Where a key
takes `either`, the choice is not taste: bind the symbol where the implementation
reads a variable, and write the literal where it writes a literal.

#### Layout — primitives throughout
```yaml
layout.type: inline-flex                  # the display type, as CSS spells it
layout.direction: column
layout.align: center                      # align-items, on the node that is the container
layout.alignSelf: center                  # align-self, on the child that overrides it
layout.alignContent: center               # align-content, on the container
layout.justify: space-between
layout.wrap: wrap
layout.overflow: hidden
layout.flex.grow: 1
layout.flex.basis: 20rem                  # either: a dimension symbol or a literal
layout.position: relative
layout.grid.columns: repeat(2, 1fr)
layout.offset.top: dimension.100          # either: dimension.*
```

**`layout.align` is `align-items` and nothing else.** The roster carries three keys
where CSS has three properties, so there is nothing to disambiguate by context: a
child's `align-self: center` is `layout.alignSelf: center` on that child, and
`align-content` is `layout.alignContent`. Writing `layout.align` on a leaf that
overrides its parent's alignment says the wrong thing — it reads as "this node aligns
ITS children" — and the gate will not catch it, because both keys are in the roster and
both take a primitive. Take the CSS property from the stylesheet and map it to the key
of the same name.

#### Spacing — a `spacing.*` role, or the `dimension.*` the stylesheet reads
```yaml
spacing.internal.inline.start: spacing.inset.action.inline   # padding, one side
spacing.internal.block.start: spacing.inset.surface.block
spacing.external.block.end: spacing.inset.surface.block      # margin, one side
spacing.gap: spacing.gap.mark.inline                         # gap between children
spacing.gap.block: spacing.gap.group.block                   # token only
spacing.internal.inline.end: dimension.200   # --dimension-200, read directly
```

**A symmetric CSS shorthand becomes both keys, written out.** There is no key for
`padding-block` or `padding-inline` as a pair, so a stylesheet's
`padding-block: var(--spacing-x)` is TWO bindings — `spacing.internal.block.start` and
`spacing.internal.block.end`, each carrying the same value — and `padding-inline`
likewise on `.inline.start` and `.inline.end`. The same holds for `margin-block` and
`margin-inline` on the `spacing.external.*` keys. Both sides are written; neither is
left implicit:

```yaml
# padding-inline: var(--spacing-inset-action-inline)
spacing.internal.inline.start: spacing.inset.action.inline
spacing.internal.inline.end: spacing.inset.action.inline
```

#### Appearance — colour and dimension
```yaml
appearance.background: [modifier.color.foreground.primary, color.foreground.primary]
appearance.border.color: [modifier.color.border, color.border]
appearance.border.width: dimension.stroke.thickness.medium
appearance.border.style: solid            # primitive
appearance.radius: dimension.radius.medium
appearance.outline.color@focus: [modifier.color.focusRing, color.focusRing, currentColor]
appearance.outline.width@focus: dimension.stroke.thickness.large
appearance.opacity: 0.5                   # primitive
```

#### Size — a dimension symbol, or a literal where the size is structural
```yaml
size.width: 100%                          # either: a literal is right here
size.max.width: 60rem
size.min.height: dimension.900            # token only
size.inline: dimension.400                # token only
```

#### Typography
```yaml
typography.font: typography.text.primary  # the composite
typography.size: dimension.size.fontSize.200
typography.weight: typography.weight.medium
typography.lineHeight: typography.text.primary
typography.color: [modifier.color.text, color.text]
typography.letterSpacing: dimension.letterSpacing.wide
typography.align: center                  # primitive
```

#### Interaction and motion
```yaml
interaction.cursor: pointer               # primitive
interaction.select: none                  # primitive
motion.property: background-color         # primitive
# No stratum declares a motion.* symbol yet, so a duration or an easing the
# stylesheet reads through a variable is not bound at all — a `#` comment on the
# node says what it reads. A literal the stylesheet writes literally is written.
motion.easing: ease-in-out                # either: a literal until the family lands
```

### Interaction States (`@state`)

A style key MAY take an `@state` suffix scoping its value to one interaction
state. The unmarked key IS the default state — `@default` is invalid.

```yaml
styles:
  interaction.cursor: pointer
  interaction.cursor@disabled: not-allowed
  appearance.background: color.foreground.primary
  appearance.background@hover: color.foreground.primary.hover
  appearance.outline.color@focus: [modifier.color.focusRing, color.focusRing]   # a channel may exist only in a state
```

**Vocabulary — closed, registry-governed.** Eight states, and only these:

| State | Meaning | What the implementation keys off |
|-------|---------|----------------------------------|
| `hover` | Pointer over the element | `:hover` |
| `active` | Being pressed or activated (MD3 *pressed*, Spectrum *down*) | `:active` |
| `disabled` | Interaction unavailable | `:disabled`, `aria-disabled` |
| `focus` | Keyboard focus indication | `:focus-visible` on the web |
| `selected` | Chosen within a set | `aria-selected`, and `:checked` where the control is one of a set |
| `expanded` | A disclosure is open | `[open]`, `aria-expanded` |
| `indeterminate` | A checkbox or a progress is mixed, on neither setting | `:indeterminate`, `aria-checked="mixed"` |
| `invalid` | Validation has failed | `:invalid`, `aria-invalid` |

The last three are the newest, and how they arrived is the rule: candidates
(`checked`, `visited`, `dragged`, `pending`, `error`, `read-only`) enter through
the registry with a definition and a per-platform mapping — NEVER by loosening the
schema locally. If an anatomy seems to need a ninth state, that is a registry
proposal, not a local decision. `open` is not a second spelling of `expanded`.

**States re-value channels; they never add structure.** This is the line to
hold:

- A state that changes the TREE is a `switch`, not a state. The test is whether
  the implementation RE-VALUES a channel in the state or changes what exists: a
  disclosure header that takes a different background while open is `@expanded`;
  the panel that exists only while open is a `switch`, and the same disclosure
  carries both.
- The gate and the appearance are separate questions.
  `props: { disabled: true }` PUTS a node in the disabled state; `…@disabled`
  styles say how it LOOKS there.
- The canonical state token is the base token path plus a state leaf
  (`color.foreground.primary.hover`), matching the token tree. Where a state-scoped
  value is a token path whose leaf is a state name, the leaf must agree with
  the key's `@state`.
- One `@` per key in this version. Compound states (`@selected@hover`) are
  reserved, not available.

## Templates

### Basic Component Template

```yaml
node:
  uri: {tier}.component.{name}
  styles:
    # Structural (invariant)
    layout.type: flex
    layout.direction: column

    # Themeable
    appearance.background: color.background
    spacing.internal.inline.start: spacing.inset.surface.block

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
    layout.type: flex
    layout.direction: column
    appearance.background: color.background
    # A shadow has no key: `box-shadow` is one of the properties the roster
    # leaves unmapped, so it is not bound and this comment is the record.
    appearance.radius: dimension.radius.full

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
    layout.type: flex
    layout.direction: column
    appearance.border.style: solid

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
    layout.type: flex
    layout.direction: column
  edges:
    - node:
        role: header tab
        styles:
          layout.type: flex
          layout.direction: row
          layout.align: center
          interaction.cursor: pointer
        edges:
          - node:
              role: control
              styles:
                size.width: dimension.300
                size.height: dimension.300
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
    layout.type: inline-flex
    layout.align: center
    spacing.gap: spacing.gap.mark.inline
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
    layout.type: flex
    appearance.background: color.background

  edges:
    - node:
        role: backdrop overlay    # anonymous - no uri
        styles:
          layout.type: block
          appearance.background: color.background.contrasted
          interaction.cursor: pointer
      relation:
        cardinality: "1..1"

    - node:
        role: content container   # anonymous wrapper
        styles:
          layout.type: flex
          size.max.width: 40rem
          spacing.internal.inline.start: spacing.inset.surface.inline
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
    layout.type: flex
    layout.direction: row
    layout.align: center
    layout.justify: center

    # Themeable
    spacing.internal.inline.start: spacing.inset.action.inline
    spacing.gap: spacing.gap.mark.inline
    appearance.background: color.foreground.primary
    appearance.radius: dimension.radius.medium
    typography.weight: typography.weight.medium

    # Interaction
    interaction.cursor: pointer
    motion.property: background, transform
    # The transition also reads --motion-duration-fast, which no symbol declares,
    # so the duration is not bound.

  edges:
    - node:
        role: icon
        styles:
          size.width: dimension.300
          size.height: dimension.300
      relation:
        cardinality: "0..1"
        slotName: icon

    - node:
        role: label
        styles:
          typography.size: dimension.size.fontSize.200
          typography.color: color.text.onForegroundPrimary
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

Two sources answer these, and they disagree more often than you would expect: the
block's `ds:hasProperty` rows in the graph, and the implementation you are authoring
from. The graph records what was DOCUMENTED; the implementation ships what was BUILT,
and the two run ahead of each other in both directions. Chip is the live case — the
graph lists `icon` and `badge` as properties that the current `ChipProps` does not
have, and marks `value` as required where the code renders it conditionally.

**An anatomy transcribes the implementation, so where they disagree the implementation
wins — and the disagreement is recorded, not smoothed over.** Write the tree the
stylesheet and the component file support, put a `#` comment on the node (or in the
file header) saying which graph row it departs from and why, and raise the mismatch:
a property in the graph that the code cannot reach is a documentation gap, and a part
in the code that the graph does not list is a specification gap. Neither is fixed by
inventing a node for a property nothing renders, or by marking a node required because
a row said `optional: "false"`.

The one exception is a block you were asked to author from its SPEC rather than from an
implementation — a component not built yet. There the graph is all there is, and the
anatomy follows it; say so in the file header, because the next reader cannot tell the
two situations apart from the file alone.

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
- Structural values (`flex`, `center`, `100%`) = invariant
- A symbol (spacing.inset.surface.block) = themeable

### 6. Bind Data and Pin Props

Both are optional, and both are decision gates — bring them to the person
rather than deciding alone.

**Projections** — ask whether this component is a view over a known entity. If
it is, give the root an `on`, then for each position ask: does it RENDER a field
(`projection.field` on the node), or is it FILLED BY a traversal
(`projection.field` on the relation)? Check every name against the provider SDL,
and re-check that each relation's cardinality matches the field's nullability
and multiplicity. Generic containers project nothing — that is a real answer.

**Pins** — for each named child, ask what the spec FIXES versus what it leaves
to the consumer. An intrinsic icon is pinned (`props: { icon: … }`); a
consumer-filled icon slot is not. Confirm each prop name against
`pragma block lookup <Component>`; a pin naming a prop the component does not
have is invisible to schema validation and will only fail later.

### 7. Validate

Two checks, and they cover different ground. Know which is which before you read an
exit code as approval.

**What the gate checks.** `anatomies validate --authored` runs the law over every
authored file: that the document parses, that the root is named, that every style key
is in the roster, that every value has a lawful SHAPE, that every symbol-shaped element
RESOLVES in a stratum, and that each symbol sits inside the namespace its key admits.
That is a great deal, and it is all mechanical.

**What the gate does not check is whether the anatomy is TRUE of the component.** It
cannot: it never reads the stylesheet. So every one of these passes the gate silently —
a lawful key that is the wrong key for the CSS property (`layout.align` where the
stylesheet wrote `align-self`), a resolving symbol in the right namespace that is the
wrong symbol for the part, a node boundary drawn in the wrong place, a cardinality that
contradicts the component's own props, a missing node for a part the stylesheet draws.
Exit 0 with no findings means the file is LAWFUL. It does not mean the judgment calls
were right, and it is not a second opinion on them. The check that catches those is the
pull-request review by someone who can open the same stylesheet — which is why the file
goes through review at all.

So read the list below as the author's own pass, and keep its items honest about which
kind they are: the ones the gate will confirm, and the ones only a reader can.

Check your anatomy against:
- [ ] Root node is named (has `uri`)
- [ ] All cardinalities are valid notation
- [ ] Every style key is in the roster — the gate confirms this one
- [ ] Each key is the key for the CSS property the stylesheet actually wrote (judgment: `layout.align` for `align-items`, `layout.alignSelf` for `align-self`; the gate accepts either)
- [ ] Every style value is one dotted symbol, a fallback chain with at most one primitive LAST, or a primitive — no slash path, no `?` marker, no `root`/`$root` segment
- [ ] Every symbol resolves (`pragma token lookup <symbol>`) and sits in its key's namespace; a name that does not resolve is a `#` comment, never a value — the gate confirms both
- [ ] Every component-local variable that came back `ENTITY_NOT_FOUND` was followed through the component's own `:root` to a declared variable or a literal before it was written off
- [ ] `layout.type` and `layout.direction` are spelled as CSS spells them (`flex`, `grid`, `inline-flex`, `block`; `row`, `column`)
- [ ] Anonymous nodes have `role`, not `uri`
- [ ] Multi-word names encode word boundaries with `_`; `-` appears only where the name carries a dot (per the URI Encoding Convention table)
- [ ] Every non-root `uri:` either resolves (`pragma graph inspect ds:<uri>`) or is `$custom`, a template placeholder, or a new block or child this same spec introduces (§3)
- [ ] Named (`uri:`) children carry no copy of their own subtree — contextual style overrides only
- [ ] Nested components make semantic sense (judgment — nothing checks this but a reader)
- [ ] Every symbol is the right symbol for the part, not merely one that resolves in the key's namespace (judgment — the gate checks resolution and namespace, never fit)
- [ ] Switch cases carry `uri` or `node` and nothing else — no `default:`
- [ ] Every `@state` marker is one of hover, active, focus, disabled, selected, expanded, indeterminate, invalid — one `@` per key, never `@default`
- [ ] No `@state` stands in for a structural difference — that is a `switch`
- [ ] Every node `projection` has at least one of `on` / `field`; every relation `projection` has `field` and no `on`
- [ ] No projection spells an unwrapping path (`edges.node`), and every projected field name exists in the provider SDL
- [ ] Each projected relation's cardinality matches the field's nullability and multiplicity
- [ ] `props` appears only on named nodes, holds scalars only, and every pinned prop name exists on that component (`pragma block lookup`)
- [ ] A part the stylesheet draws as `::before`/`::after` is an anonymous `role:` node with a comment saying so, and no `slotName`
- [ ] Every `uri:` names a block in this tier or in `global`, and a `global` anatomy reaches into no app tier

Then run the law over the file, which is the check no list can stand in for:

```bash
bun src/cli.ts anatomies validate --authored
```

Exit 0 with `0 findings` is the verdict on lawfulness; a finding names the file, the uri
and the rule it broke, and a warning — `AT11`, a state binding differing from its base —
is usually the implementation telling the truth. What exit 0 does NOT settle is
anything in the paragraphs above: the semantic calls travel to review, so say in the
pull request which ones you made and what you read to make them.

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
1. Land the file at `anatomies/authored/{tier}/{uri}.yaml` in the design-system
   repository — never under `data/`, which the pull sync regenerates
2. `bun src/cli.ts anatomies validate --authored` — exit 0, and no findings
3. Review it as a file, in a pull request
4. `anatomies write` — dry, then a `--only <uri> --apply` canary, then `--apply`;
   after that the document is the source of record
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
/**
 * Keys may carry an "@state" suffix scoping the value to one interaction
 * state: "appearance.background@hover". The unmarked key is the default
 * state; "@default" is invalid. Vocabulary is closed: hover, active, focus,
 * disabled, selected, expanded, indeterminate, invalid.
 */
type Styles = Record<StyleKey, Symbol | [...Symbol[], Primitive?] | Primitive>;

/**
 * Symbol: a token symbol's own dotted name, as the token graph declares it.
 * Examples: "spacing.inset.surface.block", "color.background", "typography.heading.1"
 */
type Symbol = string;

/**
 * Primitive: a literal the implementation writes, resolved against nothing.
 * Examples: "flex", "center", "100%", 1.5, true
 */
type Primitive = string | number | boolean;

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

  /** The traversal populating this slot from the current data context. */
  projection?: RelationProjection;
}

/**
 * Fragment-style binding of a node to graph data, after the Relay
 * fragment-colocation pattern. `on` is a GraphQL type condition, which
 * establishes the data context on the root and narrows it on a child;
 * `field` is the field the node renders, relative to the enclosing
 * context. At least one of the two is required.
 */
type Projection =
  | { on: string; field?: string }
  | { on?: string; field: string };

/**
 * A traversal populating a slot, carried by the reified Relation: the
 * field of the current data context whose value(s) fill this position.
 * Names the field ONLY — never an unwrapping path like `edges.node`,
 * since connection-vs-list is a provider mechanism. Type narrowing lives
 * on the child node's own `on`, never here.
 */
interface RelationProjection {
  field: string;
}

/**
 * Pinned prop values: the anatomy FIXES props of the referenced component
 * at this position. Keys are props defined on the component in the design
 * system ontology; the DSL never defines the prop surface itself. Values
 * are scalars — no token paths, no fallback arrays. Named nodes only.
 */
type Props = Record<string, string | number | boolean>;

/**
 * Base interface for all nodes in the anatomy tree.
 */
interface BaseNode {
  /** Graph-data binding for this position. */
  projection?: Projection;

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

  /** Pinned prop values, e.g. { icon: "chevron-down" }. */
  props?: Props;
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
    layout.type: flex
    layout.direction: column

    # Themeable
    appearance.border.style: solid

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
    layout.type: flex
    layout.direction: column
  edges:
    - node:
        role: header tab
        styles:
          layout.type: flex
          layout.direction: row
          layout.align: center
          interaction.cursor: pointer
        edges:
          - node:
              role: control
              styles:
                size.width: dimension.300
                size.height: dimension.300
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
