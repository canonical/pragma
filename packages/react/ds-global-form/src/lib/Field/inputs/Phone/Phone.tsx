import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import defaultCountries from "./countries.js";
import type { CountryData, PhoneProps, PhoneValue } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input phone chrome";

/**
 * Phone input combining a country code selector with a telephone number field.
 * @returns {React.ReactElement} - Rendered Phone
 */
const Phone = ({
  id,
  className,
  style,
  name,
  defaultCountry = "US",
  preferredCountries = [],
  valueFormat = "e164",
  disabled = false,
  registerProps,
  ...otherProps
}: PhoneProps): React.ReactElement => {
  const { control } = useFormContext();
  const {
    field: { value, onChange },
  } = useController({
    name,
    control,
    rules: registerProps,
    defaultValue:
      valueFormat === "e164" ? "" : { countryCode: defaultCountry, number: "" },
  });

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
        onChange(number ? `${country.dialCode}${number}` : "");
      } else {
        onChange({ countryCode, number });
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
        className="country-select"
        value={selectedCountry}
        onChange={handleCountryChange}
        disabled={disabled}
        aria-label="Country code"
        {...otherProps}
      >
        {sortedCountries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.code} {country.dialCode}
          </option>
        ))}
      </select>
      <input
        type="tel"
        className="number-input"
        inputMode="tel"
        value={getCurrentNumber()}
        onChange={handleNumberChange}
        disabled={disabled}
        aria-label="Phone number"
      />
    </div>
  );
};

export default withWrapper<PhoneProps>(Phone);
