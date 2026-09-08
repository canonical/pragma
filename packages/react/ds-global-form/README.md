# @canonical/react-ds-global-form

Form components for the Pragma design system. This package provides a field system built on react-hook-form with two core patterns: a field switch for rendering different input types and middleware composition for extending field behavior.

## Prerequisites

- React 19 or higher

## Installation

```bash
bun add @canonical/react-ds-global-form @canonical/styles
```

Import the global styles and the form component styles in your application's root stylesheet:

```css
@import url("@canonical/styles");
@import url("@canonical/react-ds-global-form/dist/esm/index.css");
```

The global styles provide the CSS reset, typography baseline, and design tokens (colour, spacing, surfaces, states) that all form components depend on. The form stylesheet provides input chrome, field layout, and component-specific styles.

The package builds on top of `@canonical/react-ds-global`.

### How component CSS reaches the page

This package puts CSS on the page two ways. `dist/esm/index.css` — the file the snippet above imports — is the package-level stylesheet: the `--form-*` token block, the field grid, the shared input chrome, and `density.css`, which sizes every control to the context and density cell on the root. Each component module then imports its own stylesheet (`import "./styles.css"`), so importing a component is what puts that component's CSS on the page; a component you never import ships no CSS.

### Every stylesheet is in `ds.components.global`

Every stylesheet under `src/` is wrapped in the `ds.components.global` cascade layer, which holds the packages every application gets. It sits below the application tiers, so an application package that restyles one of these components wins by layer rather than by whichever bundle the loader emitted last. An application's own unlayered CSS beats every rule here whatever the selectors, which is the deliberate escape hatch.

A new stylesheet opens with the same wrapper, with `@keyframes` and the package's own `:root` token defaults inside it and `@property` and `@font-face` registrations above it. An `@import` stays above the block too, and takes a `layer(ds.components.global)` keyword only when the sheet it names is not itself wrapped. `.storybook/styles.css` is the one exemption: it is the Storybook harness rather than part of the package, never published, and staying unlayered is what lets it override the preview.

The [`@canonical/styles` README](../../styles/main/README.md) has the full layer order, and [the cascade contract](../../../docs/explanations/STYLES_CASCADE.md) explains why it is shaped this way.

### Components own the box of the natives they render

This package renders more native elements than any other: `<input>` in a dozen types, `<select>`, `<textarea>`, `<label>`, `<legend>`, `<fieldset>`, `<button>`. A component that renders a native element is responsible for that element's box — its margin, its width, its `min-width`, its `box-sizing` — and for `::placeholder` where it renders a text input. Anything a component leaves undeclared is filled in by whatever else the host page loads, and on a page that also runs another framework that is a visible bug rather than a default. Declaring the box is being done as its own change; until it lands, treat "the control looks right on our own page" as a weaker guarantee than it sounds.

Nothing in this package portals: no `createPortal`, no `appendChild`, no `<dialog>`. The two surfaces that escape their container — the combobox list (`ComboboxInput/common/List/List.tsx:42`) and the colour picker's swatch panel (`ColorInput/ColorInput.tsx:198`) — use the Popover API, which promotes an element to the top layer for painting but leaves it where it is in the DOM. So they stay inside the `.ds` subtree their caller marks, and the element-level layers `@canonical/styles` scopes to that subtree still reach them.

### Transitions read the motion tokens

Every transition in this package takes its duration from `--motion-duration-fast`, the fast step of the three duration tokens `@canonical/styles` declares, and never from a literal. That is not a tidiness rule. Under `prefers-reduced-motion: reduce` the styles package sets all three duration tokens to `0s`, and that zeroing is the whole of pragma's reduced-motion mechanism: a component's own `transition` declaration keeps its place in the cascade and simply resolves to no time at all. A hard-coded duration is invisible to it and keeps animating for a reader who asked their system not to. This is the code standard `cs:css.properties.values` ("design tokens over raw values") with teeth on it.

**Rule for contributors:** no literal duration in a `transition` or an `animation`; a new one reads a token, and a bare `0s` is the one exception, because it already says "no motion". The tokens themselves live in `@canonical/styles` (`motion.css`); if a control needs a step the three do not offer, the step is added there rather than written into a component. Easings are the exception, and a deliberate one: they are still the literal `ease` here rather than `var(--motion-easing-standard)`, because that token is `ease-out` and swapping it is a second change to how the controls feel — it rides on PRA-153 with the missing sub-`fast` duration step.

## Dependencies

The form system builds on two key libraries:

- **react-hook-form** - Form state management, validation, and field registration. The `Field` component uses `useFormContext` internally, so forms must be wrapped in a `FormProvider`.
- **downshift** - Powers the combobox field with accessible autocomplete behavior.

## Usage

Wrap your form in a `Form` component and use `Field` for inputs:

