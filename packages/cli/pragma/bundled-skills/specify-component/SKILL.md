---
name: specify-component
description: Specify a new design-system component with the knowledge graph, from graph search to a sync-safe spec file; also runs as a guided tutorial on a worked example
---

# Specify Component

Create a NEW component on the design/spec side, using the full power of the knowledge
graph. This skill supersedes the retired component-specifier skill (a name that no
longer resolves) with an eight-step flow: nothing is invented before the graph has been
searched, the entry shape comes from the ontology, and the output is a standalone spec
file the data sync cannot destroy.

In a fresh session, orient first:

```bash
pragma capabilities
```

## Working mode: assistant to a design authority

Most of the time this skill runs in collaboration with a senior designer or engineer —
they are the design authority, you are the assistant whose job is to make them
successful. Default to that mode:

- Lay out the workflow direction: say which step comes next and why, so the person
  always knows where the flow stands.
- Do the legwork yourself — graph searches, ontology reads, benchmark research — and
  bring back digestible findings, not raw dumps.
- Bring each decision to the person as a recommendation plus a question, never as a
  fait accompli. They hold context the graph does not — history, intent, naming
  precedent, roadmap — so ask the questions that draw that knowledge out, and use it.

Full autonomy is the exception, not the default: run the whole flow alone only when
explicitly asked to. Even then, list every judgment call made unilaterally in the
final report so a human can revisit them.

Decision gates — in collaboration, pause at each and resolve it WITH the person:

1. The step-1 verdict: exists/extend vs. a named gap.
2. The step-2 category choice (which `ds:UIBlock` subclass the entry is).
3. The step-3 boundary: how the definition disambiguates from its neighbors.
4. The step-4 adopt/reject decisions from the benchmark.
5. Whether the step-5 state gate fires, and the state model when it does.

## When to Use

- A component is proposed that the design system may not cover yet
- An existing component needs a formally specified sibling or replacement
- A gap found during adoption or implementation needs to become a real spec

## When NOT to Use

- Implementing an already-specified component — use `implement-component`
- Specifying a pattern (a recurring arrangement of components) — use `specify-pattern`
- Writing only the anatomy for an existing block — use `anatomy-author`

## Opening move: ask, or offer the tutorial

Activation is an opening, not a starting gun. Unless the first message already names
the work, ask for the starting point — as a suggestion carrying an example, not as a
form to fill in:

> To get started, tell me the component you'd like to work on — a name if it has one,
> or just the idea, like "it should let someone pick a date".

Rough is fine, and often better: step 1 turns an idea into a graph search, and the
search regularly renames the thing. Ask again only for what the next step genuinely
blocks on.

If the activation message already carries the starting point, do not re-ask — say what
you took it to be, and go.

Offer the tutorial in the same breath, because this skill doubles as one:

> Or if you'd rather see the flow first, I can run it as a tutorial: I'll take a
> plausible example — a date picker, say — and walk you through the eight steps on it.

Tutorial mode is the step narration below, turned up: the same outcome-path-conclusion
frame, with the reasoning at each decision gate made fully explicit and a check that
the person is with you before the next step. Stop short of anything that lands — no spec
file written, no proposal filed — unless they ask to keep what you built.

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

> **Step 1 — search the graph.** The outcome is a verdict: the thing already exists,
> an existing block should be extended, or there is a named gap worth specifying. The
> path is `pragma block list` for the catalog, then `block lookup` on the closest
> candidates.
>
> …
>
> So: nothing covers date entry, and the nearest neighbour (`Input`) stops at free
> text — a real gap, and one that step 2 has to place as a component rather than a
> pattern.

Don't:

> Step 1 — Search the graph
>
> 87 blocks. No date picker. Closest: Input, Select.

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

> It specifies a component against the knowledge graph, and the discipline is that
> nothing is invented before the graph has been searched: the entry's category comes
> from the ontology rather than from taste, the boundary is drawn against its real
> neighbours, and a benchmark decides what is adopted and what is refused. You end
> holding a standalone spec file the data sync cannot destroy, plus a record of every
> judgment call it took to get there.

Then, and only then, the breakdown.

## The spec falls under standards too

A spec is Turtle, and Turtle has standards — the `turtle` category, with `ui-blocks`
governing how blocks are modelled (take the actual set from
`pragma standard categories`, not from this list). Pull them before writing and hold
the Do/Don't pairs open; a spec that contradicts a pulled standard carries a DECLARED
deviation in the proposal, ideally also filed as an issue. The standards apply
independent of any package dependency and are open to contribution: a missing or
wrong modelling rule is something to propose a change for, not to silently work
around.

