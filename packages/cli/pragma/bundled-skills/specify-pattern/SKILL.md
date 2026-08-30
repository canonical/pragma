---
name: specify-pattern
description: Specify a new design-system pattern from the repeatable user context it serves; also runs as a guided tutorial on a worked example
---

# Specify Pattern

Create a NEW pattern on the design/spec side. The skeleton is the same eight steps as
`specify-component`, with the emphasis inverted by the defining principle:

**A pattern is defined by the repeatable USER CONTEXT it serves — the situation, the
job, the flow it recurs in — more than by the atomicity of the element itself.**

A component earns its place by being a distinct element; a pattern earns its place by a
situation that keeps coming back and an arrangement that keeps answering it. Every step
below is aimed at that context.

In a fresh session, orient first:

```bash
pragma capabilities
```

## Working mode: assistant to a design authority

Most of the time this skill runs in collaboration with a senior designer or engineer —
they are the design authority, you are the assistant whose job is to make them
successful. Default to that mode: lay out the workflow direction step by step, do the
legwork (graph searches, ontology reads, benchmark research) and return digestible
findings, and bring each decision to the person as a recommendation plus a question
rather than a fait accompli. They hold context the graph does not — which situations
actually recur across products, history, naming precedent — so ask the questions that
draw that knowledge out; for patterns especially, the recurring CONTEXT often lives in
the person's experience before it lives in any data.

Full autonomy is the exception, not the default: run the whole flow alone only when
explicitly asked to. Even then, list every judgment call made unilaterally in the
final report so a human can revisit them.

Decision gates — in collaboration, pause at each and resolve it WITH the person:

1. The step-1 verdicts: for the pattern AND for each composed component.
2. Whether the entry IS a pattern (a recurring arrangement, not a component or layout).
3. The step-3 context definition and composition rule — what is fixed, what varies.
4. The step-4 adopt/reject decisions from the benchmark.
5. The step-5 state model spanning the composed components.

## When to Use

- A recurring arrangement of components (a flow, a page region, a repeated pairing)
  needs a formal specification
- The same ad-hoc composition keeps being rebuilt across apps and should be named

## When NOT to Use

- Specifying a single element — use `specify-component`
- Implementing an already-specified block — use `implement-component`
- Writing only the anatomy — use `anatomy-author`

## Opening move: ask, or offer the tutorial

Activation is an opening, not a starting gun. Unless the first message already names
the work, ask for the starting point — as a suggestion carrying an example, not as a
form to fill in:

> To get started, tell me the pattern you'd like to work on — a name if it has one, or
> just the situation behind it, like "people keep having to confirm before something
> destructive happens".

The situation is the better of the two starts: this skill defines a pattern by the
context it serves, so what recurs matters more than what it is called. Ask again only
for what the next step genuinely blocks on.

If the activation message already carries the starting point, do not re-ask — say what
you took it to be, and go.

Offer the tutorial in the same breath, because this skill doubles as one:

> Or if you'd rather see the flow first, I can run it as a tutorial: I'll take a
> plausible example — confirming a destructive action, say — and walk you through the
> eight steps on it.

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

> **Step 1 — search the graph, twice.** The outcome is two verdicts: whether a pattern
> already answers this situation, and whether the components it would compose exist.
> The path is `pragma block list`, then `block lookup` on the near patterns and on each
> part.
>
> …
>
> So: no pattern covers destructive confirmation, and both parts it would compose
> (`Modal`, `Button`) already exist — the gap is the arrangement, not the pieces, which
> is exactly what step 2 has to defend.

Don't:

> Step 1 — Search
>
> No confirmation pattern. Modal and Button exist.

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

> It specifies a pattern, and the defining move is that a pattern is defined by the
> repeatable USER CONTEXT it serves — the situation, the job, the flow it recurs in —
> more than by the atomicity of the element. Every step is aimed at that context. You
> end holding a spec that names the situation, fixes what the arrangement holds
> constant and what it lets vary, and records the judgment calls behind both.

Then, and only then, the breakdown.

## The spec falls under standards too

A pattern spec is Turtle, and Turtle has standards — the `turtle` category, with
`ui-blocks` governing how blocks and their parts are modelled (take the actual set
from `pragma standard categories`, not from this list). Pull them before writing and
hold the Do/Don't pairs open; a spec that contradicts a pulled standard carries a
RECORDED deviation in the proposal, ideally also filed as an issue. The standards
apply independent of any package dependency and are open to contribution: a missing
or wrong modelling rule is something to propose a change for, not to silently work
around.

## The eight steps

### 1. Search the graph — patterns AND their parts

Search twice: for existing patterns near the candidate, and for the components the
candidate pattern composes.

```bash
pragma block list                  # patterns are blocks — the list covers them, with tiers
pragma block lookup <Name-or-glob> # the closest existing patterns, in full (MCP: block_lookup); a glob repeats a multi-tier name once per IRI and every repeat is the SAME block — the fragment query below lists the tiers
pragma block sample                # real entry shapes before writing queries
pragma modifier list               # the modifier families blocks draw from
pragma tier list                   # the tiers a block can live in
```

