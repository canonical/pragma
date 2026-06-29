import type { CountryCode, CountryData } from "#lib/utils/countries/index.js";
import type { BaseProps } from "../types.js";

// The country dataset + codes live in `utils/countries`. Re-exported here so
// existing PhoneInput consumers keep importing `CountryData` from this module.
export type { CountryCode, CountryData } from "#lib/utils/countries/index.js";

/** Props for the presentational Phone input (controlled, no react-hook-form). */
export type PhoneInputProps = BaseProps & {
  /** Controlled value — E.164 string or structured object. */
  value?: string | PhoneValue;

  /** Called with the next value in the configured `valueFormat`. */
  onChange?: (value: string | PhoneValue) => void;

  /** Default country (ISO 3166-1 alpha-2). */
  defaultCountry?: CountryCode;

  /** Countries to show at the top of the selector (ISO 3166-1 alpha-2). */
  preferredCountries?: CountryCode[];

  /**
   * Custom country list. Defaults to the bundled `utils/countries` dataset.
   * Codes must be ISO 3166-1 alpha-2 (see {@link CountryData.code}).
   */
  countries?: CountryData[];

  /** Value format: E.164 string or structured object. */
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

  /**
   * Opt in to live national-number formatting using the selected country's
   * display mask (cosmetic spacing/dashes; see {@link CountryData.format}).
   * Defaults to `false` — the number is shown as raw digits and the mask code
   * is tree-shaken out. The submitted value is always raw digits / E.164
   * regardless of this option.
   */
  mask?: boolean;

  /** Whether the input is disabled. */
  disabled?: boolean;
};

export type PhoneValue = {
  countryCode: string;
  number: string;
};
