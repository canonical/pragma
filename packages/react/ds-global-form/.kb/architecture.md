# Preface

How `@canonical/react-ds-global-form` is put together: the tiers and which may depend on which, the public surface, the machinery every field is composed from, and the conventions every field shares for required marking, error state and input chrome. Read this before adding or moving an input, a field or a pattern, or before changing anything in `src/lib/common/`.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

A form input exists at three levels. A presentational input renders markup and knows nothing about react-hook-form. A field binds one input to react-hook-form and wraps it in the label, description and error message. A pattern is what consumers use: `Field` picks a field from an `inputType`, and `Form` provides the react-hook-form context. The binding and the wrapping are shared machinery, so a new field is mostly a choice of input, binding mode and wrapper.

# Important

- Build a new field by composing the machinery described below; do not call `register` or `useController` in a field or an input by hand.
- A presentational input must not import react-hook-form.
- The public surface is chosen in `src/lib/index.ts`. Adding a field does not make it public: consumers reach it through `<Field inputType="…">`, so the `Field` switch and its props union are part of adding one.
- `isOptional` is the single source of required-ness. Do not add a separate `required` prop or rule to a field.
- Error styling hangs off the wrapper's `.danger` class. An input never decides by itself that it is in error.

# Architecture

## Tiers and dependencies

`src/lib/` has three tier folders and two support folders.

- `subcomponent/` - Presentational inputs, one folder per input (`TextInput`, `CheckboxInput`, `PhoneInput`, …), and the field chrome `Field/` (`Label`, `Description`, `Error`). They may use `utils/` (formatters, country data, `mergeRefs`) but no other tier.
- `component/` - One field per input (`TextField`, `CheckboxField`, `RangeField`, …), each composed from `common/` and a `subcomponent/` input. A field with private parts keeps them in its own `common/` subfolder, as `ChoicesField/common/Option` does.
- `pattern/` - `Field`, a switch on the `inputType` prop that renders the matching field, with `inputType="custom"` rendering a `CustomComponent` prop; and `Form`, which wraps its children in react-hook-form's `FormProvider`.
- `common/` - The field machinery: `bindField/`, `Wrapper/` with the `withWrapper` and `withToggleWrapper` helpers, and the shared prop types (`BaseInputProps`, `InputProps`, `WrapperProps`, `Middleware`, `Condition`).
- `utils/` - The react-hook-form hooks (`useFieldAriaProperties`, `useFieldError`, `useFormattedValue`), value formatters, phone country data, and the REST middleware for options and validation.

Dependencies point from `pattern/` to `component/`, and from `component/` to `common/` and `subcomponent/`. `common/` is not independent of the tiers: `Wrapper` renders the `subcomponent/Field` chrome and `common/types.ts` imports prop types from `subcomponent/`, even though the comment in `common/index.ts` says `common/` never depends on a tier.

## Public surface

`src/lib/index.ts` exports the `pattern/` tier (which also re-exports the machinery types `Field` accepts), the formatter utilities and `useFormattedValue`, the middleware, and `RatingInput`, the one input exposed directly while it is a work in progress. `component/` and the rest of `subcomponent/` are internal, so renaming a field or an input is not a breaking change as long as the `inputType` it serves stays the same.

Some fields and inputs are works in progress (Color, Combobox and Rating). They live in the normal tier folders but their stories are filed under `_work_in_progress/` in Storybook.

## Composing a field

A field is a wrapper helper applied to a bound input:

```ts
export default withWrapper<TextFieldProps>(
  bindField<TextFieldProps>(TextInput, "native"),
);
```

`bindField(Input, mode, options?)` (`common/bindField/bindField.ts`) binds a presentational input to react-hook-form. The mode is either:

- `"native"` - spreads `register(name, rules)` onto the input. Most inputs use it: text, number, password, textarea, select, date, time, date-time, range, checkbox, switch and hidden.
- `"controlled"` - runs `useController` and passes `value`, `onChange`, `onBlur` and `ref`. Inputs that manage their own value use it: choices, rich choices, combobox, color, file upload, phone and rating.

