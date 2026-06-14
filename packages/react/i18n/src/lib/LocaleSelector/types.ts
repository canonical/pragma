import type { Locale } from "@canonical/i18n-core";
import type { SelectHTMLAttributes } from "react";

/** Locale-specific props for `LocaleSelector`. */
export interface LocaleSelectorBaseProps {
  /** Override the displayed name per locale; defaults to the locale's endonym. */
  labels?: Partial<Record<Locale, string>>;
}

/** Props for `LocaleSelector`. `value` is controlled by the active locale. */
type Props = LocaleSelectorBaseProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "value">;

export default Props;
