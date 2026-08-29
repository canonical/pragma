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
     A bare name can match blocks in several tiers, and `block lookup` silently picks
     one — it resolves `ds:name` globally and cannot be steered to a tier. Take the
     picked block's tier from the lookup's own `- Tier:` line, and check for other
     tiers carrying the name with the name query below, then address the tier you
     want by its IRI.

     ```bash
     pragma graph query "SELECT ?b WHERE { ?b ds:name ?n . FILTER(LCASE(?n) = LCASE('<Name>')) }"   # every tier carrying the name
     ```

     If the lookup picked the wrong tier's block, read the one you want with
     `pragma graph inspect <IRI from that row>` instead — step 2 derives the package
     from the tier of the block confirmed HERE.

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
     above. (A `block list` row prints the `ds:` form — `graph inspect` takes it
     as-is, but a SPARQL body needs the full IRI: join `https://ds.canonical.com/`
     with the row's dotted name, e.g. for the global Button,
     `<https://ds.canonical.com/global.component.button>`; the name query above
     prints that full form directly. The bracketed prefixed form `<ds:…>` silently
     returns an EMPTY table, not an error.)

     ```bash
     pragma graph query "SELECT ?p ?v WHERE { <https://ds.canonical.com/<dotted name from that row>> ds:hasProperty ?x . ?x ?p ?v }"
     ```
   - New block: the `specs/…` file its specify flow produced.
2. **Confirm the target package and tier.** The spec names its tier; `pragma tier list`
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
3. **Pull the applicable standards NOW.**

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

   (Inside a SPARQL body a local name with more than one dot does not parse; a
   single dot — `cs:testing.unit` — is fine.) `pragma standard lookup <name>` and
   `pragma standard sample` resolve only the standards that carry a `cs:name`
   title — today only a few do — so for the rest the graph query above is the read
   path. (MCP: standard_categories / standard_list / graph_query / graph_inspect.)

## Scaffold

```bash
pragma create component react src/components/Button
```

- The framework is a tree segment — `pragma create component <framework> <path>` with
  `react`, `svelte`, or `lit` as the segment; the path's final segment is the
  PascalCase component name.
- Run it from inside the target package confirmed in pre-flight step 2 — the path is
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
