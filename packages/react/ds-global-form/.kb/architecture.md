# Preface

The tier architecture of `@canonical/react-ds-global-form`, the machinery every
field is composed from, and the field-level conventions (required/optional marking,
error state, input chrome). Read this before adding or moving an input, field, or
pattern, or before touching the `common/` machinery. For Storybook see
`.kb/storybook.md`.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

`src/lib/` is organised in ontology tiers plus two non-tier support folders. Each
tier may only depend *downward*; the machinery in `common/` is depended on by all
tiers but depends on none of them.

- `subcomponent/` — presentational inputs, **no** react-hook-form. One folder per
  input (`TextInput`, `CheckboxInput`, `SelectInput`, `PhoneInput`, …) plus the field
  chrome `Field/{Label,Description,Error}`. May import only shared types.
- `component/` — the RHF-bound `*Field` wrappers, one per input (`TextField`,
  `CheckboxField`, `RangeField`, …), each built by composing `common/` + a
  `subcomponent/` input.
- `pattern/` — `Field` (a discriminated-union switch that routes an `inputType` to
  the right `*Field`, with a custom passthrough) and `Form` (the `FormProvider`
  wrapper). This tier is the public surface.
- `common/` — the machinery: `bindField/`, `Wrapper/` (+ `withWrapper`), and the
  shared prop types (`BaseInputProps`, `InputProps<T>`, `WrapperProps<T>`).
- `utils/` — `hooks/` (`useFieldAriaProperties`, `useFieldError`), `middleware/`
  (REST options/validation), and `countries/` (phone dial codes + masks).

**Public surface:** `src/lib/index.ts` exports only `pattern/*` and
`utils/middleware/*`. The `component/` and `subcomponent/` tiers are internal —
consumers reach inputs through `<Field inputType="…">` or `<Form>`, never by deep
import. Renaming a `*Field` is therefore not a breaking change.

# Architecture

## The composition machinery

Every `*Field` is `withWrapper(bindField(Input, mode, options?))`.

`bindField<P>(Presentational, mode, options?)` (`common/bindField/bindField.ts`)
turns a presentational input into an RHF-bound one. `BindMode` is `"native" |
"controlled"`:

- `"native"` — spreads `register(name, registerProps)` onto the input (uncontrolled;
  the default for most inputs).
- `"controlled"` — lifts `useController()` and passes `value`/`onChange`/`onBlur`/
  `ref`, for inputs that need a live value (e.g. Color, FileUpload).

`BindFieldOptions`:

- `registerDefaults?: RegisterOptions` — merged *under* the consumer's
  `registerProps` (`{ ...registerDefaults, ...registerProps }`), so the consumer
  always wins. Example: `RangeField` passes `{ valueAsNumber: true }` so RHF stores a
  number, not the string the input reports.
- `injectValue?: boolean` — supplies a live `value` prop via a watch (Range's
  `<output>`).
- `defaultValue?` — the registration default in controlled mode.

`withWrapper(Component, options?, Wrapper?)` wraps the bound field in the field
chrome. `Wrapper` (`common/Wrapper/Wrapper.tsx`) renders `.ds.field` (a subgrid,
gains `.danger` on error) containing the `<Label>` and a `.payload` div
(description + input + error message), and threads the aria props from
`useFieldWrapper` onto the input.

## Required / optional marking

`isOptional` is the source of truth. `useFieldWrapper` maps `!isOptional` to an RHF
`required` rule *and* to `aria-required` on the input (independent of error state).
The visual marker is chosen by the Label-level `requiredIndicator` prop, forwarded
from the field:

- `"required"` (default) — required fields get a `*` marker rendered as a CSS
  `::before` pseudo-element keyed off a `data-required` attribute, so it stays out of
  the accessible name (the required semantic is carried by `aria-required`). Colour
  defaults to the label colour via `--form-required-marker-color`.
- `"optional"` — optional fields get a muted ` (optional)` **text** suffix (real
  text, so it belongs in the accessible name).

## Input chrome + error state

The shared `.ds.input.chrome` rule (`src/index.css`) provides border, height, and
**block** padding. **Inline** padding lives on the text-bearing leaf, single-sourced:
composite wrappers (text/number/password/phone) put it on their inner `<input>`;
direct-chrome inputs (date/time/datetime/select/textarea) set it on the element
itself; `.ds.input.chrome` never sets inline padding (that would double it).

Error state is applied by the Wrapper, not the input: on an RHF error the `.ds.field`
container gains `.danger`, and inputs style themselves red via the ancestor selector
`.danger > .payload .ds.input.chrome` (Color/FileUpload re-implement it on their own
`.color-trigger` / `.drop-zone`). Controls without a chrome border (checkbox, radio,
range slider) show the error only through the `FieldError` message.

The checkbox checkmark is a masked pseudo-element, not a `background-image` SVG (which
CSS can't recolour): `::before` with `mask-image` + `background-color:
var(--color-foreground-checkbox-checkmark)`, with the colour+mask set together only
under `:checked`/`:indeterminate` so the unchecked box paints nothing.

## The `#lib/*` import alias

Package-internal cross-tier imports use `#lib/*` (e.g.
`#lib/common/bindField/index.js`) instead of deep relative paths. `package.json`
`imports` maps it with a **publish-safe conditional map**:

```jsonc
"#lib/*": {
  "development": "./src/lib/*",   // local dev (source)
  "types":       "./dist/types/lib/*",
  "default":     "./dist/esm/lib/*" // published runtime
}
```

This resolves correctly at every stage (source during dev, `dist` when published), so
a shipped tarball doesn't break. It requires `customConditions: ["development"]` in
tsconfig and matching `resolve.conditions` in the Vite/Storybook config.
