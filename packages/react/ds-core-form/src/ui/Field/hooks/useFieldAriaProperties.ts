import { useId, useMemo } from "react";

/**
 * Generates common ARIA properties for form field elements including input, label, description, and error state.
 * @param {string} name - The name of the field.
 * @param {boolean} isError - Indicates if the field is in an error state.
 * @returns An object containing ARIA attributes for input, label, description, and error state.
 */
const useFieldAriaProps = (name: string, isError: boolean) => {
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
				"aria-describedby": `${descriptionId}${isError}` ? ` ${labelId}` : "",
				"aria-errormessage": isError ? errorId : undefined,
				"aria-invalid": isError,
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
	}, [name, isError, uniqueId]);
	return props;
};

export default useFieldAriaProps;
