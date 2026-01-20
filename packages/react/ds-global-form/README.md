# @canonical/react-ds-global-form

Form components for the Pragma design system. This package provides a field system built on react-hook-form with two core patterns: a field switch for rendering different input types and middleware composition for extending field behavior.

## Prerequisites

- React 19 or higher

## Installation

```bash
bun add @canonical/react-ds-global-form
```

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

Custom components must be wrapped with `withWrapper`. See [docs/creating-custom-fields.md](docs/creating-custom-fields.md) for the complete guide.

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

See [docs/creating-middleware.md](docs/creating-middleware.md) for creating custom middleware.

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
