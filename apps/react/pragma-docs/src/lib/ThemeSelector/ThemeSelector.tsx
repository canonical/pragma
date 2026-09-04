import { usePreferredTheme } from "@canonical/react-hooks";
import type { ChangeEvent, ReactElement } from "react";

export default function ThemeSelector(): ReactElement {
  const { value, source, set, reset } = usePreferredTheme();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const selected = event.target.value;

    if (selected === "system") {
      reset();
    } else {
      set(selected as "light" | "dark");
    }
  }

  const selectValue = source === "system" ? "system" : value;

  return (
    <select
      aria-label="Color theme"
      onChange={handleChange}
      value={selectValue}
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
