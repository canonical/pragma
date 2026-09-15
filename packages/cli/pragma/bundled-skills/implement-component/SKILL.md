---
name: implement-component
description: Implement a specified design-system component with pragma create, following the live code standards; also runs as a guided tutorial on a worked example
---

# Implement Component

Take an APPROVED spec — from `specify-component`, or an existing documented block — to
working code. The defining discipline: the applicable code standards are pulled and held
open DURING implementation, so they shape the code as it is written, not only in review.

## Working mode

This skill often runs alongside a senior engineer or designer. When it does, work as
their assistant: lay out where the flow stands, do the legwork (spec reads, standard
pulls, scaffolding), and surface decisions rather than absorbing them silently. The
points to raise with the person rather than decide alone: a thin or ambiguous spec
field, any deviation from a pulled standard, the target package for a tier outside the
naming convention, and API naming the spec does not fix. When running fully
autonomously (only on explicit request), list those judgment calls in the PR.

## When to Use

- An approved spec — from `specify-component`, or an existing documented block — needs
  working code
- A scaffolded component needs to be implemented against the live code standards

## When NOT to Use

- No approved spec yet — run `specify-component` first (`specify-pattern` for a pattern)
- Only the anatomy is missing — that is `anatomy-author`
- Adopting existing components into an app — the `adoption-a1-styles` /
  `adoption-a2-components` / `adoption-a3-forms` tracks, not this skill

## Opening move: ask, or offer the tutorial

Activation is an opening, not a starting gun. Unless the first message already names
the work, ask for the starting point — as a suggestion carrying an example, not as a
form to fill in:

> To get started, tell me which block to implement — a name like "Badge", or point me
> at the spec it came out of. If the target framework or package isn't obvious, say
> that too.

If you are unsure whether the thing is specified at all, take the name anyway:
pre-flight is what decides, and it routes to `specify-component` when the spec turns
out not to be there. Ask again only for what the next step genuinely blocks on.

If the activation message already carries the starting point, do not re-ask — say what
you took it to be, and go.

Offer the tutorial in the same breath, because this skill doubles as one:

> Or if you'd rather see the flow first, I can run it as a tutorial: I'll pick a small
> documented block from the graph and walk you through it from pre-flight to review.

Tutorial mode is the step narration below, turned up: the same outcome-path-conclusion
frame, with the reasoning at each decision gate made fully explicit and a check that
the person is with you before the next step. Stop short of anything that lands — no
commit, no PR — unless they ask to keep what you built.

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

> **Pulling the standards, before any code.** The outcome is a shortlist held open
> while the Badge is written, so the code is shaped by the standards as it is written
> rather than corrected in review. The path is `pragma standard categories` for the
> live set, then `standard list --category <name>` for each one that applies.
>
> …
>
> So: `react`, `storybook` and `testing-unit` are the live shortlist and nothing in
> them contradicts the spec — implementation can proceed against them, with `css` and
> `styling` held back for the token work.

Don't:

> Step 3 — Pull the standards NOW
>
> Categories exist for: react (16), testing (+coverage/integration/regression/unit),
> storybook (11), css (15), styling (4).

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

> It takes an approved spec to working code, and the discipline that defines it is
> that the applicable code standards are pulled and held open DURING implementation —
> so they shape the code as it is written, not only in review. You end holding a
> scaffolded and implemented component, any deviation from a standard recorded next to
> that standard's name, and an independent review of the result.

Then, and only then, the breakdown.

## Pre-flight

