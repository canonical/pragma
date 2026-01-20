# Creating Custom Fields

This guide explains how to create custom field components for use with the `Field` component's `inputType="custom"` option.

## When to Create Custom Fields

Use a custom field when the built-in input types don't cover your use case:

- Specialized inputs (color pickers, date ranges, rich text editors)
- Complex composite inputs (address fields, phone with country code)
- Third-party component integration

For simple variations of existing inputs, consider middleware instead.

## Type Requirements

Custom fields must satisfy the `InputProps` type:

```typescript
import type { InputProps } from "@canonical/react-ds-global-form";

type MyFieldProps = InputProps<{
  // Your additional props here
  myCustomProp?: string;
}>;
```

The base `InputProps` includes:

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Field name for form registration |
| `registerProps` | `RegisterOptions` | react-hook-form registration options |
| `aria-labelledby` | `string` | ID of label element |
| `aria-describedby` | `string` | ID of description element |
| `aria-errormessage` | `string` | ID of error message element |
| `aria-invalid` | `boolean` | Whether field has validation error |

## The withWrapper HOC

All custom fields must be wrapped with `withWrapper`. This HOC provides:

- Form registration via react-hook-form
- Label and description rendering
- Error message display
- ARIA attribute injection for accessibility
- Middleware composition support

Without `withWrapper`, your field won't integrate with the form system.

## Step-by-Step Example

Here's how to create a custom color picker field:

### 1. Define the Props Type

```typescript
import type { InputProps } from "@canonical/react-ds-global-form";

type ColorPickerProps = InputProps<{
  swatches?: string[];
  showHexInput?: boolean;
}>;
```

### 2. Create the Component

Use `useFormContext` from react-hook-form to register the field:

```typescript
import { useFormContext } from "react-hook-form";

const ColorPickerInput = ({
  name,
  registerProps,
  swatches = ["#ff0000", "#00ff00", "#0000ff"],
  showHexInput = true,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-errormessage": ariaErrormessage,
  "aria-invalid": ariaInvalid,
  ...props
}: ColorPickerProps) => {
  const { register, watch, setValue } = useFormContext();
  const currentValue = watch(name);

  return (
    <div className="color-picker">
      <div className="swatches">
        {swatches.map((color) => (
          <button
            key={color}
            type="button"
            className={currentValue === color ? "selected" : ""}
            style={{ backgroundColor: color }}
            onClick={() => setValue(name, color)}
            aria-label={`Select ${color}`}
          />
        ))}
      </div>
      {showHexInput && (
        <input
          type="text"
          placeholder="#000000"
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          aria-errormessage={ariaErrormessage}
          aria-invalid={ariaInvalid}
          {...register(name, registerProps)}
        />
      )}
    </div>
  );
};
```

### 3. Wrap with withWrapper

```typescript
import { withWrapper } from "@canonical/react-ds-global-form";

export const ColorPicker = withWrapper<ColorPickerProps>(ColorPickerInput);
```

### 4. Use with Field

```tsx
import { Field } from "@canonical/react-ds-global-form";
import { ColorPicker } from "./ColorPicker";

<Field
  name="brandColor"
  inputType="custom"
  CustomComponent={ColorPicker}
  label="Brand Color"
  description="Choose your primary brand color"
  swatches={["#E95420", "#0066CC", "#333333"]}
/>
```

## Complete Example

Here's a complete file for reference:

```typescript
// ColorPicker.tsx
import { useFormContext } from "react-hook-form";
import { withWrapper } from "@canonical/react-ds-global-form";
import type { InputProps } from "@canonical/react-ds-global-form";

type ColorPickerProps = InputProps<{
  swatches?: string[];
  showHexInput?: boolean;
}>;

const ColorPickerInput = ({
  name,
  registerProps,
  swatches = ["#ff0000", "#00ff00", "#0000ff"],
  showHexInput = true,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-errormessage": ariaErrormessage,
  "aria-invalid": ariaInvalid,
}: ColorPickerProps) => {
  const { register, watch, setValue } = useFormContext();
  const currentValue = watch(name);

  const handleSwatchClick = (color: string) => {
    setValue(name, color, { shouldValidate: true });
  };

  return (
    <div className="color-picker">
      <div className="swatches" role="listbox" aria-labelledby={ariaLabelledby}>
        {swatches.map((color) => (
          <button
            key={color}
            type="button"
            role="option"
            aria-selected={currentValue === color}
            className={currentValue === color ? "selected" : ""}
            style={{ backgroundColor: color }}
            onClick={() => handleSwatchClick(color)}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
      {showHexInput && (
        <input
          type="text"
          pattern="^#[0-9A-Fa-f]{6}$"
          placeholder="#000000"
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          aria-errormessage={ariaErrormessage}
          aria-invalid={ariaInvalid}
          {...register(name, {
            ...registerProps,
            pattern: {
              value: /^#[0-9A-Fa-f]{6}$/,
              message: "Enter a valid hex color (e.g., #E95420)",
            },
          })}
        />
      )}
    </div>
  );
};

export const ColorPicker = withWrapper<ColorPickerProps>(ColorPickerInput);
```

## Wrapper Options

The `withWrapper` function accepts optional configuration:

```typescript
export default withWrapper<MyFieldProps>(MyField, {
  mockLabel: true, // Use <legend> instead of <label> (for fieldsets)
});
```

## Controlled vs Uncontrolled

The examples above use react-hook-form's uncontrolled approach with `register`. For controlled components (like third-party libraries that require a `value` prop), use the `Controller` component:

```typescript
import { Controller, useFormContext } from "react-hook-form";

const ControlledInput = ({ name, registerProps, ...props }: MyFieldProps) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      rules={registerProps}
      render={({ field }) => (
        <ThirdPartyInput
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          {...props}
        />
      )}
    />
  );
};

export const MyField = withWrapper<MyFieldProps>(ControlledInput);
```
