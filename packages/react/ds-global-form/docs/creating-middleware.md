# Creating Middleware

This guide explains how to create middleware functions that extend field behavior through HOC composition.

## Middleware Concept

Middleware wraps field components to add cross-cutting functionality without modifying the field itself. Common use cases include:

- Fetching data from APIs
- Server-side validation
- Dependent field updates
- Analytics tracking
- Loading states

The middleware signature is:

```typescript
type Middleware<ComponentProps> = (
  Component: React.ComponentType<ComponentProps>
) => React.ComponentType<ComponentProps>;
```

A middleware receives a component and returns a new component with enhanced behavior.

## Built-in Middleware

The package includes two middleware for common patterns:

**addRESTOptions** - Fetches options from an API and injects them as the `options` prop:

```typescript
import { addRESTOptions } from "@canonical/react-ds-global-form";

<Field
  name="country"
  inputType="select"
  middleware={[
    addRESTOptions("/api/countries", {
      method: "GET",
      headers: { "Accept": "application/json" },
      transformData: (data) => data.countries,
    }),
  ]}
/>
```

**addRESTValidation** - Validates field values against an API endpoint:

```typescript
import { addRESTValidation } from "@canonical/react-ds-global-form";

<Field
  name="username"
  inputType="text"
  middleware={[
    addRESTValidation("/api/check-username", {
      debounceWait: 300,
      minLength: 3,
      errorExtractor: async (response) => {
        const data = await response.json();
        return data.message;
      },
    }),
  ]}
/>
```

## Creating Custom Middleware

### Basic Structure

A middleware factory function returns the actual middleware:

```typescript
function myMiddleware(options: MyOptions): Middleware<any> {
  return (WrappedComponent) => {
    return function EnhancedComponent(props) {
      // Add your logic here
      return <WrappedComponent {...props} />;
    };
  };
}
```

### API Fetch Example

Here's a complete example that fetches related data when a field value changes:

```typescript
import { createElement, useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { Middleware } from "@canonical/react-ds-global-form";

interface FetchRelatedOptions {
  endpoint: string;
  watchField: string;
  targetProp?: string;
  transformData?: (data: any) => any;
}

function addFetchRelated(options: FetchRelatedOptions): Middleware<any> {
  const {
    endpoint,
    watchField,
    targetProp = "relatedData",
    transformData = (data) => data,
  } = options;

  return (WrappedComponent) => {
    return function FetchRelatedComponent(props) {
      const [data, setData] = useState(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);

      const { watch } = useFormContext();
      const watchValue = watch(watchField);

      useEffect(() => {
        if (!watchValue) {
          setData(null);
          return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);

        fetch(`${endpoint}?${watchField}=${encodeURIComponent(watchValue)}`, {
          signal: controller.signal,
        })
          .then((response) => {
            if (!response.ok) throw new Error("Failed to fetch");
            return response.json();
          })
          .then((json) => {
            setData(transformData(json));
            setLoading(false);
          })
          .catch((err) => {
            if (err.name !== "AbortError") {
              setError(err.message);
              setLoading(false);
            }
          });

        return () => controller.abort();
      }, [watchValue]);

      if (loading) {
        return createElement("div", { className: "field-loading" }, "Loading...");
      }

      if (error) {
        return createElement("div", { className: "field-error" }, error);
      }

      return createElement(WrappedComponent, {
        ...props,
        [targetProp]: data,
      });
    };
  };
}

export default addFetchRelated;
```

Usage:

```tsx
<Field
  name="city"
  inputType="select"
  label="City"
  middleware={[
    addFetchRelated({
      endpoint: "/api/cities",
      watchField: "country",
      targetProp: "options",
      transformData: (data) =>
        data.cities.map((c) => ({ value: c.id, label: c.name })),
    }),
  ]}
/>
```

When the `country` field changes, this middleware fetches cities and injects them as options.

## Middleware Composition

Multiple middleware compose in array order. The first middleware becomes the outermost wrapper:

```tsx
<Field
  name="product"
  inputType="combobox"
  middleware={[
    withAnalytics("product-search"),  // Outermost
    addRESTOptions("/api/products"),  // Middle
    withDebounce(300),                // Innermost
  ]}
/>
```

The execution flow:

1. `withAnalytics` receives props, wraps...
2. `addRESTOptions` receives props, wraps...
3. `withDebounce` receives props, wraps...
4. Original field component renders

### Accessing Form Context

Use `useFormContext` from react-hook-form to interact with form state:

```typescript
import { useFormContext } from "react-hook-form";

function withValidation(rules: ValidationRules): Middleware<any> {
  return (WrappedComponent) => {
    return function ValidatedComponent(props) {
      const { setError, clearErrors } = useFormContext();

      // Validation logic using setError/clearErrors

      return <WrappedComponent {...props} />;
    };
  };
}
```

Common hooks from `useFormContext`:

| Hook | Purpose |
|------|---------|
| `watch(name)` | Subscribe to field value changes |
| `setValue(name, value)` | Programmatically set field value |
| `setError(name, error)` | Set a validation error |
| `clearErrors(name)` | Clear validation errors |
| `getValues()` | Get all form values |

## Debouncing API Calls

For middleware that makes API calls on value changes, always debounce:

```typescript
import { useCallback, useEffect } from "react";
import { debounce } from "@canonical/utils";

function withDebouncedFetch(url: string, wait = 300): Middleware<any> {
  return (WrappedComponent) => {
    return function DebouncedComponent(props) {
      const { name } = props;
      const { watch, setError, clearErrors } = useFormContext();
      const value = watch(name);

      const debouncedFetch = useCallback(
        debounce(async (val: string) => {
          try {
            const response = await fetch(`${url}?value=${val}`);
            if (!response.ok) {
              setError(name, { type: "manual", message: "Validation failed" });
            } else {
              clearErrors(name);
            }
          } catch {
            setError(name, { type: "manual", message: "Network error" });
          }
        }, wait),
        [name]
      );

      useEffect(() => {
        if (value && value.length >= 3) {
          debouncedFetch(value);
        }
      }, [value, debouncedFetch]);

      return <WrappedComponent {...props} />;
    };
  };
}
```

## Error Handling

Middleware should handle errors gracefully:

```typescript
function withErrorBoundary(): Middleware<any> {
  return (WrappedComponent) => {
    return function BoundedComponent(props) {
      const [hasError, setHasError] = useState(false);

      if (hasError) {
        return (
          <div className="field-error-boundary">
            Field failed to load.
            <button onClick={() => setHasError(false)}>Retry</button>
          </div>
        );
      }

      try {
        return <WrappedComponent {...props} />;
      } catch {
        setHasError(true);
        return null;
      }
    };
  };
}
```

## TypeScript

For type-safe middleware, specify the component props type:

```typescript
import type { Middleware, SelectProps } from "@canonical/react-ds-global-form";

function withSelectEnhancement(): Middleware<SelectProps> {
  return (WrappedComponent) => {
    return function EnhancedSelect(props: SelectProps) {
      // TypeScript knows props has SelectProps shape
      const { options, ...rest } = props;
      const sortedOptions = [...options].sort((a, b) =>
        a.label.localeCompare(b.label)
      );
      return <WrappedComponent {...rest} options={sortedOptions} />;
    };
  };
}
```

Use `Middleware<any>` when the middleware works with any field type.