1. **Read the spec.**
   - Documented block: `pragma block lookup <Name>` — anatomy, modifiers, properties in
     one read (MCP: block_lookup); `pragma graph inspect <uri>` for the full triple view.
     A bare name resolves `ds:name` globally, so where several tiers carry the name
     the lookup answers with EVERY one of them — the full writeups concatenated, each
     under its own `## <Name>` heading with its own `- Tier:` line. They are different
     blocks, separately authored, not repeats of one: the global Badge and the
     launchpad Badge have different summaries, properties and anatomies. So the read is
     not "confirm the tier it picked" but "count the headings and pick": scroll the
     whole answer, read every `- Tier:` line, and decide which block you are
     implementing. Stopping at the first heading is how a reader silently implements
     another tier's component.

     To skip the disambiguation, address one block directly by its `ds:` IRI, which
     `block lookup` accepts:

     ```bash
     pragma block lookup ds:global.component.badge   # exactly one block
     pragma graph query "SELECT ?b WHERE { ?b ds:name ?n . FILTER(LCASE(?n) = LCASE('<Name>')) }"   # every tier carrying the name
     ```

     The bare dotted name is NOT a key: `block list` prints
     `ds:apps_lxd.component.meter`, and pasting that row's name without its `ds:`
     prefix comes back `ENTITY_NOT_FOUND`. Keep the prefix, or use the display name.
     Step 2 derives the package from the tier of the block confirmed HERE, so make
     that choice explicit before moving on.

     **Check the entry is a spec before building on it — whatever class it is.**
     A row resolving is not the same as a block being documented: many entries
     across every class carry an empty `ds:summary`, `ds:usage` and `ds:anatomyDsl`,
     and `block lookup <Name>` still answers for them with a heading, a blank line
     and a `- Tier:` row. Judge the BASE DEFINITION: if `ds:summary`, `ds:usage` and
     `ds:anatomyDsl` all came back filled, the block is documented — implement it,
     and raise any single thin field (empty guidelines, say) as a gap rather than a
     blocker. If all three came back empty, there is no spec here to implement: route
     it to `specify-component`, per the When NOT to Use rules above.

     Then read whatever `ds:documentationStage` tag came back. The tag vocabulary is
     the graph's, not this skill's, so do not expect a fixed value list; **if the
     predicate is absent, no stage is recorded for that block** — say so and carry on
     with what the fields told you. The tag's MEANING is graph data too:

     ```bash
     pragma graph inspect ds:tag.<name>   # the tag the stage read returned; ds:whenToApply says what it means
     ```

     Split the action on what `ds:whenToApply` says. A tag meaning the block was
     rejected or triaged out, or that it is only PROPOSED or postponed — not yet
     accepted into the system: this is not an approved spec, route it to
     `specify-component`. A tag meaning the documentation is UNFINISHED: proceed, and
     say so in the PR — route to `anatomy-author` only the fields that actually came
     back empty, not the whole block. A tag whose `ds:whenToApply` comes back blank:
     the meaning is unrecorded — treat it as unknown, and say so.

     If the name has no row and the lookup errors, the block may be a Group — `block list`/`block lookup` cover no groups; the name query above returns its IRI for `pragma graph inspect <IRI>`.
     Groups are the one UIBlock class `block list` deliberately omits, so the graph
     entry is their only documentation surface — but the check above is the same
     check: read the base definition, then the stage.

     The inspect renders `ds:hasProperty` only as opaque blank-node labels; for the
     property content use the lookup's Properties section — only when the lookup
     resolved the block you want — or bind the property query to the block confirmed
     above. (A `block list` row prints the `ds:` form, and both `graph inspect` and a
     SPARQL body take it as-is — a prefixed name carrying dots parses. The full IRI
     (`<https://ds.canonical.com/global.component.button>`) is accepted too, and is
     what `graph query` prints back. What does NOT work is the bracketed prefixed
     form `<ds:…>`: it silently returns an EMPTY table, not an error.)

     ```bash
     pragma graph query "SELECT ?p ?v WHERE { ds:global.component.button ds:hasProperty ?x . ?x ?p ?v }"
     ```
   - New block: the `specs/…` file its specify flow produced.
2. **Check whether it is already implemented, before scaffolding anything.** The graph
   records implementations, and a block that already has one is not a scaffolding job:

   ```bash
   pragma implementation list --search <Name>   # which library implements it, on which platform, and the source file
   ```

   A row names the library, the platform and a link to the head of the source. Read
   what it points at before deciding: an implementation on the target platform means
   the work is an EXTENSION of that file, not a new component next to it — and running
   `pragma create` anyway leaves two components for one block. An implementation on
   another platform (a react one when the target is svelte) is still the reference to
   read for API and structure. Only when the search returns nothing for the target
   platform is a fresh scaffold the right move. Search by display name: a match on the
   block name also surfaces the groups built from it, so read the block name on each
   row rather than taking the first.

   If a same-platform implementation exists and the request was to build a new one,
   that is a decision to raise with the person, not to resolve by scaffolding.

3. **Confirm the target package and tier.** The spec names its tier; `pragma tier list`
   shows what exists. Where a package exists for the tier, its name follows a
   convention — the graph carries no package field: `@canonical/<framework>-ds-global`
   for the `global` tier, `@canonical/<framework>-ds-app` for the shared `apps` tier,
   and `@canonical/<framework>-ds-app-<app>` for an app-specific tier
   (`apps_lxd` → `@canonical/react-ds-app-lxd`). The `<app>` segment is the package's
   own short name, not always the tier suffix (the `apps_workplaceengineering` tier's
   package is `@canonical/svelte-ds-app-wpe`) — confirm the derived package actually
   resolves in the workspace before installing or scaffolding into it. Tiers outside
   `global`/`apps*` have no package convention today: there the target package is a
   decision to raise, not to derive.
