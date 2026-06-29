import type { BaseProps } from "../types.js";

export type CountryData = {
  /**
   * **ISO 3166-1 alpha-2** code (two uppercase letters, e.g. `"US"`, `"GB"`).
   * This MUST be a valid alpha-2 code: the `countryDisplay: "flag"` emoji is
   * derived from it by mapping each letter to its Unicode regional-indicator
   * symbol. A non-alpha-2 code (3-letter, lowercase, numeric, etc.) yields a
   * broken or absent flag.
   */
  code: string;

  /** Country name */
  name: string;

  /** Dial code (e.g. "+1") */
  dialCode: string;
};

/** Props for the presentational Phone input (controlled, no react-hook-form). */
export type PhoneInputProps = BaseProps & {
  /** Controlled value — E.164 string or structured object. */
  value?: string | PhoneValue;

  /** Called with the next value in the configured `valueFormat`. */
  onChange?: (value: string | PhoneValue) => void;

  /** Default country code (ISO 3166-1 alpha-2) */
  defaultCountry?: string;

  /** Countries to show at top of selector */
  preferredCountries?: string[];

  /** Value format: E.164 string or structured object */
  valueFormat?: "e164" | "structured";

  /**
   * How each country is labelled in the selector, after its dial code:
   * `"name"` (default) shows the country name, `"flag"` shows its emoji flag.
   *
   * `"flag"` requires every country's `code` to be a valid **ISO 3166-1
   * alpha-2** code (see {@link CountryData.code}) — the flag is built from the
   * two letters' regional-indicator symbols. If you supply a custom country
   * list with non-alpha-2 codes, the flags will not render correctly; prefer
   * `"name"` in that case.
   */
  countryDisplay?: "name" | "flag";

  /** Whether the input is disabled */
  disabled?: boolean;
};

export type PhoneValue = {
  countryCode: string;
  number: string;
};
