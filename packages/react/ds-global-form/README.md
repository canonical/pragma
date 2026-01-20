# @canonical/react-ds-global-form

Form components for the Pragma design system. This package provides form fields with built-in validation patterns and middleware for connecting to backend services.

## Installation

```bash
bun add @canonical/react-ds-global-form
```

The package requires React 19 and builds on top of `@canonical/react-ds-global`.

## Usage

```tsx
import { Field } from "@canonical/react-ds-global-form";

function ContactForm() {
  return (
    <form>
      <Field
        name="email"
        label="Email address"
        type="email"
        required
        helpText="We'll never share your email."
      />
      <Field
        name="message"
        label="Message"
        as="textarea"
        rows={4}
      />
    </form>
  );
}
```

## Middleware

The package includes middleware functions for connecting form fields to REST APIs:

```tsx
import { Field, addRESTOptions } from "@canonical/react-ds-global-form";

<Field
  name="country"
  label="Country"
  as="select"
  middleware={[addRESTOptions("/api/countries")]}
/>
```

## Storybook

```bash
cd packages/react/ds-global-form
bun run storybook
```

The Storybook configuration includes MSW integration for mocking backend responses.

## Component Specifications

Form component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
