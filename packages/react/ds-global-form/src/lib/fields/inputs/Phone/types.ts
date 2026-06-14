import type { InputProps } from "../../types.js";

export type CountryData = {
  /** ISO 3166-1 alpha-2 code */
  code: string;

  /** Country name */
  name: string;

  /** Dial code (e.g. "+1") */
  dialCode: string;
};

type AdditionalPhoneProps = {
  /** Default country code (ISO 3166-1 alpha-2) */
  defaultCountry?: string;

  /** Countries to show at top of selector */
  preferredCountries?: string[];

  /** Value format: E.164 string or structured object */
  valueFormat?: "e164" | "structured";

  /** Whether the input is disabled */
  disabled?: boolean;
};

export type PhoneProps = InputProps<AdditionalPhoneProps>;

export type PhoneValue = {
  countryCode: string;
  number: string;
};
