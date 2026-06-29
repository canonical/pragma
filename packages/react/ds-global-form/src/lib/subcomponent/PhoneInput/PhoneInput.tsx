import type React from "react";
import { useCallback, useMemo, useState } from "react";
import defaultCountries from "./countries.js";
import type { CountryData, PhoneInputProps, PhoneValue } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input phone chrome";

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
  valueFormat = "e164",
  disabled = false,
}: PhoneInputProps): React.ReactElement => {
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    if (valueFormat === "structured" && value && typeof value === "object") {
      return (value as PhoneValue).countryCode || defaultCountry;
    }
    return defaultCountry;
  });

  const sortedCountries = useMemo(() => {
    if (preferredCountries.length === 0) return defaultCountries;
    const preferred: CountryData[] = [];
    const rest: CountryData[] = [];
    for (const country of defaultCountries) {
      if (preferredCountries.includes(country.code)) {
        preferred.push(country);
      } else {
        rest.push(country);
      }
    }
    return [...preferred, ...rest];
  }, [preferredCountries]);

  const currentCountryData = useMemo(
    () =>
      defaultCountries.find((c) => c.code === selectedCountry) ??
      defaultCountries[0],
    [selectedCountry],
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
        defaultCountries.find((c) => c.code === countryCode) ??
        defaultCountries[0];
      if (valueFormat === "e164") {
        onChange?.(number ? `${country.dialCode}${number}` : "");
      } else {
        onChange?.({ countryCode, number });
      }
    },
    [valueFormat, onChange],
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
            {country.code} {country.dialCode}
          </option>
        ))}
      </select>
      <input
        type="tel"
        className="number-input p"
        inputMode="tel"
        value={getCurrentNumber()}
        onChange={handleNumberChange}
        disabled={disabled}
        aria-label="Phone number"
      />
    </div>
  );
};

export default PhoneInput;
