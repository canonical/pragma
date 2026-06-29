import type {
  CountryData,
  KnownCountryCode,
} from "#lib/utils/countries/index.js";
import type { BaseProps } from "../types.js";

// The country dataset + codes live in `utils/countries`. Re-exported here so
// existing PhoneInput consumers keep importing these from this module.
export type {
  CountryCode,
  CountryData,
  KnownCountryCode,
} from "#lib/utils/countries/index.js";

/** Props for the presentational Phone input (controlled, no react-hook-form). */
export type PhoneInputProps = BaseProps & {
  /** Controlled value — E.164 string or structured object. */
  value?: string | PhoneValue;

  /** Called with the next value in the configured `valueFormat`. */
  onChange?: (value: string | PhoneValue) => void;

  /** Default country (a known ISO 3166-1 alpha-2 code from the dataset). */
  defaultCountry?: KnownCountryCode;

  /**
   * Restrict the selector to ONLY these countries (a whitelist of known ISO
   * 3166-1 alpha-2 codes) — they form the visible universe. When omitted, the
   * full dataset is available. Composes with `preferredCountries`, which then
   * hoists favourites within this filtered set.
   */
  filteredCountries?: KnownCountryCode[];

  /**
   * Hoist these countries to the TOP of the selector, in the order given (known
   * ISO 3166-1 alpha-2 codes); the remaining countries follow, sorted by dial
   * code. Unlike `filteredCountries`, this does not remove any country.
   */
  preferredCountries?: KnownCountryCode[];

  /**
   * Custom country list. Defaults to the bundled `utils/countries` dataset.
   * Codes must be ISO 3166-1 alpha-2 (see {@link CountryData.code}).
   */
  countries?: CountryData[];

  /** Value format: E.164 string or structured object. */
  valueFormat?: "e164" | "structured";

  /**
   * How each country is labelled in the selector, after its dial code:
   * `"code"` (default) shows the ISO code (e.g. `+1 US`), `"name"` shows the
   * full country name (`+1 United States`), `"flag"` shows its emoji flag.
   *
   * `"flag"` requires every country's `code` to be a valid **ISO 3166-1
   * alpha-2** code (see {@link CountryData.code}) — the flag is built from the
   * two letters' regional-indicator symbols. If you supply a custom country
   * list with non-alpha-2 codes, the flags will not render correctly; prefer
   * `"code"` or `"name"` in that case.
   */
  countryDisplay?: "code" | "name" | "flag";

  /**
   * Opt in to live national-number formatting using the selected country's
   * display mask (cosmetic spacing/dashes; see {@link CountryData.format}).
   * Defaults to `false` — the number is shown as raw digits and `applyPhoneMask`
   * is not invoked. The submitted value is always raw digits / E.164 regardless
   * of this option. (The RHF-side `removePhoneMask` / `phoneRegisterOptions`
   * helpers are separate opt-in modules, so they are tree-shaken out unless
   * imported.)
   */
  mask?: boolean;

  /** Whether the input is disabled. */
  disabled?: boolean;
};

export type PhoneValue = {
  countryCode: string;
  number: string;
};
