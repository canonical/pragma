import type { Option } from "../ui/Field/types.js";

export const base: Option[] = [
	{ value: "1", label: "Option 1" },
	{ value: "2", label: "Option 2" },
	{ value: "3", label: "Option 3" },
];

export const withDisabled: Option[] = [
	{ value: "1", label: "Option 1" },
	{ value: "2", label: "Option 2", disabled: true },
	{ value: "3", label: "Option 3" },
	{ value: "4", label: "Option 4", disabled: true },
];
