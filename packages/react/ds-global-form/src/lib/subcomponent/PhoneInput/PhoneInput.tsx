import { invariant } from "@canonical/utils";
import type React from "react";
import { forwardRef, useCallback, useMemo, useState } from "react";
import {
  type CountryData,
  countries as defaultCountries,
  type KnownCountryCode,
} from "../../utils/countries/index.js";
import createPatternFormatter from "../../utils/formatter/createPatternFormatter.js";
import useFormattedValue from "../../utils/hooks/useFormattedValue.js";
import mergeRefs from "../../utils/mergeRefs.js";
import type { PhoneInputProps, PhoneValue } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input phone chrome";

// Every country lookup falls back to the first entry, so an empty dataset has no
// country to render at all. Asserted rather than silently read out of bounds, so
// the cause is named instead of surfacing later as a missing dial code.
const EMPTY_COUNTRIES_MESSAGE =
  "PhoneInput requires a non-empty `countries` list.";

// Digits plus every separator the bundled masks actually use — space, parens,
// hyphen and the dot that `##.##.##` needs. The constraint applies to the string
// on screen, which carries those separators whenever `mask` is on, so a
// digits-only pattern would reject a correctly formatted number outright.
// Parens are escaped because `pattern` is compiled with the `v` flag first,
// where they are reserved inside a character class.
const ALLOWED_NUMBER_CHARACTERS = "[0-9+\\(\\)\\-\\.\\s]*";

/**
 * Derive the emoji flag for an ISO 3166-1 alpha-2 code by mapping each of its
 * two letters to its regional-indicator symbol (U+1F1E6–U+1F1FF). Non-alpha-2
 * codes (possible via the open `CountryCode` type or a custom dataset) are
 * returned unchanged rather than mapped into unrelated code points.
 * @note Pure.
 */
function buildFlagEmoji(code: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return code;
  return upper.replace(/[A-Z]/g, (char) =>
    String.fromCodePoint(127397 + char.charCodeAt(0)),
  );
}

/** Numeric dial code (e.g. "+44" -> 44) for sorting. @note Pure. */
function getDialCodeValue(dialCode: string): number {
  return Number.parseInt(dialCode.replace(/\D/g, ""), 10);
}

/** The selector label for a country after its dial code. @note Pure. */
function getCountryLabel(
  country: CountryData,
  display: "code" | "name" | "flag",
): string {
  if (display === "flag") return buildFlagEmoji(country.code);
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
 *
 * The forwarded ref reaches the national-number input — the field's focusable
 * element, and what react-hook-form needs for `setFocus` and focus-on-error.
 * @returns {React.ReactElement} - Rendered Phone
 *
 * `import { PhoneInput } from "@canonical/react-ds-global-form";`
 *
 * @implements ds:global.subcomponent.phone_input
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput(
    {
      id,
      className,
      style,
      name,
      value,
      onChange,
      onBlur,
      defaultCountry = "US",
      preferredCountries = [],
      filteredCountries,
      countries = defaultCountries,
      valueFormat = "e164",
      countryDisplay = "code",
      mask = false,
      disabled = false,
    },
    ref,
  ): React.ReactElement {
    const [selectedCountry, setSelectedCountry] = useState<string>(() => {
      if (valueFormat === "structured" && value && typeof value === "object") {
        return (value as PhoneValue).countryCode || defaultCountry;
      }
      return defaultCountry;
    });

    const sortedCountries = useMemo(() => {
      const byDialCode = (a: CountryData, b: CountryData) =>
        getDialCodeValue(a.dialCode) - getDialCodeValue(b.dialCode) ||
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

    const currentCountryData = useMemo(() => {
      const country =
        countries.find((c) => c.code === selectedCountry) ?? countries.at(0);
      invariant(country, EMPTY_COUNTRIES_MESSAGE);
      return country;
    }, [selectedCountry, countries]);

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
          countries.find((c) => c.code === countryCode) ?? countries.at(0);
        invariant(country, EMPTY_COUNTRIES_MESSAGE);
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

    // The national number is stored as digits and displayed grouped per the
    // selected country when `mask` is on. With `mask` off the formatter still
    // normalises to digits, so the two modes differ only in decoration.
    const formatter = createPatternFormatter(
      mask ? currentCountryData.format : undefined,
    );
    const number = useFormattedValue({
      formatter,
      model: formatter.parse(getCurrentNumber()),
      onModelChange: (digits) => emitValue(selectedCountry, digits),
    });

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
          autoComplete="tel-country-code"
          aria-label="Country code"
        >
          {sortedCountries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.dialCode} {getCountryLabel(country, countryDisplay)}
            </option>
          ))}
        </select>
        <input
          type="tel"
          className="number-input p"
          name={name}
          inputMode="tel"
          autoComplete="tel-national"
          pattern={ALLOWED_NUMBER_CHARACTERS}
          title="Digits, and the spacing characters used by the number's format."
          value={number.value}
          onChange={number.onChange}
          onCompositionStart={number.onCompositionStart}
          onCompositionEnd={number.onCompositionEnd}
          onBlur={onBlur}
          ref={mergeRefs(number.ref, ref)}
          disabled={disabled}
          aria-label="Phone number"
        />
      </div>
    );
  },
);

export default PhoneInput;
