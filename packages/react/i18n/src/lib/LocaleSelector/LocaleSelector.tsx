import type { ReactElement } from "react";
import useLocale from "../hooks/useLocale.js";
import type Props from "./types.js";

/**
 * An accessible language switcher: a controlled `<select>` bound to the active
 * locale via {@link useLocale}. Each `<option>` shows the locale's endonym — its
 * name in its own language, via `Intl.DisplayNames` — and carries its own `lang`
 * so assistive technology announces it with the right voice. Provide `labels` to
 * override the displayed names, and translate `aria-label` for the active locale.
 */
export default function LocaleSelector({
  className,
  labels,
  onChange,
  "aria-label": ariaLabel = "Language",
  ...props
}: Props): ReactElement {
  const { locale, setLocale, locales } = useLocale();

  return (
    <select
      {...props}
      aria-label={ariaLabel}
      className={["ds", "locale-selector", className].filter(Boolean).join(" ")}
      onChange={(event) => {
        onChange?.(event);
        setLocale(event.target.value);
      }}
      value={locale}
    >
      {locales.map((option) => (
        <option key={option} lang={option} value={option}>
          {labels?.[option] ??
            new Intl.DisplayNames([option], { type: "language" }).of(option)}
        </option>
      ))}
    </select>
  );
}
