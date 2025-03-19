import { useId, useMemo } from "react";

/**
 * Generates common ARIA properties for form field elements including input, label, description, and error state.
 * @param {string} name - The name of the field.
 * @param {boolean} isError - Indicates if the field is in an error state.
 * @returns An object containing ARIA attributes for input, label, description, and error state.
 */
const useFieldAriaProps = (name: string, isError: boolean) =>
  useMemo(() => {
    const uniqueId = useId();
    const baseId = `${uniqueId}-${name}`;
    const labelId = `${baseId}-label`;
    const descriptionId = `${baseId}-description`;
    const errorId = `${baseId}-error`;

    return {
      input: {
        id: baseId,
        "aria-labelledby": labelId,
        "aria-describedby": `${descriptionId}${isError}` ? ` ${labelId}` : "",
      },
      label: { id: labelId },
      description: { id: descriptionId },
      error: {
        id: errorId,
        // role: "alert",
      },
    };
  }, [name, isError]);

export default useFieldAriaProps;
