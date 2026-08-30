---
name: adoption-a3-forms
description: Migrate application forms to the Canonical form system built on react-hook-form (adoption track A3); also runs as a guided tutorial on a worked example
---

# Adoption A3 — Forms

The third adoption track: move the app's forms onto the design-system form package.
Prerequisite: track A1 (A2 recommended). Understand what this track is before starting:
the form system is a DIFFERENT PROGRAMMING MODEL built on react-hook-form, not a restyle
of your existing inputs.

## When to Use

- Track A1 is done and the app's forms should move onto the design-system form package
- A form is being built or rewritten and should use the `Form`/`Field` model from the
  start
- A form contains an input type the system does not cover — the `custom` escape hatch
  below keeps it inside the `Form` (and the gap is a finding to report)

## When NOT to Use

- The visual foundation is not in place yet — run `adoption-a1-styles` first
- Swapping non-form components — that is `adoption-a2-components`

## Opening move: ask, or offer the tutorial

Activation is an opening, not a starting gun. Unless the first message already names
the work, ask for the starting point — as a suggestion carrying an example, not as a
form to fill in:

> To get started, point me at the app and say which form you'd like moved first — or
> let me find the forms and suggest a starting one.

The smallest real form is usually the best first move: the programming-model switch is
easier to see on a short one. Ask again only for what the next step genuinely blocks
on.

If the activation message already carries the starting point, do not re-ask — say what
you took it to be, and go.

Offer the tutorial in the same breath, because this track doubles as one:

> Or if you'd rather see the model before touching your forms, I can run it as a
> tutorial: I'll take a plausible example — a couple of text fields and a select — and
> walk you through the migration on it.

Tutorial mode is the step narration below, turned up: the same outcome-path-conclusion
frame, with the reasoning behind each change made explicit. It runs on a scratch
example, not on the person's app — nothing in their repo changes unless they ask.

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

> **The first field conversion.** The outcome is one field moved onto the `Form`/`Field`
> model, proving the wiring end to end before the rest follow. The path is to replace
> the input with a `<Field>` and let `Form` own the state `useState` was holding.
>
> …
>
> So: the field validates and submits through react-hook-form and the local `useState`
> is gone — every remaining field is the same move, except the file upload, which needs
> the `custom` escape hatch.

Don't:

> Converted the email field. Works.

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

> It moves forms onto the design-system form package, and the thing to understand
> before starting is that this is a DIFFERENT PROGRAMMING MODEL built on
> react-hook-form — fields as data, `Form` owning the state — not a restyle of the
> existing inputs. You end with forms on the `Form`/`Field` model, and anything the
> system does not cover kept inside the `Form` through the `custom` escape hatch.

Then, and only then, the breakdown.

## Install + the forms styles import

```bash
bun add @canonical/react-ds-global-form @canonical/styles
```

Then BOTH stylesheets in the root stylesheet:

```css
@import url("@canonical/styles");
@import url("@canonical/react-ds-global-form/dist/esm/index.css");
```

The first brings the global reset and tokens; the second the input chrome and field
layout. The package builds on top of `@canonical/react-ds-global`.

