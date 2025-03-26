import type { Option } from "../../../types.js";
import { VALUE_KEY } from "../constants.js";

function convertValueToItem(
	value: string,
	items: Option[],
	valueKey: keyof Option = VALUE_KEY,
): Option | null {
	return items.find((item: Option) => item[valueKey] === value) || null;
}

export default convertValueToItem;
