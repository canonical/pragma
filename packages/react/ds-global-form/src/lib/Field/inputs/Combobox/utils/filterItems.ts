import type { Option } from "../../../types.js";

function filterItems(items: Option[], inputValue: string): Option[] {
  return items.filter(
    (item) =>
      !inputValue ||
      item.label.toLowerCase().includes(inputValue.toLowerCase()),
  );
}

export default filterItems;
