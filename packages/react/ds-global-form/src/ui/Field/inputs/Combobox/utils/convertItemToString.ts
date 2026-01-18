import type { Option } from "../../../types.js";

function convertItemToString(item: Option | null): string {
  return item ? item.label : "";
}

export default convertItemToString;
