import { useId, useMemo } from "react";

/**
 * Generates common ARIA properties for form field elements including input, label, description, and error state.
 * @param {string} name - The name of the field.
 * @param {boolean} isError - Indicates if the field is in an error state.
 * @param {boolean} [isRequired] - Whether the field is required (drives `aria-required`, independent of error state).
 * @returns An object containing ARIA attributes for input, label, description, and error state.
 */
const useFieldAriaProps = (
  name: string,
  isError: boolean,
  isRequired = false,
) => {
  const uniqueId = useId();
  const props = useMemo(() => {
    const baseId = `${uniqueId}-${name}`;
    const labelId = `${baseId}-label`;
    const descriptionId = `${baseId}-description`;
    const errorId = `${baseId}-error`;

    return {
      input: {
        id: baseId,
        "aria-labelledby": labelId,
        "aria-describedby":
          [descriptionId, isError ? errorId : ""].filter(Boolean).join(" ") ||
          undefined,
        "aria-errormessage": isError ? errorId : undefined,
        "aria-invalid": isError,
        // Required state is a property of the field's optionality, NOT its
        // error state — set it whenever the field is required so assistive tech
        // announces it before the user triggers a validation error.
        "aria-required": isRequired || undefined,
      },
      label: {
        id: labelId,
        htmlFor: baseId,
      },
      description: { id: descriptionId },
      error: {
        id: errorId,
        // role: "alert",
      },
    };
  }, [name, isError, isRequired, uniqueId]);
  return props;
};

export default useFieldAriaProps;
