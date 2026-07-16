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

As of `@canonical/react-ds-global-form` 0.30.0, `Field` supports these `inputType`s:

<!-- adoption:covered-set:begin package=@canonical/react-ds-global-form -->

| `inputType` values | | | |
|---|---|---|---|
| `text` (and other native text-like types) | `password` | `number` | `checkbox` |
| `switch` | `hidden` | `range` | `rating` |
| `select` | `combobox` | `choices` | `rich-choices` |
| `textarea` | `date` | `time` | `datetime` |
| `file` | `color` | `phone` | `custom` |

<!-- adoption:covered-set:end -->

`custom` takes a `CustomComponent` prop — the escape hatch for inputs pragma doesn't provide, so one exotic widget never blocks migrating the rest of the form. `RatingInput` is additionally exported standalone (work in progress) for use outside the `Field` pattern.

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

Rebuild each form from the patterns:

```tsx
import { Field, Form } from "@canonical/react-ds-global-form";
import { Button } from "@canonical/react-ds-global";

function RenameBoard() {
  return (
    <Form defaultValues={{ board_name: "" }} onSubmit={(data) => save(data)}>
      <Field
        name="board_name"
        inputType="text"
        registerProps={{
          required: { value: true, message: "A board name is required" },
        }}
      />
      <Button type="submit">Save</Button>
    </Form>
  );
}
```

The state-management switch is where the effort goes: hand-rolled `useState`-per-input wiring and controlled-component plumbing disappear, replaced by `defaultValues` + `Field` registration. Migrate the simplest form first to learn the shape, then batch the rest.

For forms whose state must be driven from outside (multi-step wizards, programmatic resets), create the `useForm` instance yourself and hand it to `Form` via `methods`.

### 4. Browse the fields

To see every field type with its props and states, run the package's Storybook from a pragma checkout ([repository quick start](../../../README.md#quick-start)):

```bash
cd packages/react/ds-global-form && bun run storybook
```

## Verify

1. No form-component imports remain from old sources (re-run your Track A2 inventory grep for form components).
2. Each migrated form submits with the expected payload, validates, and shows error messages.
3. Keyboard-only interaction works end to end: tab order, error focus, submit.

## If you get stuck

File an issue at [canonical/pragma/issues](https://github.com/canonical/pragma/issues). If a form control you need has no `inputType`, use `inputType="custom"` to keep moving and file the gap — field-type gaps found during adoption are prioritised.

## Next

Family A is complete. Track B (documenting your components in the design-system documentation database) is guided separately — see the [adoption index](./README.md).