## The eight steps

### 1. Search the graph

Before anything is invented, find what already exists:

```bash
pragma block list                  # every component, pattern, layout and subcomponent, with its type and tier
pragma block lookup <Name-or-glob> # full spec of candidates: anatomy, modifiers, properties (MCP: block_lookup)
pragma block sample                # real entry shapes — read these BEFORE writing queries
pragma modifier list               # the modifier families blocks draw from
pragma tier list                   # the tiers a block can live in
```

**`block lookup` fans a shared name out across tiers, and the repeats are not
repeats.** A display name several tiers carry — or a glob matching them — answers with
one full writeup per tier, each under its own `## <Name>` heading with its own
`- Tier:` line, and those are DIFFERENT blocks: `Badge` returns the global, launchpad
and portal Badges, three independently authored specs with different summaries,
properties and anatomies. For this step that matters twice over. The answer is the
prior art, so skipping past the second and third headings as noise is how an
apps-tier block that already does the job goes unnoticed — read every one. And an
apps-tier block carrying the name is a different verdict from a global one: the first
may be a promotion candidate, the second means the gap is not a gap.

Three key forms, and only three: the display name, the `ds:`-prefixed IRI
(`pragma block lookup ds:global.component.badge`, which answers with exactly one
block), and a glob. The bare dotted name is not one of them — `block list` prints
`ds:apps_lxd.component.meter`, and pasting that row without its `ds:` prefix comes
back `ENTITY_NOT_FOUND`.

Search by name fragment when the naming is uncertain:

```bash
pragma graph query "SELECT ?b ?name WHERE { ?b ds:name ?name . FILTER(CONTAINS(LCASE(?name), 'crumb')) }"
```

> The covered set is whatever the graph answers today. Query it live — never copy its
> output into documentation, PRs, or this skill.

That query matches `ds:name` on ANY entity, so its rows are not necessarily blocks —
a modifier value (`ds:global.modifier.in_progress`) and a documentation tag will come
back alongside them, and neither is prior art. A non-empty table can still mean "no
block of this name exists". Read each row's IRI, or bind the type when the name is
noisy:

```bash
pragma graph query "SELECT ?b ?name ?type WHERE { VALUES ?type { ds:Component ds:Pattern ds:Layout ds:Subcomponent ds:Group } ?b a ?type ; ds:name ?name . FILTER(CONTAINS(LCASE(?name), 'crumb')) }"
```

Outcome gate: **either "exists — stop or extend it" or a NAMED gap.** No spec is written
without one of those two sentences, naming the blocks that were checked.

### 2. Understand the ontology

Read the shape the entry must satisfy:

```bash
pragma ontology lookup ds                    # the design-system vocabulary: its CLASSES
pragma ontology lookup ds --properties       # the predicates an entry carries — a section of its own, behind the flag
pragma ontology lookup ds --class UIBlock    # the block-level properties every entry carries
pragma ontology lookup ds --class Component  # what Component itself declares
```

The bare `ontology lookup ds` prints the classes and stops there; the predicates come
only with `--properties`. So a field name checked against the bare output looks absent
when it is not — confirm `ds:usage`, `ds:guidelines`, `ds:hasProperty` and the rest
against the properties section before writing a query or a spec field around them.

`--class` shows only what a class declares itself — usage, guidelines, properties,
and tier are declared on `ds:UIBlock` and inherited by its subclasses; `summary` and
`name` sit further up the chain on `ds:Entity`
(`pragma ontology lookup ds --class Entity`).

The documented conventions the entry follows:

- `ds:summary` — what the component is, in one or two sentences
- `ds:usage` — markdown with `### When to use` and `### When not to use` sections
- `ds:guidelines` — markdown; Accessibility material lives here by convention
  (contrast, alternative text, keyboard and focus behavior)
- `ds:hasProperty` — one entry per property: name, type, summary, optional, default,
  constraints
- Modifier families the component participates in
- The tier it belongs to
- The category definitions — `pragma ontology lookup ds` above lists every `ds:UIBlock` subclass; read what each one means with `pragma graph inspect ds:<Subclass>`
  (each prints its `skos:definition`; `--class` prints declared properties, not
  definitions), and state which category the entry belongs to BEFORE writing

