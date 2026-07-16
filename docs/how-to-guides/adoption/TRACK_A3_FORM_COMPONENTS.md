# Track A3 — Implement the form components

Replace the forms in your application with pragma's form patterns, so that every form is built from `Form` and `Field` instead of Vanilla or home-grown form components.

| | |
|---|---|
| **Track** | A3 (family A) |
| **Difficulty** | Medium — requires switching to [React Hook Form](https://react-hook-form.com/) |
| **Estimated time** | Proportional to the number and complexity of your forms; the state-management switch is the bulk of the work |
| **Prerequisites** | [Track A1](./TRACK_A1_STYLES_TOKENS_ASSETS.md) completed; [Track A2](./TRACK_A2_BASE_COMPONENTS.md) recommended first |

## Who this is for

Engineers on a team adopting pragma for 26.10, after finishing Track A1 (and ideally A2).

## What "done" means

- [ ] Every form in your application is built from pragma's `Form` and `Field` patterns.
- [ ] No form components remain from `@canonical/react-components`, vanilla-framework markup, or your own codebase.
- [ ] Migrated forms submit, validate, and report errors as before.

## The model

Pragma forms are built on **React Hook Form**. The package's public surface is deliberately small:

- **`Form`** wraps `react-hook-form`'s `FormProvider`. Give it `defaultValues`, an `onSubmit` callback, and optionally a validation `mode` — or pass your own `useForm` instance via the `methods` prop if you need external control.
- **`Field`** is the type-safe entry point to every input. It dispatches on `inputType` to the matching field implementation, so one component drives text, select, checkbox, range, date, file, and custom inputs — with per-field validation, required/optional marking, and conditional display. The individual `*Field` components are internal: you consume them through `Field`, not by importing them directly.
- Validation is expressed through `registerProps` — standard React Hook Form [register options](https://react-hook-form.com/docs/useform/register) (`required`, `minLength`, `pattern`, …).

## The covered set

As of `@canonical/react-ds-global-form` 0.30.0, `Field` supports these stable (non-WIP) `inputType`s:

<!-- adoption:covered-set:begin package=@canonical/react-ds-global-form note=stable-only -->

| `inputType` values | | | |
|---|---|---|---|
| `text` (and other native text-like types) | `password` | `number` | `checkbox` |
| `switch` | `hidden` | `range` | `select` |
| `choices` | `rich-choices` | `textarea` | `date` |
| `time` | `datetime` | `file` | `phone` |

<!-- adoption:covered-set:end -->

`custom` takes a `CustomComponent` prop — the escape hatch for inputs pragma doesn't provide, so one exotic widget never blocks migrating the rest of the form.

Three further `inputType`s — `color`, `combobox`, and `rating` (plus the standalone `RatingInput`) — are **work in progress**. You **can** use them, but they are experimental — APIs, names, and visuals may change without notice — and they must **not** be part of a public release. See *"What's in this folder?"* at the root of the `_work_in_progress` section in [Storybook](https://ds-react-global-form.canonical.com/).

## The path

### 1. Install the package

```bash
bun add @canonical/react-ds-global-form
# or: npm install @canonical/react-ds-global-form
```

React Hook Form ships with the package — you don't install it separately.

### 2. Import the form styles

In your main CSS, below the imports from Track A1:

```css
@import "@canonical/react-ds-global-form/dist/esm/index.css";
```

### 3. Migrate form by form

Define your fields **as data** and map over them — this is the recommended pattern. It takes full advantage of `Field`'s `inputType` switch: a form becomes a list of field descriptions, and changing an input type is a one-word change in data rather than a component rewrite.

```tsx
import { Field, Form, type FieldProps } from "@canonical/react-ds-global-form";
import { Button } from "@canonical/react-ds-global";

const fields: FieldProps[] = [
  { name: "full_name", inputType: "text", label: "Full name" },
  {
    name: "email",
    inputType: "text",
    label: "Email address",
    registerProps: { required: "Email is required" },
  },
  { name: "newsletter", inputType: "checkbox", label: "Subscribe to the newsletter" },
];

function SignUp() {
  return (
    <Form onSubmit={(data) => save(data)} mode="onBlur">
      {fields.map((props) => (
        <Field key={props.name} {...props} />
      ))}
      <Button type="submit">Sign up</Button>
    </Form>
  );
}
```

The state-management switch is where the effort goes: hand-rolled `useState`-per-input wiring and controlled-component plumbing disappear, replaced by `defaultValues` + `Field` registration. Migrate the simplest form first to learn the shape, then batch the rest.

For forms whose state must be driven from outside (multi-step wizards, programmatic resets), create the `useForm` instance yourself and hand it to `Form` via `methods`.

### 4. Browse the fields

Every field type, with its props and states, is available directly in the live Storybook: [ds-react-global-form.canonical.com](https://ds-react-global-form.canonical.com/) (latest Chromatic build).

## Verify

1. No form-component imports remain from old sources (re-run your Track A2 inventory grep for form components).
2. Each migrated form submits with the expected payload, validates, and shows error messages.
3. Keyboard-only interaction works end to end: tab order, error focus, submit.

## If you get stuck

File an issue at [canonical/pragma/issues](https://github.com/canonical/pragma/issues). If a form control you need has no `inputType`, use `inputType="custom"` to keep moving and file the gap — field-type gaps found during adoption are prioritised.

## Next

Family A is complete. If your team hasn't done it yet, [Track B — document your components](./TRACK_B_DOCUMENTATION.md) runs independently and completes the program.
