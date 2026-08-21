# Preface

Storybook conventions for `@canonical/react-ds-global-form`: the decorators, the
per-tier story shape, and how field state (touched, error) is set up. Read this
before adding or changing a `*.stories.tsx` here. For the component architecture see
`.kb/architecture.md`.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

Stories live next to their component as `*.stories.tsx`. Shared Storybook helpers are
in `src/storybook/` and imported via the `storybook/*` alias (from
`@canonical/storybook-config`), e.g. `import * as decorators from
"storybook/decorators.js"`. Fixtures (option lists) are in
`storybook/fixtures.options.js`.

# Architecture

## Per-tier story shape

- **`subcomponent/` (presentational inputs)** render **bare** — no form decorator,
  no Wrapper. They demonstrate the input's own markup/states (Default, Disabled,
  Checked, …). Titled `subcomponents/<Name>`.
- **`component/` (`*Field`)** always run inside the `form()` decorator (they are
  react-hook-form-bound and need a `FormProvider`). Titled `components/<Name>`.
- **`pattern/`** (`Field`, `Form`) also use `form()`. Titled `patterns/<Name>`.

## Decorators (`src/storybook/decorators.tsx`)

- **`form(options?)`** — wraps the story in `FormProvider` + `<form class="ds form
  subgrid">` with `useForm({ mode: "onChange" })` and emits state to the form-state
  addon. Options: `defaultValues`, `className`, and `touchedFields: string[]` — the
  listed fields are marked touched (via `setValue(..., { shouldTouch: true })`) so
  validation errors surface immediately (react-hook-form has no `defaultTouched`).
- **`grid()`** — wraps the story in `.grid.responsive` (the 4/8/12-column design-system
  grid). `.ds.form` is a `subgrid`, so column-based field layouts (ChoicesField's
  `--choices-span`, SimpleChoicesField's `"columns"`) only resolve real column tracks
  inside a parent `.grid`. Compose grid-outside-form: `decorators: [grid(), form()]`.

## Showing the error state

Error state is owned by the field Wrapper (it adds `.danger` when react-hook-form
reports an error), so it is a **field-tier** concern:

- On a `*Field`, an error story renders the field inside `form({ touchedFields:
  [name] })` with a validation rule that fails for the (empty) value — so RHF reports
  the error, the Wrapper adds `.danger`, and the `FieldError` message shows. Prefer a
  shared factory over hand-rolling each one. Note a field with a non-empty registered
  default (e.g. ColorField's `#000000`) needs a `validate` rule, not a bare
  `required`, since `required` can never fail for it.
- A presentational subcomponent has no Wrapper, so its error story reproduces the
  `<div class="ds field danger"><div class="payload">…</div></div>` ancestor context
  via a decorator (plus a `FieldError` message) — showing the visual error layer the
  subcomponent owns without faking RHF state.

> Note: the shared error-story helpers (`errorStory()` and the `danger()` decorator)
> and the per-component `WithError` / `ErrorState` stories land via a separate PR; this
> section describes the intended convention. Until then, `form()` + `touchedFields`
> is the mechanism for a field error story.