4. **Pull the applicable standards NOW.**

   ```bash
   pragma standard categories                 # what categories exist today
   pragma standard list --category react      # swap react for the target framework category
   ```

   > The covered set is whatever the graph answers today. Query it live — never copy its
   > output into documentation, PRs, or this skill.

   Repeat the `--category` listing for the testing, storybook, css, and styling
   categories that apply to this component — take the category names from the
   `standard categories` output, not from memory.

   Then read the shortlisted standards' Do/Don't pairs — few-shot material to keep
   open in the working context while writing. The pairs live in the graph; pull them
   per category:

   ```bash
   pragma graph query "SELECT ?s ?kind ?caption ?code WHERE { ?s cs:hasCategory cs:react . { ?s cs:do ?x . BIND('do' AS ?kind) } UNION { ?s cs:dont ?x . BIND('dont' AS ?kind) } ?x cs:description ?caption . OPTIONAL { ?x cs:code ?code } }"
   ```

   Keep `cs:code` OPTIONAL as written — some pairs carry a caption and no code
   snippet, and requiring the code triple silently drops those standards from the
   result.

   For ONE standard, bind the same query to its IRI. (`pragma graph inspect cs:<id>`
   shows which predicates a standard carries, but renders `cs:do`/`cs:dont` only as
   opaque blank-node labels — the pairs come back through the query, not the
   inspect):

   ```bash
   pragma graph query "SELECT ?kind ?caption ?code WHERE { BIND(<http://pragma.canonical.com/codestandards#react.component.barrel_exports> AS ?s) { ?s cs:do ?x . BIND('do' AS ?kind) } UNION { ?s cs:dont ?x . BIND('dont' AS ?kind) } ?x cs:description ?caption . OPTIONAL { ?x cs:code ?code } }"
   ```

   Swap `cs:react` for each shortlisted category, using the category's GRAPH ID — not
   its display name. `standard categories` prints display names (`testing-coverage`);
   the graph ids differ (`testing.coverage`), and a display name pasted into the
   query returns an empty table, not an error. List the exact IRIs with
   `pragma graph query "SELECT DISTINCT ?c WHERE { ?s cs:hasCategory ?c }"` and paste
   one in full `<…>` form, e.g.:

   ```bash
   pragma graph query "SELECT ?s ?kind ?caption ?code WHERE { ?s cs:hasCategory <http://pragma.canonical.com/codestandards#testing.coverage> . { ?s cs:do ?x . BIND('do' AS ?kind) } UNION { ?s cs:dont ?x . BIND('dont' AS ?kind) } ?x cs:description ?caption . OPTIONAL { ?x cs:code ?code } }"
   ```

   Prefixed names with dots parse inside a SPARQL body, so `cs:testing.coverage` and
   `cs:react.component.barrel_exports` can be written in place of the full `<…>` form
   and answer identically. The full form is never wrong, and is what `graph query`
   prints back.

   **`pragma standard lookup <id>` is not the read path for most standards, so do not
   start there.** It resolves only the standards carrying a `cs:name` title — today a
   few do — and an id taken straight out of `standard list`'s own output
   (`css.selectors.namespace`) comes back `ENTITY_NOT_FOUND` with the standard's title
   offered as a "suggestion", which reads like a typo rather than like the tool
   answering a different question. The reliable pair is the two reads above:
   `pragma standard list --category <c>` for what exists, and the Do/Don't graph query
   for the pairs. `pragma standard sample` has the same title-only limit. Treat a
   `lookup` miss as saying nothing about whether the standard exists — the category
   listing is what says that. (MCP: standard_categories / standard_list / graph_query /
   graph_inspect.)

## Scaffold

```bash
pragma create component react src/components/Button
```

- The framework is a tree segment — `pragma create component <framework> <path>` with
  `react`, `svelte`, or `lit` as the segment; the path's final segment is the
  PascalCase component name.
- Run it from inside the target package confirmed in pre-flight step 3 — the path is
  package-relative (in the ds packages, components live at `src/lib/component/<Name>`,
  so the path there is `src/lib/component/Button`, not the generic example above).
- Plan-first: preview with `--dry-run`, apply non-interactively with `--yes`, reverse
  with `--undo`. Run without `--yes` to answer the generator's prompts interactively.
- The scaffold's include options (styles, stories, SSR tests) are prompt-derived and
  discoverable — read them from the leaf's own help, never from a copied table:

  ```bash
  pragma create component react --help
  ```

- MCP: the `create_component` tool ({framework, componentPath, …}); it returns a plan
  unless `confirm: true`.