Forms are the heaviest consumer of the density system: control heights, field spacing,
and baseline seating all read the `--density-*` channel, which only emits real values
when the app root carries its context and density classes
(`class="app comfortable"` — track A1's "Declare the surface" section). Confirm those
classes before judging any form layout: without them the primitives silently fall back
to app-comfortable values, and a `dense` or site-surface form renders with the wrong
geometry.

## Code standards are the gate

Form migration is component code, and it falls under the live code standards — the
`react` category at minimum, plus `testing` where the migration touches tests (take
the actual set from the live output, not from this list). Pull them BEFORE the first
field conversion and hold the Do/Don't pairs open while writing:

```bash
pragma standard categories                 # the live category set — never from memory
pragma standard list --category react
pragma standard lookup <name> --detail detailed
```

Apps follow the code standards as closely as the migration allows. Where a
conversion has to deviate from a pulled standard, record the deviation in the PR next
to the standard's name — and ideally file it as an issue, either to bring the app
into line later or to propose a change to the standard itself. The standards apply
even when the app has no pragma dependency, and they are open to contribution: a
missing or wrong standard is something to propose a change for, not to silently work
around.

## The react-hook-form switch

Form state moves INTO the form system:

- `<Form onSubmit={…}>` wraps a react-hook-form `FormProvider`. Pass your own `useForm`
  return via the `methods` prop when you need external control; otherwise `defaultValues`
  and `mode` are enough and the Form calls `useForm` internally.
- `Field` reads the form context via `useFormContext` — **a `Field` outside a `Form` is
  a bug**, not a styling choice.
- Migrating a form means DELETING its `useState`/`onChange` handler plumbing, not
  wrapping it. If the old state code survives the migration, the migration is not done.

## Fields as data

Each field is a declaration, not an assembly of label + input + error markup:

```tsx
<Form onSubmit={handleSubmit}>
  <Field name="email" inputType="email" label="Email address" description="Work address preferred" />
</Form>
```

`inputType` is a discriminated union selecting the input subcomponent — text, textarea,
select, checkbox, radio-style choices, date/time, phone, combobox, and more — and the
label, description, and error wiring come with the frame.

> The covered set is whatever the graph answers today. Query it live — never copy its
> output into documentation, PRs, or this skill.

Enumerate the input types that exist TODAY from the package's `Field` types and its
Storybook stories — not from this skill.

## The custom escape hatch

A one-off input stays INSIDE the system:

```tsx
<Field name="tags" inputType="custom" CustomComponent={TagPicker} label="Tags" />
```

`CustomComponent` is a `React.ComponentType<InputProps>`: it keeps react-hook-form
registration, the label/description/error framing, and validation. The escape hatch is
for the INPUT, never for leaving the `Form`.

## WIP-stage warnings

Input maturity is graph data, not folklore. Before building on an input type, read its
documentation stage — the stage lives on the block's graph entity:

```bash
pragma block list                 # find the input's row — it carries the block's IRI
pragma graph inspect <block IRI>  # every triple, including ds:documentationStage
```

Look the row up under the PACKAGE COMPONENT's name, not the `inputType` token — the
union maps several tokens onto one component (`"text"`, `"email"`, `"tel"` and `"url"`
all render `TextField`/`TextInput`; `"file"` renders `FileUploadField`; `"choices"`
renders `ChoicesField`). Read the component a token selects from the package's `Field`
types above, then find THAT name's row.

An input name can be declared at more than one tier, so the list can carry a row per
tier — names resolve globally, not within one tier. To list every tier that declares
the name, the name query
`pragma graph query "SELECT ?b WHERE { ?b ds:name ?n . FILTER(LCASE(?n) = LCASE('<Name>')) }"`
prints every tier's IRI. Inspect the one whose tier matches the package you
installed — `global` for `@canonical/react-ds-global-form`'s inputs; the stage
below is per-block, so another tier's row answers about a different block.

Read whatever `ds:documentationStage` tag comes back — the tag vocabulary is the
graph's, not this skill's, so do not expect a fixed value list; if the predicate is
absent, no stage is recorded for that block. The tag's MEANING is graph data too —
inspect the tag entity itself:

```bash
pragma graph inspect ds:tag.<name>   # the tag the stage read returned; ds:whenToApply says what it means
```

Split the action on what `ds:whenToApply` says. A tag meaning the block was rejected
or triaged out, or that it is only PROPOSED or postponed — not yet accepted into the
system: do NOT build on that input — raise it as a gap (the `custom` escape hatch
covers the form meanwhile). A tag meaning the documentation is unfinished: the block
may change under you — SAY SO in the migration PR rather than discovering it in
production. A tag whose `ds:whenToApply` comes back blank: the stage's meaning is
unrecorded — treat it as unknown, and say so in the PR.

Debug aid: `@canonical/storybook-addon-form-state` adds a Storybook panel showing the
live react-hook-form state while you exercise a story.

## Verify

- [ ] Root context and density classes present (track A1) — field spacing and control
      seating read the `--density-*` channel.
- [ ] Submit round-trip works, with validation errors surfaced per field.
- [ ] The whole form is completable keyboard-only.
- [ ] Zero dev-console warnings from the form components.

## Support

If this skill leads somewhere broken — a command that errors, guidance that
contradicts what the live system answers, a gap the flow cannot cover — you are not
stuck:

- Raise an issue in the pragma repo: https://github.com/canonical/pragma/issues —
  include the skill name, what was run, and expected vs. actual outcome.
- Or contact the design-system team owners directly through your organization's
  professional messaging channels for assistance.
