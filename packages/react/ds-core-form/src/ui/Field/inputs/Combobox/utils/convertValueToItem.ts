import type { Option } from "../../../types.js";
import { VALUE_KEY } from "../constants.js";

function convertValueToItem(
  value: string,
  items: Option[],
  valueKey: keyof Option = VALUE_KEY,
): Option | undefined {
  return items.find((item: Option) => item[valueKey] === value);
}

export default convertValueToItem;
