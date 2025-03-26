import type { Option } from "../../../types.js";

function convertOptionToString(option: Option | null): string {
	return option ? option.label : "";
}

export default convertOptionToString;
