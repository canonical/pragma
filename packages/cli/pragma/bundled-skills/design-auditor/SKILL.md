---
name: design-auditor
description: Audit design system coverage, consistency, and quality; also runs as a guided tutorial on a worked example
---

# Design Auditor

Audit design system coverage, consistency, and quality. This semantic skill analyzes
the knowledge graph to find gaps, inconsistencies, and opportunities for improvement
across components, patterns, layouts, and documentation.

In a fresh session, orient first:

```bash
pragma capabilities
```

## Working mode: assistant to a design authority

An audit produces judgments, and most of the time those judgments belong to a senior
designer or engineer — you are the assistant whose job is to make them successful.
Default to that mode: lay out the audit direction, run the queries and return
digestible findings, and bring each judgment to the person as a recommendation plus a
question rather than a verdict. They know which gaps are deliberate, which components
are on the way out, and which numbers actually worry the team — the graph does not.

Full autonomy is the exception, not the default: run a whole audit alone only when
explicitly asked to. Even then, list every judgment call made unilaterally in the
final report so a human can revisit them.

Decision gates — in collaboration, pause at each and resolve it WITH the person:

1. Scope: which audit dimensions matter right now, and which tiers are in scope.
2. What counts as concerning: agree the thresholds with the team instead of importing
   folklore numbers — a "low" pattern count may be a young catalog, not a problem.
3. Prioritization of the recommendations.
4. Any promote/demote/deprecate suggestion — these are roadmap calls, not data calls.

## When to Use

- Reviewing design system health and completeness
- Finding components missing documentation or guidelines
- Identifying inconsistent modifier family usage
- Discovering orphaned or underutilized elements
- Preparing for design system roadmap planning
- Auditing before a major release

## When NOT to Use

- Auditing an APP's adoption of the design system — that is the
  `adoption-a1-styles`/`a2`/`a3` tracks
- Fixing what the audit finds — route gaps to `specify-component`/`specify-pattern`,
  missing anatomies to `anatomy-author`

## Opening move: ask, or offer the tutorial

Activation is an opening, not a starting gun. Unless the first message already names
the work, ask for the starting point — as a suggestion carrying an example, not as a
form to fill in:

> To get started, tell me what you'd like audited — the whole system, one tier, or
> just the worry, like "I think our modifier families have drifted".

The worry is the most useful of the three: it says which dimensions to run and which
numbers actually matter to the team. Ask again only for what the next step genuinely
blocks on.

If the activation message already carries the starting point, do not re-ask — say what
you took it to be, and go.

Offer the tutorial in the same breath, because this skill doubles as one:

> Or if you'd rather see how an audit works first, I can run it as a tutorial: I'll
> take one dimension — documentation coverage, say — and walk you through it end to
> end on the live graph.

Tutorial mode is the step narration below, turned up: the same outcome-path-conclusion
frame, with the reasoning at each decision gate made fully explicit and a check that
the person is with you before the next step. Stop short of anything that lands — no
report filed, no issues opened — unless they ask to keep what you built.

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

> **Documentation coverage, the first dimension.** The outcome is a count you can act
> on: which blocks carry a summary, usage and anatomy, and which are entries in name
> only. The path is the coverage query below, run per tier so a young tier is not
> scored against a mature one.
>
> …
>
> So: 12 of 87 blocks are undocumented and 9 of those sit in one tier — a tier-shaped
> problem rather than a system-wide one, which changes what the recommendation should
> say.

Don't:

> Coverage: 75/87 documented (86%). 12 missing.

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

> It audits the design system by querying the graph along chosen dimensions and
> turning counts into judgments — against thresholds agreed with the team, not
> folklore numbers, because a low count can be a young catalog rather than a problem.
> You end holding prioritised findings, each routed to the skill that fixes it, with
> the promote/demote/deprecate calls left where they belong: with the person.

Then, and only then, the breakdown.

## Discovery Flow

Start with a broad inventory, then drill into specific concerns:

```bash
pragma block list      # every component, pattern, layout and subcomponent, with type and tier
pragma modifier list   # every modifier family with its values
pragma tier list       # the tiers blocks can live in
pragma graph query "…" # the audit queries below
pragma graph inspect <IRI-or-ds:name>  # every triple on one entity
```

Two graph-query mechanics to know (shared with the sibling skills):

- Common prefixes (`ds:`, `cs:`) are applied automatically — no PREFIX preamble.
- Inside a SPARQL body, a local name with more than one dot
  (`ds:global.component.button`) does not parse — use the full IRI there
  (`<https://ds.canonical.com/global.component.button>`). Single-dot and dot-free
  prefixed names (`ds:global`, `ds:Component`) work as-is.

Note that `block list` deliberately omits the `ds:Group` class — an audit that counts
only the list under-counts. The queries below go to the graph directly, so they see
groups too.

> The covered set is whatever the graph answers today. Query it live — never copy its
> output (counts, names, ratios) into documentation, PRs, or this skill.

