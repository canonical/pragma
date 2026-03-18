import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { addons } from "storybook/internal/preview-api";
import { EVENT_FORM_STATE } from "./constants.js";

/**
 * React hook that watches react-hook-form state and emits it to the
 * Storybook channel so the manager-side panel can display it.
 *
 * Call inside a React component that has access to a `useForm` return value.
 */
export function useFormStateEmitter(methods: UseFormReturn) {
  const values = methods.watch();
  const {
    errors,
    dirtyFields,
    touchedFields,
    isValid,
    isDirty,
    isSubmitting,
    submitCount,
  } = methods.formState;

  useEffect(() => {
    addons.getChannel().emit(EVENT_FORM_STATE, {
      values,
      errors: flattenErrors(errors),
      dirtyFields,
      touchedFields,
      isValid,
      isDirty,
      isSubmitting,
      submitCount,
    });
  }, [
    values,
    errors,
    dirtyFields,
    touchedFields,
    isValid,
    isDirty,
    isSubmitting,
    submitCount,
  ]);
}

/**
 * FieldErrors can be nested and contain ref objects that are not serialisable.
 * Flatten to `{ [path]: message }` for display.
 */
function flattenErrors(
  errors: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && "message" in value) {
      result[path] = String((value as { message?: unknown }).message ?? "");
    } else if (value && typeof value === "object" && !("ref" in value)) {
      Object.assign(
        result,
        flattenErrors(value as Record<string, unknown>, path),
      );
    }
  }
  return result;
}
