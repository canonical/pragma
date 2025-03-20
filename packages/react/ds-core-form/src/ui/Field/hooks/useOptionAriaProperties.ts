import { useId, useMemo } from "react";
import { ID_PREFIX } from "../constants.js";

/**
 * Generates ARIA properties for a specific option in a field.
 * @param {string} name - The base name of the input field.
 * @param {string} optionValue - The value of the specific option.
 * @returns An object containing ARIA attributes for the option.
 */
const useOptionAriaProps = (name: string, optionValue: string) => {
	const uniqueId = useId();
	const props = useMemo(() => {
		const baseId = `${uniqueId}-${name}`;
		const descriptionId = `${baseId}-description`;

		const optionBaseId = `${baseId}-${optionValue}`;
		const optionLabelId = `${optionBaseId}-label`;

		return {
			input: {
				id: optionBaseId,
				"aria-labelledby": optionLabelId,
				"aria-describedby": descriptionId,
			},
			label: {
				id: optionLabelId,
				htmlFor: optionBaseId,
			},
		};
	}, [name, optionValue, uniqueId]);
	return props;
};

export default useOptionAriaProps;
