import type { BaseProps } from "../types.js";

export type CountryData = {
  /** ISO 3166-1 alpha-2 code */
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
   */
  countryDisplay?: "name" | "flag";

  /** Whether the input is disabled */
  disabled?: boolean;
};

export type PhoneValue = {
  countryCode: string;
  number: string;
};
