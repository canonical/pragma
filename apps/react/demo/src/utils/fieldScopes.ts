import type {
  ExampleControlField,
  FieldElementScopeName,
} from "../ui/index.js";

export const fieldToElementScopedField = (
  field: ExampleControlField,
): ExampleControlField => {
  return {
    ...field,
    name: [field.elementScope, field.name].filter(Boolean).join("-"),
    ...field.scopeSpecificProps,
    scopeSpecificProps: undefined,
  };
};
