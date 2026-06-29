import type React from "react";
import { useCallback, useMemo, useState } from "react";
import {
  applyPhoneMask,
  type CountryData,
  countries as defaultCountries,
  type KnownCountryCode,
} from "#lib/utils/countries/index.js";
import type { PhoneInputProps, PhoneValue } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input phone chrome";

/**
 * Derive the emoji flag for an ISO 3166-1 alpha-2 code by mapping each of its
 * two letters to its regional-indicator symbol (U+1F1E6–U+1F1FF). Non-alpha-2
 * codes (possible via the open `CountryCode` type or a custom dataset) are
 * returned unchanged rather than mapped into unrelated code points.
 * @note Pure.
 */
function flagEmoji(code: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return code;
  return upper.replace(/[A-Z]/g, (char) =>
    String.fromCodePoint(127397 + char.charCodeAt(0)),
  );
}

/** Numeric dial code (e.g. "+44" -> 44) for sorting. @note Pure. */
function dialCodeValue(dialCode: string): number {
  return Number.parseInt(dialCode.replace(/\D/g, ""), 10);
}

/** The selector label for a country after its dial code. @note Pure. */
function countryLabel(
  country: CountryData,
  display: "code" | "name" | "flag",
): string {
  if (display === "flag") return flagEmoji(country.code);
  if (display === "name") return country.name;
  return country.code;
}

/**
 * Presentational phone input combining a country code selector with a telephone
 * number field — pure markup, no react-hook-form.
 *
 * Controlled via `value`/`onChange`. The composite value is parsed into a
 * country + number internally, and emitted back in the configured `valueFormat`
 * (an E.164 string or a structured `{ countryCode, number }` object). It
 * defaults defensively, so an undefined initial `value` renders the
 * `defaultCountry` with an empty number.
 * @returns {React.ReactElement} - Rendered Phone
 */
export const PhoneInput = ({
  id,
  className,
  style,
  value,
  onChange,
  defaultCountry = "US",
  preferredCountries = [],
  filteredCountries,
  countries = defaultCountries,
  valueFormat = "e164",
  countryDisplay = "code",
  mask = false,
  disabled = false,
}: PhoneInputProps): React.ReactElement => {
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    if (valueFormat === "structured" && value && typeof value === "object") {
      return (value as PhoneValue).countryCode || defaultCountry;
    }
    return defaultCountry;
  });

  const sortedCountries = useMemo(() => {
    const byDialCode = (a: CountryData, b: CountryData) =>
      dialCodeValue(a.dialCode) - dialCodeValue(b.dialCode) ||
      a.name.localeCompare(b.name);

    // 1. `filteredCountries` (if given) restricts the visible universe to a
    //    whitelist, kept in the order the consumer listed it. Otherwise the
    //    full dataset is the universe, sorted by dial code.
    const universe = filteredCountries
      ? filteredCountries
          .map((code) => countries.find((c) => c.code === code))
          .filter((c): c is CountryData => Boolean(c))
      : [...countries].sort(byDialCode);

    // 2. `preferredCountries` hoists favourites to the top in the order given;
    //    the rest keep the universe's order.
    if (preferredCountries.length === 0) return universe;
    const preferred: CountryData[] = [];
    const rest: CountryData[] = [];
    for (const country of universe) {
      if (preferredCountries.includes(country.code as KnownCountryCode)) {
        preferred.push(country);
      } else {
        rest.push(country);
      }
    }
    preferred.sort(
      (a, b) =>
        preferredCountries.indexOf(a.code as KnownCountryCode) -
        preferredCountries.indexOf(b.code as KnownCountryCode),
    );
    return [...preferred, ...rest];
  }, [preferredCountries, filteredCountries, countries]);

  const currentCountryData = useMemo(
    () => countries.find((c) => c.code === selectedCountry) ?? countries[0],
    [selectedCountry, countries],
  );

  const getCurrentNumber = useCallback((): string => {
    if (valueFormat === "structured" && value && typeof value === "object") {
      return (value as PhoneValue).number || "";
    }
    if (
      typeof value === "string" &&
      value.startsWith(currentCountryData.dialCode)
    ) {
      return value.slice(currentCountryData.dialCode.length);
    }
    return typeof value === "string" ? value : "";
  }, [value, valueFormat, currentCountryData]);

  const emitValue = useCallback(
    (countryCode: string, number: string) => {
      const country =
        countries.find((c) => c.code === countryCode) ?? countries[0];
      // The emitted national number is always raw digits — the mask is purely a
      // display concern, never part of the submitted value.
      const digits = number.replace(/\D/g, "");
      if (valueFormat === "e164") {
        onChange?.(digits ? `${country.dialCode}${digits}` : "");
      } else {
        onChange?.({ countryCode, number: digits });
      }
    },
    [valueFormat, onChange, countries],
  );

  const handleCountryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const code = e.target.value;
      setSelectedCountry(code);
      emitValue(code, getCurrentNumber());
    },
    [emitValue, getCurrentNumber],
  );

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      emitValue(selectedCountry, e.target.value);
    },
    [selectedCountry, emitValue],
  );

  // Display value for the number field: masked per the country's format when
  // `mask` is enabled, otherwise the raw digits.
  const displayNumber = mask
    ? applyPhoneMask(getCurrentNumber(), currentCountryData.format)
    : getCurrentNumber();

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <select
        className="country-select p"
        value={selectedCountry}
        onChange={handleCountryChange}
        disabled={disabled}
        aria-label="Country code"
      >
        {sortedCountries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.dialCode} {countryLabel(country, countryDisplay)}
          </option>
        ))}
      </select>
      <input
        type="tel"
        className="number-input p"
        inputMode="tel"
        value={displayNumber}
        onChange={handleNumberChange}
        disabled={disabled}
        aria-label="Phone number"
      />
    </div>
  );
};

export default PhoneInput;
