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
pragma block lookup <Name-or-glob> # full spec of candidates: anatomy, modifiers, properties (MCP: block_lookup); a glob repeats a multi-tier name once per IRI and every repeat is the SAME block — the fragment query below lists the tiers
pragma block sample                # real entry shapes — read these BEFORE writing queries
pragma modifier list               # the modifier families blocks draw from
pragma tier list                   # the tiers a block can live in
```

Search by name fragment when the naming is uncertain:

```bash
pragma graph query "SELECT ?b ?name WHERE { ?b ds:name ?name . FILTER(CONTAINS(LCASE(?name), 'crumb')) }"
```

> The covered set is whatever the graph answers today. Query it live — never copy its
> output into documentation, PRs, or this skill.

Outcome gate: **either "exists — stop or extend it" or a NAMED gap.** No spec is written
without one of those two sentences, naming the blocks that were checked.

### 2. Understand the ontology

Read the shape the entry must satisfy:

```bash
pragma ontology lookup ds                    # the design-system vocabulary
pragma ontology lookup ds --class UIBlock    # the block-level properties every entry carries
pragma ontology lookup ds --class Component  # what Component itself declares
```

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

The skill covers named and anonymous nodes, edges with cardinality, slot names, and
CTI-inspired style keys; the full ANATOMY_DSL_SPEC ships beside it as
`ANATOMY_DSL_SPEC.md` in the installed `anatomy-author` skill folder (the lookup
renders SKILL.md only — open that file directly for the complete spec). The produced
DSL lands in the step-6 spec file
under `specs/` — in a `.md` spec as its anatomy section, in a `.ttl` spec as the
block's `ds:anatomyDsl` string literal — never under `data/`; entry into Coda stays
the human step.

### 8. Pair with tokens — placeholder

**Left blank for now** — token pairing content lands with the token work. Do not invent
token guidance.

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
- [ ] 7. Anatomy DSL written via anatomy-author
- [ ] 8. Token pairing: placeholder (deferred)
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
