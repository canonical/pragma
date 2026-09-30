# Preface

How stories are written in `@canonical/react-ds-global-form`: titles and decorators per tier, the shared helpers, and how a field's error state is shown. Read this before adding or changing a `*.stories.tsx` file in this package.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

Stories sit next to what they show, as `*.stories.tsx`. The shared helpers are in `src/storybook/`: `decorators.tsx` and the fixtures `fixtures.options.ts` (option lists) and `fixtures.fields.ts` (field definitions). Stories import them as `storybook/decorators.js` and similar; the package `tsconfig.json` maps bare specifiers to `src/`, and stories and `src/storybook/` are excluded from the `tsc` build, so this never reaches the published package. Storybook documentation pages are MDX files in `src/docs/`.

`decorators.tsx` has two helpers:

- `form(options?)` - a decorator that renders the story inside `FormProvider` and a `<form class="ds form subgrid">`, with `useForm({ mode: "onChange" })`, and sends the form state to the form-state addon panel. Its options are `defaultValues`, `className` for extra classes on the form, and `touchedFields`, a list of field names it marks as touched with `setValue(…, { shouldTouch: true })`, because react-hook-form has no way to declare fields touched by default.
- `surfaces(renderAtLevel)` - renders content in three nested `.surface` bands, to show how a control looks on each surface level. `src/docs/Surfaces.stories.tsx` uses it.

# Important

- Title a story by its tier: `subcomponents/<Name>`, `components/<Name>` or `patterns/<Name>`. The field machinery and utilities use `common/<Name>` and `utils/<name>`. A work-in-progress input or field is titled `_work_in_progress/subcomponent/<Name>` or `_work_in_progress/component/<Name>`, even though its source is in the normal tier folder.
- Render presentational inputs bare: no `form()` decorator and no wrapper, showing only the input's own states (default, disabled, checked and so on).
- Render every field and pattern inside `decorators: [decorators.form()]`, because they need the react-hook-form context.
- Show a field's error state as a `WithError` story: give the field a rule that fails for its starting value, and list its name in `form({ touchedFields: [name] })`. The wrapper then adds `.danger` and renders the error message. See `WithError` in `DateField.stories.tsx` and `Field.stories.tsx`.
- A field with a non-empty registration default, such as `ColorField` with `"#000000"`, can never fail a bare `required` rule; its error story needs a `validate` rule instead.
- Presentational inputs have no error stories, since the error state belongs to the wrapper.