The same generator is available as `summon component react src/components/Button` —
`pragma create <args…>` and `summon <args…>` are one machine in two binaries, identical
grammar. Teach and use the pragma spelling.

## Implement following the pulled standards

Write the component against the open Do/Don't pairs from pre-flight. When a case comes
up that the shortlist does not cover, widen before improvising: re-run
`pragma standard categories`, list the further categories that could apply
(`pragma standard list --category <c>`), and pull their Do/Don't pairs with the same
graph query as pre-flight. Each surface takes its own spelling: `--category` takes the
DISPLAY name `standard categories` prints (`testing-coverage`); the SPARQL body takes
the category's graph id from the `SELECT DISTINCT ?c` read there (`testing.coverage`) —
never the other way around. An empty pair table has two causes: a display name pasted
into the query, or a category that records standards but no Do/Don't pairs at all —
`pragma standard list --category <c>` distinguishes them (it lists the category's
standards either way; when no pairs exist, work from those standards' descriptions).

A standard you disagree with is feedback for the standards repo, not a license to
deviate silently.

### The variable to write, and what it stands for

The stylesheet is where the component meets the tokens, and the seam is queryable — so
no custom property goes into a stylesheet on a guess. What the reads below cannot do is
guarantee an answer: a symbol the anatomy names may have no counterpart in the live
token graph, and that is a finding to raise, not a blank to fill. The rule that follows
from it is the one to carry through this whole section: a name that does not resolve
stops the work on that declaration; it never licenses a value.

Six reads, each answering one question:

```bash
pragma block lookup Button                        # the anatomy the implementation owes: its nodes, keys and symbols
pragma token list --search radius                 # which symbols exist around a word, when the exact name is unknown
pragma token lookup color.text                    # one symbol: its type, description and every definition behind it
pragma token values --symbol modifier.color.text  # what it resolves to at each position
pragma variable lookup color-text                 # which CSS variable, declared where, emitting what
pragma variable chain --variable color-text       # what that variable finally reaches
```

**`block lookup`** carries the `### Anatomy (DSL)` section — the structure and the
style bindings the implementation owes. Read it as the contract, but read it with one
caveat: the anatomies are being rewritten by hand and written back to the document, and
until a block's rewrite has landed and the pack has been rebuilt, that section still
answers with the retired notation (slash paths like `color/text/muted`, `stack`,
`flow`, and `sth` placeholders). A slash path there is not a symbol to look up — the
dotted name is, and `anatomy-author` carries the notation in full. The section that
will list a block's token bindings directly arrives with those bindings; it is not in
the lookup's output yet.

Swapping the slashes for dots is a spelling change, and it is only the first thing to
try. It succeeds where the symbol kept its name and fails where the taxonomy moved
under it, and those two failures look identical at the prompt — both are
`ENTITY_NOT_FOUND`. So a miss on the dotted name is not the end of the read; it is the
start of a search:

```bash
pragma token list --search radius            # the family, under whatever name it has now
pragma token list --type dimension --limit 1000
```

Three outcomes, and they are different findings. The search turns up the same decision
under a new name — use it, and say in the PR that the anatomy still carries the old
one. The search turns up a family that was restructured rather than renamed, so the
decision the anatomy named no longer exists in that shape — that is a design question
for the token owners, and it belongs in the PR as one. Or the search turns up nothing
at all — also a finding, and the same answer: raise it. In none of the three do you
pick a near-miss symbol or write a raw value, because a token-typed property in the
anatomy is a design decision already made, and `cs:css.properties.values` — pulled in
pre-flight — bans a raw value in exactly that place. A blocked declaration named in the
PR is a better outcome than a stylesheet that resolves and is wrong.

**`token list`** is the search read, and it needs its filters to be trusted. It pages
at 300 rows sorted by name, so the first page of a bare `pragma token list` is colour
tokens and nothing else — every dimension, number, fontWeight and typography symbol is
off it. The output says so, in a heading that ends "and more exist" and a closing line
offering an `--after` cursor, but a bare list piped into `grep` swallows both and reads
as a system-wide absence. Never conclude "the graph has no such token" from an
unnarrowed list. Narrow instead: `--search <word>` over name and description,
`--type <type>` for one type's population, `--channel-of <symbol>` for the channels
provisioning one symbol (it takes a SYMBOL, not a family name — a family there is an
`INVALID_INPUT` error that lists what it would accept), and `--limit` raised past 300
when a full population is what you actually want.

**`token lookup <symbol>`** answers with the symbol's `- Type:` and `- Description:`, a
`### Definitions` list naming the file each definition comes from, a `### Covered by`
list of the modifier families that may rebind it, and a `### Values` list. That is what
tells you whether the symbol you are about to consume is the right one — the
description is written for exactly this decision. It does not tell you which STYLE KEY
the symbol is legal on: each key admits symbols from its own namespaces, and neither
`token lookup` nor `token list` knows about that rule. A symbol that resolves here can
still be the wrong symbol for the property you are writing — `anatomy-author` carries
the per-key namespaces, and `anatomies validate --authored` is what enforces them.

**`token values --symbol <symbol>`** is one row per position. For a channel it shows
the routing: `modifier.color.text | criticality.error | color.text.error` says that
under `.error`, reading the channel gets you the error text colour. For a flat symbol
it shows the resolved value per coordinate, `mode.dark` included.

**`variable lookup <name>`** takes the custom property WITHOUT its leading dashes and
is the read that tells you what to write in CSS. It answers with the `- Symbol:` the
variable stands for, its `- Tier:` and `- Visibility:`, and a `### Declarations` list:
one row per declaration, each naming the `selector` it is declared under, the
`inAtRule` cascade layer, what it `emits`, and the `file:line` it is declared at. A
`- Visibility: dt:visibility.internal` variable is not a component's to read directly
— `modifier-color-text` is internal, and a component reads it only as the head of the
chain the anatomy gives it.

The verb has THREE outcomes, and the third is the one that catches people out:

1. **It resolves and carries a `- Symbol:` line.** The variable stands for that symbol.
   This is the ordinary case, and the symbol is what you check against the anatomy.
2. **It resolves and carries NO `- Symbol:` line at all.** The variable is a derived
   one — a state product or a delta, autogenerated rather than authored — and it stands
   for no symbol. `hover--color-foreground-secondary` is one: it resolves, its `emits`
   is an `oklch(from …)` expression, and there is no symbol behind it. Do not read the
   missing line as a failed lookup, and do not treat the variable as a token. Ask what
   it reaches instead:

   ```bash
   pragma variable chain --variable hover--color-foreground-secondary
   ```

3. **`ENTITY_NOT_FOUND`.** The graph has never heard of the name.

That third outcome does NOT mean "yours to invent". It means one of two things, and
which one depends on the anatomy. For a property the anatomy never mentions —
`button-gap`, `icon-size`, a local alias the stylesheet declares for its own
convenience — it is genuinely component-local: yours to declare, standing for no token,
and that is the end of it. But for a token-typed property the anatomy DOES name, an
unresolved name is a gap between the anatomy and the token graph: either the anatomy is
still in the retired notation, and the rewrite has not landed for that block yet, or
the token was retired. Neither is a licence to write a value. Stop that declaration and
raise it, by the rule three paragraphs up.

So the question to ask of every `ENTITY_NOT_FOUND` is not "is it in the graph" but
"does the anatomy name it". The anatomy names it: raise it. The anatomy is silent:
declare it locally.

**`variable chain --variable <name>`** is the transitive walk — every
`variable | variable | symbol` triple the variable reaches through what its
declarations reference. Use it when `lookup`'s `emits` is another `var()` and you need
to know where the indirection ends: `color-text` reaches `color.palette.black` and
`color.palette.white`, which is `light-dark()` spelled out.

The same reads are MCP tools — `block_lookup`, `token_list`, `token_lookup`,
`token_values`, `variable_lookup`, `variable_chain` — taking the same arguments.
`pragma capabilities` prints the current catalog, which grows between releases.

## Post-flight

- Fill in the stories and tests the scaffold stubbed — the spec's properties, modifiers,
  and states each get exercised.
- Register the component per the package's convention (barrel/export registration).
- Run the package's own `bun run check` and `bun run test` (the repo-standard script
  names) until green.

## Close: independent review

Finish by invoking the `standards-review` skill as the independent quality gate over the
diff:

```bash
pragma skill lookup standards-review
```

It ships from canonical/web-code-standards once that skill lands; until then the
lookup will not resolve. Fall back to re-reading the pre-flight Do/Don't material
against the diff yourself, and say in the PR that the independent gate was
unavailable.

## Related skills

- `specify-component` — upstream: produces the spec this skill implements
- `anatomy-author` — the structure contract the implementation must honor

## Support

If this skill leads somewhere broken — a command that errors, guidance that
contradicts what the live system answers, a gap the flow cannot cover — you are not
stuck:

- Raise an issue in the pragma repo: https://github.com/canonical/pragma/issues —
  include the skill name, what was run, and expected vs. actual outcome.
- Or contact the design-system team owners directly through your organization's
  professional messaging channels for assistance.