Its options are:

- `additionalRegisterProps` - `register()` rules merged under the consumer's `registerProps`, so the consumer wins on a conflict. It is either an object, as in `NumberField` and `RangeField` passing `{ valueAsNumber: true }`, or a function of the field's props, as in `DateField` turning `min` and `max` into rules and `FileUploadField` turning its file limits into a `validate` rule.
- `defaultValue` - the registration default in controlled mode, such as `"#000000"` for `ColorField` and `[]` for `FileUploadField`.
- `injectValue` - in native mode, also passes the watched value as a `value` prop.

The wrapper helper chooses the chrome around the bound input:

- `withWrapper(Component, options?, Wrapper?)` renders the default `Wrapper`: a `.ds.field` subgrid holding the `Label` and a `.payload` element with the description, the input and the error message. The third argument swaps the wrapper; `HiddenField` passes `InvisibleWrapper`, which registers the field but renders no chrome.
- `withToggleWrapper(Component, defaults?)` renders `ToggleWrapper`, which puts a checkbox or switch inline with its label, and requires at least one of `label` and `controlLabel`. `CheckboxField` and `SwitchField` use it.

Both helpers also accept, per use, a `middleware` array of higher-order components applied between the wrapper and the input, and a `condition` prop (`[dependencies, predicate]`) that hides the field when the predicate returns false for the watched dependency values.

The wrappers call `useFieldWrapper` (`common/Wrapper/hooks/`), which builds the field's `register()` rules, reads its error, produces the ARIA attributes for the label, description, input and error message, and unregisters the field on unmount unless `unregisterOnUnmount` is false.

## Required and optional marking

`useFieldWrapper` turns `isOptional` (default false) into a react-hook-form `required` rule with the message from `common/Wrapper/messages.ts`, and into `aria-required` on the input. The consumer's `registerProps` are merged last and can override that rule.

How the label shows it is chosen by the `requiredIndicator` prop, which the wrapper forwards to `Label`. The two values are alternative conventions; use one per form.

- `"required"` (the default) marks required fields. `Label` sets `data-required`, and its stylesheet draws the marker as an `::after` pseudo-element, `var(--form-required-marker, "*")`, so the marker stays out of the accessible name; `aria-required` carries the meaning. It takes the label colour unless `--form-required-marker-color` is set.
- `"optional"` marks optional fields with a muted ` (optional)` suffix. It is real text, so it is part of the accessible name.

## Error state and input chrome

When react-hook-form reports an error for the field, the wrapper adds `.danger` to the `.ds.field` element and renders the `Error` subcomponent with the message. Inputs are styled from that ancestor:

- `.ds.input.chrome` (`src/index.css`) is the shared bordered chrome. On `.danger > .payload .ds.input.chrome` only the bottom border takes the error colour, and focus rings all four sides in the error colour. The color and file-upload inputs apply the same treatment to their own `.color-trigger`, `.hex-input-row` and `.drop-zone` elements.
- A choices group has no single border, so `ChoicesField` and `RichChoicesField` render their label as a `<legend>` (the wrapper's `mockLabel` option), and `.danger > legend.ds.field-label` turns that label and its required marker the error colour. A plain `<label>` does not change colour.
- Checkboxes, radios and range sliders have no chrome border and show the error only through the message.

`.ds.input.chrome` sets the height, border and block padding, never the inline padding. Inline padding goes on the element that holds the text: the inner `<input>` of composite inputs (text, number, password, phone), or the element itself for inputs that carry the chrome directly (date, time, date-time, select, textarea). Setting it on both would inset the text twice.

The checkbox glyph is a masked `::before` pseudo-element coloured by `--surface-color-foreground-checkbox-checkmark` (falling back to `--color-foreground-checkbox-checkmark`), not a `background-image`, because CSS cannot recolour a background image. Only the `:checked` and `:indeterminate` rules give it both a mask and a colour, so an unchecked box paints nothing.