Search by name fragment when the naming is uncertain:

```bash
pragma graph query "SELECT ?b ?name WHERE { ?b ds:name ?name . FILTER(CONTAINS(LCASE(?name), 'nav')) }"
```

Then look up EACH component the candidate arrangement composes
(`pragma block lookup <Name>` per component) — a pattern spec over parts the system does
not cover is really a component gap plus a pattern gap; name both.

> The covered set is whatever the graph answers today. Query it live — never copy its
> output into documentation, PRs, or this skill.

Outcome gate: **either "exists — stop or extend it" or a NAMED gap**, for the pattern
and for each composed component.

### 2. Understand the ontology

Same read as specify-component:

```bash
pragma ontology lookup ds
pragma ontology lookup ds --class UIBlock    # the block-level properties every entry carries
pragma ontology lookup ds --class Pattern    # what Pattern itself declares
```

`--class` shows only what a class declares itself — Pattern declares nothing of its
own today; usage, guidelines, properties, and tier come from `ds:UIBlock`, and
`summary`/`name` from `ds:Entity`, further up the chain (`--class Entity`).

The entry follows the documented conventions — `ds:summary`; `ds:usage` with
`### When to use` / `### When not to use`; `ds:guidelines` with Accessibility as a
convention; `ds:hasProperty`; modifier families; tier — and `pragma block sample`
overrules this list wherever real entries differ. The draw is RANDOM and many blocks are near-empty, so a sample can come back content-free and teach you nothing: re-run it until it lands on a filled entry, or inspect a block you already know is documented. Each field's acceptance criteria
are on the property itself: `pragma graph inspect ds:usage` / `ds:guidelines` print
the `ds:acceptanceCriteria` the content must satisfy. Read the category definitions
too — `pragma ontology lookup ds` above lists every `ds:UIBlock` subclass; read what each one means with `pragma graph inspect ds:<Subclass>`
(each prints its `skos:definition`) — and confirm the entry IS a pattern — a recurring
arrangement, not a single element or a space-dividing layout — BEFORE writing.

### 3. Define the context and the composition rule

The main definition names the RECURRING CONTEXT, not just the shape:

- When does this arrangement apply — the situation, the job, the flow it recurs in
- Which components does it orchestrate
- What varies per use, and what is fixed (the composition rule)

Disambiguate from the step-1 neighbors explicitly ("unlike X, this …") — for a pattern
that includes naming the contexts the neighbors serve.

### 4. Research & benchmark pattern catalogs

Benchmark against the pattern sections of other systems — React Aria, Carbon, Material,
shadcn (list extensible): how they frame the same context, what they compose, the
accessibility pattern, the naming, the state model. Output: a short comparison table
plus what pragma adopts, what it rejects, and why.

### 5. State-complexity gate — expect it to fire

Patterns orchestrate state ACROSS components, so this gate fires more often than for a
single component: selection flowing between parts, async steps, wizard-like progressions.

When it fires, write the **"States & interaction"** section inside the guidelines
content of the spec, same as specify-component: states, events and transitions, initial
state, error states, keyboard interactions per state — here spanning the composed
components, not just one.

### 6. Write the documentation (without the anatomy)

Markdown or Turtle following the step-2 structure; category = pattern.

**Output location (hard rule)**: a standalone spec file the sync cannot destroy.

- In canonical/design-system: `specs/<tier>.pattern.<snake_name>.{md,ttl}`
- In any other repo: that repo's design-docs location

NEVER write into design-system `data/` — it is regenerated destructively from Coda by
CI, and hand edits are overwritten by the next sync. Database entry is a separate,
currently-human step: a person pastes the spec content into Coda.

### 7. Write the anatomy DSL — where the skeleton is stable

Where the pattern has a stable structural skeleton, write its anatomy via the
`anatomy-author` skill (`pragma skill lookup anatomy-author`). A pattern whose whole
point is a varying arrangement may carry only the invariant frame; say which parts are
anatomy and which are composition rule. The produced DSL lands in the step-6 spec file
under `specs/` — in a `.md` spec as its anatomy section, in a `.ttl` spec as the
block's `ds:anatomyDsl` string literal — never under `data/`; entry into Coda stays
the human step.

### 8. Pair with tokens — placeholder

**Left blank for now** — token pairing content lands with the token work. Do not invent
token guidance.

## Response format

Report the spec-file path, then the eight step outcomes as a checklist (pattern AND
composed components named in step 1; the composition rule stated in step 3).

## Related skills

- `specify-component` — the sibling flow for single elements (and for component gaps
  step 1 uncovers)
- `anatomy-author` — the step-7 engine
- `implement-component` — after the spec is approved

## Support

If this skill leads somewhere broken — a command that errors, guidance that
contradicts what the live system answers, a gap the flow cannot cover — you are not
stuck:

- Raise an issue in the pragma repo: https://github.com/canonical/pragma/issues —
  include the skill name, what was run, and expected vs. actual outcome.
- Or contact the design-system team owners directly through your organization's
  professional messaging channels for assistance.