```tsx
import { Form, Field } from "@canonical/react-ds-global-form";

function ContactForm() {
  const onSubmit = (data) => console.log(data);

  return (
    <Form onSubmit={onSubmit}>
      <Field
        name="email"
        inputType="email"
        label="Email address"
        description="We'll never share your email."
      />
      <Field
        name="message"
        inputType="textarea"
        label="Message"
      />
      <button type="submit">Send</button>
    </Form>
  );
}
```

### Form modes

`Form` wraps its children in a react-hook-form `FormProvider` and works in two modes:

- **Internal mode** (above) — pass `onSubmit`, and optionally `defaultValues` and a
  validation `mode`; `Form` creates the `useForm` instance for you. Best for a
  self-contained form.
- **External mode** — create the `useForm` instance yourself and pass it as
  `methods`. Because you own it, you can read `formState` (e.g. `isSubmitting`) and
  call its methods (`reset`, `setValue`, `watch`, …). Use this for async submits,
  shared state, or multi-step forms.

  ```tsx
  import { useForm } from "react-hook-form";

  const methods = useForm({ mode: "onBlur", defaultValues: { email: "" } });
  const { reset, formState: { isSubmitting } } = methods;

  <Form methods={methods} onSubmit={async (data) => { await save(data); reset(); }}>
    <Field name="email" inputType="email" label="Email" />
    <button type="submit" disabled={isSubmitting}>Send</button>
  </Form>;
  ```

  When you pass `methods`, `Form`'s own `defaultValues`/`mode` props are ignored —
  configure those on your `useForm` call.

This library is a thin layer over [react-hook-form](https://react-hook-form.com/)
(`^7.71`): validation rules (`registerProps`), `formState`, submission, field
arrays, and schema resolvers are all RHF's API. See the **Getting Started** guide
in Storybook for a full walkthrough with runnable examples, and the
[react-hook-form docs](https://react-hook-form.com/docs) for the complete surface.

## Field Switch Pattern

The `Field` component uses `inputType` to select the appropriate input component:

| inputType | Component | Description |
|-----------|-----------|-------------|
| `text`, `email`, `password`, `number`, `tel`, `url` | Text | Standard text inputs |
| `textarea` | Textarea | Multi-line text |
| `checkbox` | Checkbox | Boolean toggle |
| `range` | Range | Slider input |
| `select` | Select | Dropdown selection |
| `simple-choices` | SimpleChoices | Radio buttons or checkboxes |
| `combobox` | Combobox | Searchable dropdown |
| `hidden` | Hidden | Hidden input |
| `custom` | Your component | Pass via `CustomComponent` prop |

All fields are wrapped with `withWrapper`, which provides form registration, labels, descriptions, error display, and middleware support.

### Custom Fields

For field types not covered by the built-ins, use `inputType="custom"`:

```tsx
import { Field } from "@canonical/react-ds-global-form";
import { MyColorPicker } from "./MyColorPicker";

<Field
  name="brandColor"
  inputType="custom"
  CustomComponent={MyColorPicker}
  label="Brand Color"
/>
```

Custom components must be wrapped with `withWrapper`. Custom components must satisfy the `InputProps` type and integrate with react-hook-form via `useFormContext`.

## Middleware Pattern

Middleware are higher-order components that wrap fields to add functionality. They compose via the `middleware` prop:

```tsx
<Field
  name="country"
  inputType="select"
  label="Country"
  middleware={[addRESTOptions("/api/countries")]}
/>
```

The middleware signature is `(Component) => Component`. Multiple middleware compose in array order, with the first middleware as the outermost wrapper.

### Built-in Middleware

**addRESTOptions** - Fetches options from an API endpoint:

```tsx
import { addRESTOptions } from "@canonical/react-ds-global-form";

<Field
  name="category"
  inputType="select"
  middleware={[
    addRESTOptions("/api/categories", {
      transformData: (data) => data.categories,
    }),
  ]}
/>
```

**addRESTValidation** - Validates field values against an API:

```tsx
import { addRESTValidation } from "@canonical/react-ds-global-form";

<Field
  name="username"
  inputType="text"
  middleware={[
    addRESTValidation("/api/validate-username", {
      debounceWait: 300,
      minLength: 3,
    }),
  ]}
/>
```

Custom middleware follows the same factory pattern: an outer function accepts configuration and returns a HOC.

## Conditional Display

Fields can conditionally render based on other field values:

```tsx
<Field
  name="company"
  inputType="text"
  label="Company"
  condition={[
    ["accountType"],
    ([type]) => type === "business",
  ]}
/>
```

The field only renders when the condition function returns true.

## Storybook

```bash
cd packages/react/ds-global-form
bun run storybook
```

The Storybook configuration includes MSW integration for mocking backend responses.

## Component Specifications

Form component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