Each field's acceptance criteria live on the property itself —
`pragma graph inspect ds:usage` / `ds:guidelines` print the `ds:acceptanceCriteria`
the content must satisfy; read them before writing the field.

Do not trust this list over the data: run `pragma block sample` and mirror what real
entries carry today. The draw is RANDOM and many blocks are near-empty, so a sample can come back content-free and teach you nothing: re-run it until it lands on a filled entry, or inspect a block you already know is documented.

### 3. Define the principles

Write the component's main definition — and write it to DISAMBIGUATE. Name the closest
existing blocks found in step 1 and state the boundary explicitly: "unlike X, this …".
A definition that could equally describe a step-1 neighbor is not done.

### 4. Research & benchmark

Study the same affordance or role in other design systems — React Aria, Carbon,
Material, shadcn (list extensible). Compare:

- API shape
- Accessibility pattern
- Naming
- State model
- Composition

Output: a short comparison table plus an explicit statement of what pragma adopts, what
it rejects, and why.

### 5. State-complexity gate

Decide whether the component carries complex, state-machine-like state: many interacting
modes, async transitions, orchestration across parts.

Calibration: a Button — hover, active, disabled visual states — does NOT fire this
gate; a Combobox — open/closed, filtering, async loading, selection moving between
input and list — does.

If YES, write a **"States & interaction"** section INSIDE the guidelines content of the
spec (the v0 home for the state spec), covering:

- The states
- Events and transitions between them
- The initial state
- Error states
- Keyboard interactions per state

If NO, say so in the spec and move on.

### 6. Write the documentation (without the anatomy)

Write the spec in markdown or Turtle following the step-2 structure: definition, usage,
guidelines (including the step-5 section when it fired), properties. The anatomy is
step 7, not here.

**Output location (hard rule)**: a standalone spec file the sync cannot destroy.

- In canonical/design-system: `specs/<tier>.<type>.<snake_name>.{md,ttl}`
  (e.g. `specs/global.component.carousel.md` — step 1 must have shown the name to be
  a genuine gap first)
- In any other repo: that repo's design-docs location

NEVER write into design-system `data/` — it is regenerated destructively from Coda by
CI, and hand edits are overwritten by the next sync. Database entry is a separate,
currently-human step: a person pastes the spec content into Coda.

### 7. Write the anatomy DSL

Delegate to the `anatomy-author` skill:

```bash
pragma skill lookup anatomy-author
```

**Read the repository's copy, not only the printed one, and prefer it where they
differ.** `skills/anatomy-author/SKILL.md` in canonical/design-system is the authority;
the copy `pragma skill lookup` prints is bundled into a pragma release and lags the
repository until the next one. So a section this step names and the printout does not
show is old text in the printout, not a section that is missing — open the repository
file before concluding anything is absent.

The skill covers named and anonymous nodes, edges with cardinality, slot names, and
CTI-inspired style keys; the full ANATOMY_DSL_SPEC ships beside it as
`ANATOMY_DSL_SPEC.md` in the installed `anatomy-author` skill folder (the lookup
renders SKILL.md only — open that file directly for the complete spec).

**A modifier family the spec claims is expressed in the anatomy by CONSUMING its
channel, never by naming it.** There is no style key, `@state` or `switch`
discriminator that takes a family name, so an anatomy that supports Criticality on its
fill colour says so by binding the channel of the symbol the fill reads —
`appearance.background: [modifier.color.foreground.primary, color.foreground.primary]`
for a filled surface, `typography.color: [modifier.color.text, color.text]` for text.
Which channels exist is the token graph's answer, not a guess:
`pragma token list --channel-of color.background` reports a surface channel and no
modifier one, so `modifier.color.background` is not a symbol and cannot be bound. The
family lands in
the channel: `pragma token values --symbol modifier.color.text` shows
`anticipation.caution` routing to `color.text.warning`, which is how Button's
Anticipation support reaches its text without Button's anatomy ever saying
"Anticipation". So when step 6 recorded a Modifier Families section, this step's job is
to name, per family, WHICH key carries it and which channel that key reads — and to
check the family actually covers that symbol (`pragma token lookup <symbol>`, the
`### Covered by` list). A family covering none of the symbols the anatomy binds is a
finding for the token owners, not something to express in the tree.