One more live-data rule: before trusting any query, confirm its predicates against the
current ontology (`pragma ontology lookup ds`). The vocabulary evolves — for example,
`ds:usage` subsumed the former `whenToUse`/`whenNotToUse` predicates, and queries
against retired names return empty tables, not errors. An empty result must be
distinguished from a wrong query before it becomes a finding.

## Audit Dimensions

### 1. Coverage Audit
What's documented vs. what's missing?

### 2. Consistency Audit
Are similar components structured similarly?

### 3. Quality Audit
How complete is the documentation?

### 4. Usage Audit
What's connected vs. orphaned?

### 5. Standards Audit
Do the implementations conform to the live code standards?

An audit that stops at the graph misses the code. For each audited implementation,
pull the applicable categories (`pragma standard categories`, then
`pragma standard list --category <framework>`) and read the Do/Don't pairs against
the source the implementation links to (`ds:headLink`). A violation is a finding with
the standard's name attached — as first-class as a missing anatomy. The standards
apply even where the audited app has no pragma dependency. Findings cut both ways:
where the team's practice is right and the standard is not, the finding becomes a
proposed change to the standard — the standards are open to contribution, and audits
are where their gaps surface.

## Key Queries

Documentation-completeness queries must catch BOTH the absent predicate and the empty
string — many entries carry a field that is present but blank, and a
`FILTER NOT EXISTS` alone misses them.

### Coverage: Components by Tier

```bash
pragma graph query "SELECT ?tierName (COUNT(?c) as ?componentCount) WHERE {
  ?c a ds:Component ;
     ds:tier ?tier .
  ?tier ds:name ?tierName .
} GROUP BY ?tierName
ORDER BY DESC(?componentCount)"
```

**What it asks**: where the catalog's weight sits. A tier with few components can be a
gap, a young tier, or a deliberate scope — which one is a question for the team.

### Coverage: UIBlock Types Distribution

```bash
pragma graph query "SELECT ?type (COUNT(?block) as ?count) WHERE {
  VALUES ?type { ds:Component ds:Pattern ds:Layout ds:Subcomponent ds:Group }
  ?block a ?type .
} GROUP BY ?type"
```

**What it asks**: the shape of the catalog. There is no universally healthy ratio —
compare against the previous audit's numbers and let the team judge the trend.

### Quality: Blocks Missing or Blank Summary

```bash
pragma graph query "SELECT ?block ?name WHERE {
  ?block a ?type ;
         ds:name ?name .
  VALUES ?type { ds:Component ds:Pattern ds:Layout ds:Subcomponent ds:Group }
  FILTER NOT EXISTS { ?block ds:summary ?s . FILTER(STR(?s) != '') }
}"
```

**What it asks**: which blocks have no base definition at all. These rows are also
what `implement-component` treats as "no spec here to implement".

### Quality: Components Missing or Blank Usage

```bash
pragma graph query "SELECT ?component ?name WHERE {
  ?component a ds:Component ;
             ds:name ?name .
  FILTER NOT EXISTS { ?component ds:usage ?u . FILTER(STR(?u) != '') }
}"
```

**What it asks**: where When-to-use / When-not-to-use guidance is missing (`ds:usage`
subsumes both). Without it, adopters cannot tell what replaces what — these gaps
directly hurt the adoption tracks.

### Quality: Components Missing or Blank Guidelines

```bash
pragma graph query "SELECT ?component ?name WHERE {
  ?component a ds:Component ;
             ds:name ?name .
  FILTER NOT EXISTS { ?component ds:guidelines ?g . FILTER(STR(?g) != '') }
}"
```

**What it asks**: where accessibility and best-practice material is missing —
`ds:guidelines` is its conventional home.

### Quality: Blocks Missing or Blank Anatomy

```bash
pragma graph query "SELECT ?block ?name WHERE {
  ?block a ?type ;
         ds:name ?name .
  VALUES ?type { ds:Component ds:Pattern }
  FILTER NOT EXISTS { ?block ds:anatomyDsl ?a . FILTER(STR(?a) != '') }
}"
```

**What it asks**: `anatomy-author` candidates.

### Consistency: Modifier Family Usage

```bash
pragma graph query "SELECT ?family ?familyName (COUNT(?component) as ?usage) WHERE {
  ?family a ds:ModifierFamily ;
          ds:name ?familyName .
  OPTIONAL {
    ?component a ds:Component ;
               ds:hasModifierFamily ?family .
  }
} GROUP BY ?family ?familyName
ORDER BY DESC(?usage)"
```

**What it asks**: which families are core and which are unused. A zero-usage family is
a question — premature abstraction, or adoption that has not landed yet?

### Consistency: Components Without Modifier Families

```bash
pragma graph query "SELECT ?component ?name WHERE {
  ?component a ds:Component ;
             ds:name ?name .
  FILTER NOT EXISTS { ?component ds:hasModifierFamily ?mf }
}"
```

