import type { Option } from "../../../types.js";
import { VALUE_KEY } from "../constants.js";

function convertValueToOption(
	value: string,
	options: Option[],
	valueKey: string = VALUE_KEY,
): Option | undefined {
	// @ts-ignore
	return options.find((option: Option) => option[valueKey] === value);
}

export default convertValueToOption;
