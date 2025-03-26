import type { Option } from "../../../types.js";

function filterOptions(options: Option[], inputValue: string): Option[] {
	return options.filter(
		(option) =>
			!inputValue ||
			option.label.toLowerCase().includes(inputValue.toLowerCase()),
	);
}

export default filterOptions;
