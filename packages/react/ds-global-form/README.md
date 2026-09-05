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

This package puts CSS on the page two ways. `dist/esm/index.css` — the file the snippet above imports — is the package-level stylesheet: the `--form-*` token block, the field grid, the shared input chrome, and `density.css`, which sizes every control to the context and density cell on the root. Each component module then imports its own stylesheet (`import "./styles.css"`), so importing a component is what puts that component's CSS on the page; a bundler collects those imports into the application's CSS. Nothing here is injected at runtime, and a component you never import ships no CSS.

The consequence is that the order a bundler happens to emit these sheets in is not something you can rely on, which is what the cascade layer below is for.

### Every stylesheet is in `ds.components.global`

Every stylesheet under `src/` — the package entry, `density.css`, the 29 component sheets and the density docs example, 32 in all — is wrapped in one cascade layer:

```css
@layer ds.components.global {
  .ds.field-label {
    /* … */
  }
}
```

`@canonical/styles` declares the order of every layer in one statement, and `ds.components.global` sits near the top of it. Two things follow.

`ds.components.app`, one layer higher, is the application tiers' — `@canonical/react-ds-app-lxd` and its siblings. None of them is wrapped yet (at the time of writing, no stylesheet under `packages/react/ds-app-*` carries a layer at all); wrapping them is being done package by package alongside this one. Today an app tier still beats this package for the opposite reason — it is unlayered, and unlayered beats layered. What the layer guarantees, once those packages land, is that an app tier's rule for a field or an input this package also styles wins by cascade layer rather than by whichever bundle the loader emitted last.

The parent layer `ds.components` sits above both tiers, not between them: a rule written directly into it lands in that layer's implicit final sublayer, which outranks every named sublayer under it. So nothing pragma ships is written directly into `ds.components` — the layout presets in `src/index.css` used to be, in a lone `@layer ds.components` block, and they are in this package's own wrap now like everything else.

An application's own **unlayered** CSS now beats every rule in this package, whatever the selectors on either side, because unlayered author rules outrank every layered one. That is CSS working as designed, and it is the deliberate escape hatch: an application that needs to override a form control writes a plain rule and it wins. An application that does *not* want to win by accident puts its CSS in `@layer app`.

**Rule for contributors:** every stylesheet under `src/` opens with that wrapper, and `src/styles.layer.tests.ts` fails `bun run test` if one does not (it is a test, not a build step — `tsconfig.build.json` keeps it out of `dist`). `@keyframes` and the package's own `:root` token defaults go inside it; `@property` and `@font-face` registrations stay outside, above the block, because no layer sorts a registration. An `@import` stays above the block too — an import is only valid before other rules — and it takes a `layer(ds.components.global)` keyword *only* when the sheet it names is not itself wrapped; `src/index.css` imports `density.css` bare, because `density.css` declares the layer itself and the keyword would nest that declaration into `ds.components.global.ds.components.global`, a sublayer that loses to `index.css`'s own rules. Never reach for `!important` to win a fight — an important declaration inverts the layer order and cannot be arbitrated by layers at all. The `@canonical/styles` README's "Cascade layers" section is the reference for the full order and for what is deliberately left unlayered. The one exemption is `.storybook/styles.css`, which is deliberately outside `src/`: it is the Storybook harness rather than part of the package — never published (`files: ["dist"]`), there to pull this package's CSS into the preview page and add one `.rtl` utility — and staying unlayered is what lets it override the preview.

### Components own the box of the natives they render

This package renders more native elements than any other: `<input>` in a dozen types, `<select>`, `<textarea>`, `<label>`, `<legend>`, `<fieldset>`, `<button>`. A component that renders a native element is responsible for that element's box — its margin, its width, its `min-width`, its `box-sizing` — and for `::placeholder` where it renders a text input. Anything a component leaves undeclared is filled in by whatever else the host page loads, and on a page that also runs another framework that is a visible bug rather than a default. Declaring the box is being done as its own change; until it lands, treat "the control looks right on our own page" as a weaker guarantee than it sounds.

Nothing in this package portals: no `createPortal`, no `appendChild`, no `<dialog>`. The two surfaces that escape their container — the combobox list (`ComboboxInput/common/List/List.tsx:42`) and the colour picker's swatch panel (`ColorInput/ColorInput.tsx:198`) — use the Popover API, which promotes an element to the top layer for painting but leaves it where it is in the DOM. So they stay inside the `.ds` subtree their caller marks, and the element-level layers `@canonical/styles` scopes to that subtree still reach them.

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
