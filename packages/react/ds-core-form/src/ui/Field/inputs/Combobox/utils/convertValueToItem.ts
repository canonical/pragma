import type { Option } from "../../../types.js";
import { VALUE_KEY } from "../constants.js";

function convertValueToItem(
  value: string,
  items: Option[],
  valueKey: string = VALUE_KEY,
): Option | null {
  // @ts-ignore
  return items.find((item: Item) => item[valueKey] === value);
}

export default convertValueToItem;