**Where the produced DSL lands.** An anatomy is a file of its own, not a section of
this spec: it goes to `anatomies/authored/<tier>/<uri>.yaml` in canonical/design-system,
with the file name spelling the dotted uri. There it is checked offline with
`bun src/cli.ts anatomies validate --authored`, reviewed as a file in a pull request,
and written to the block's `anatomy_dsl` cell by `anatomies write`; after that write the
document is the source of record. Never write into design-system `data/`, which the
pull sync regenerates. `anatomy-author`'s "Where the anatomy lands" section is the
authority on that path — this step's job is to hand it a specified component and take
back the file name it wrote.

### 8. Pair with tokens

Tokens here means token symbols — `color.text`, `dimension.200` — never CSS variables.
A variable such as `--color-text` is the web platform's name for a symbol, one name per
platform, and it is the implementer's concern: the anatomy names the symbol, and
`implement-component` reads `pragma variable lookup` to find what to write in CSS. A spec
that named variables would be tied to one platform and would miss every symbol the web
has not emitted yet.

The spec does not bind tokens — that is the anatomy's job, one style key at a time. What
this step owes is the check that the symbols the component will need actually exist, so
a specification does not promise a colour or a spacing role the token graph has never
declared:

```bash
pragma token list --search focus   # which symbols exist around a word
pragma token lookup color.text     # one symbol in full: type, description, definitions
```

`token list` pages at 300 rows sorted by name, so a bare `pragma token list` returns
colour tokens and nothing else — every dimension, number and typography symbol is off
the first page, behind an "and more exist" heading and an `--after` cursor that a pipe
into `grep` swallows. Always narrow (`--search`, `--type`) or raise `--limit` before
concluding a family is absent; an unnarrowed list is not evidence.

A name that comes back `ENTITY_NOT_FOUND` is a finding for the spec — either the
component reads an existing symbol instead, or a new token is a decision to raise with
the token owners, and either answer belongs in the spec rather than in the anatomy that
follows. (MCP: `token_list`, `token_lookup`.)

**`token lookup` resolving is the FIRST check, not the whole one.** It answers whether a
symbol exists; it says nothing about which style key the symbol may go on. Each key
admits symbols from one namespace only, and a symbol that reads as exactly on-topic can
still be outside it: `typography.text.tertiary` is a real composite typography token and
"12px tertiary text" is exactly what a small label wants, yet `typography.size` admits
`dimension.` symbols alone, so the binding is unlawful and
`dimension.size.fontSize.250` is what belongs there. Neither `token lookup` nor
`token list` knows that rule.

So the pairing has two checks, in order: `token lookup <symbol>` for existence, then the
anatomy gate for admissibility.

```bash
bun src/cli.ts anatomies validate --authored   # in canonical/design-system
```

It names the file, the node, the key, the symbol and the namespaces the key admits. Run
it before reporting step 8 as done, and treat a namespace rejection the way you treat an
`ENTITY_NOT_FOUND`: a finding to resolve against the roster
(`node_modules/@canonical/anatomy-dsl/definitions/style-keys.yaml`, which states the
`valueKind` and the namespace per key), never a value to force through.

## Response format

Report the spec-file path, then the eight step outcomes as a checklist (the reported
path ends in `.ttl` instead when step 6 took the Turtle branch):

```markdown
Spec: specs/<tier>.<type>.<snake_name>.md

- [ ] 1. Graph searched — verdict: exists/extend OR named gap (blocks checked: …)
- [ ] 2. Ontology shape read (classes and conventions applied)
- [ ] 3. Principles defined, disambiguated from: …
- [ ] 4. Benchmarked against: … (adopt/reject decisions stated)
- [ ] 5. State gate: fired/not fired (States & interaction section: yes/no)
- [ ] 6. Documentation written to the sync-safe location
- [ ] 7. Anatomy DSL written via anatomy-author (file: anatomies/authored/…)
- [ ] 8. Token pairing: symbols checked against the token graph AND the anatomy gate run (findings: …)
```

## Related skills

- `anatomy-author` — the step-7 engine
- `specify-pattern` — the same skeleton, context-first, for recurring arrangements
- `implement-component` — what happens after the spec is approved

## Support

If this skill leads somewhere broken — a command that errors, guidance that
contradicts what the live system answers, a gap the flow cannot cover — you are not
stuck:

- Raise an issue in the pragma repo: https://github.com/canonical/pragma/issues —
  include the skill name, what was run, and expected vs. actual outcome.
- Or contact the design-system team owners directly through your organization's
  professional messaging channels for assistance.