**What it asks**: candidates to review — not every component needs modifiers, but
many do.

### Usage: Orphaned Subcomponents

```bash
pragma graph query "SELECT ?sub ?name WHERE {
  ?sub a ds:Subcomponent ;
       ds:name ?name .
  FILTER NOT EXISTS { ?sub ds:parentComponent ?parent }
}"
```

**What it asks**: subcomponents without parents — either the relationship is missing,
or the block should be promoted to Component. Which one is a team call.

### Usage: Components With Subcomponents

```bash
pragma graph query "SELECT ?component ?componentName (COUNT(?sub) as ?subCount) WHERE {
  ?component a ds:Component ;
             ds:name ?componentName .
  ?sub ds:parentComponent ?component .
} GROUP BY ?component ?componentName
ORDER BY DESC(?subCount)"
```

**What it asks**: where composition complexity concentrates. A very high count is a
prompt to ask whether the decomposition still serves its users.

### Cross-Tier: Potential Promotion Candidates

```bash
pragma graph query "SELECT ?component ?name ?tierName WHERE {
  ?component a ds:Component ;
             ds:name ?name ;
             ds:tier ?tier .
  ?tier ds:name ?tierName .
  FILTER(?tier != ds:global)
  FILTER EXISTS { ?component ds:hasModifierFamily ?mf }
  FILTER EXISTS { ?component ds:summary ?d . FILTER(STR(?d) != '') }
  FILTER EXISTS { ?component ds:usage ?u . FILTER(STR(?u) != '') }
}"
```

**What it asks**: well-documented tier-specific components that MIGHT be universal.
Promotion is a roadmap decision — present these as candidates, never as conclusions.

## Audit Report

Build the report from the live query results, structured as:

```markdown
## Design System Audit Report

**Generated:** {date}   **Scope:** {tiers/dimensions agreed at the scope gate}

### Executive Summary
Counts per UIBlock type and per tier, documentation coverage percentages, and the
headline findings — with each "concern" label traced to a threshold the team agreed,
not an imported one.

### Findings per dimension
Coverage / Quality / Consistency / Usage — for each: the numbers, the specific blocks
affected, and the open question or recommendation. Route each actionable gap to its
skill: missing spec → specify-component / specify-pattern; missing anatomy →
anatomy-author.

### Recommendations
Prioritized WITH the person (decision gate 3). Mark which items are data-driven
(e.g. "12 components have a blank summary") and which are judgment
(e.g. "consider promoting X to global").

### Appendix
The raw query results the findings rest on, in collapsible sections.
```

## Workflow

### Quick Health Check

```text
1. pragma block list + pragma modifier list — the big picture
2. Run the three Quality queries (summary, usage, guidelines)
3. Run Modifier Family Usage
4. Report the counts and the specific blocks; agree with the person what, if
   anything, is alarming
```

### Full Audit

```text
1. Scope gate: agree dimensions and tiers with the person
2. Inventory: block list, tier list, modifier list, types-distribution query
3. Coverage queries, Quality queries, Consistency queries, Usage queries
4. Compare against the previous audit's report where one exists
5. Draft the report; resolve interpretation and priorities with the person
```

### Targeted Audit

| Concern | Queries to Run |
|---------|----------------|
| "Are we missing patterns?" | Coverage by tier, types distribution |
| "Is documentation complete?" | All Quality queries |
| "Are modifiers consistent?" | Modifier Family Usage, Components Without Modifiers |
| "Any orphaned elements?" | Orphaned Subcomponents |
| "What needs promotion?" | Promotion Candidates |

## Interpreting Results

Interpretation is where the working mode matters most. The queries return facts; what
they MEAN is judged against the team's intent:

- Prefer trends over absolutes: compare with the previous audit rather than against a
  fixed "healthy" number.
- A gap can be deliberate (out-of-scope tier, deprecation in progress) — ask before
  flagging.
- Distinguish data findings (a blank field IS blank) from judgment findings (a ratio
  "looks" off) and label them differently in the report.
- Follow up drill-downs with `pragma graph inspect <IRI>` on the specific blocks a
  query surfaced, and `pragma block lookup <Name>` for the human-readable view.

## Limitations

- Cannot assess visual design quality (only metadata)
- Cannot verify Figma link validity (only presence)
- Pattern quality is subjective (coverage is objective)
- Does not analyze implementation packages — the graph records what is DOCUMENTED,
  and packages ship what is BUILT; the two run ahead of each other in both directions
  (see `adoption-a2-components` for the export check)

## Support

If this skill leads somewhere broken — a command that errors, guidance that
contradicts what the live system answers, a gap the flow cannot cover — you are not
stuck:

- Raise an issue in the pragma repo: https://github.com/canonical/pragma/issues —
  include the skill name, what was run, and expected vs. actual outcome.
- Or contact the design-system team owners directly through your organization's
  professional messaging channels for assistance.
