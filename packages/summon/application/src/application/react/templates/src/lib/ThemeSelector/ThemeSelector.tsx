import { usePreferredTheme } from "@canonical/react-hooks";
import type { ChangeEvent, ReactElement } from "react";

export default function ThemeSelector(): ReactElement {
  // `usePreferredTheme` reads the server-resolved theme from the InitialData
  // context (mounted in both entrypoints), so the rendered <select> matches the
  // server-painted theme and hydrates without a flash — no SSR wiring needed
  // here.
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
