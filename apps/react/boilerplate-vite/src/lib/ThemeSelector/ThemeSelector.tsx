import { useTranslation } from "@canonical/i18n-react";
import { usePreferredTheme } from "@canonical/react-hooks";
import type { ChangeEvent, ReactElement } from "react";

export default function ThemeSelector(): ReactElement {
  const { value, source, set, reset } = usePreferredTheme();
  const { t } = useTranslation();

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
      aria-label={t("theme.label")}
      onChange={handleChange}
      value={selectValue}
    >
      <option value="system">{t("theme.system")}</option>
      <option value="light">{t("theme.light")}</option>
      <option value="dark">{t("theme.dark")}</option>
    </select>
  );
}
