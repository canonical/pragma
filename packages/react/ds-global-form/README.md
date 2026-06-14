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

## Standalone inputs (without a form)

Every input ships in two tiers:

- **Presentational** — pure, controlled components with no react-hook-form
  dependency, exported from the `/inputs` subpath. Usable anywhere (and
  server-renderable):

  ```tsx
  import { Text, Combobox, Select } from "@canonical/react-ds-global-form/inputs";

  function Example() {
    const [value, setValue] = useState("");
    return <Text name="email" inputType="email" value={value} onChange={(e) => setValue(e.target.value)} />;
  }
  ```

- **Field-bound** — the same inputs wrapped with react-hook-form binding plus
  label/description/error chrome, rendered by the `Field` router (below) inside
  a `Form`.

Reach for the `/inputs` components when you need an input outside the form
system (custom layouts, your own state management, or progressive-enhancement
shells); reach for `Field` when you want the full form integration.

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
