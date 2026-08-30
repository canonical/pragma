// The country dataset only. The display-mask helpers that used to live here are
// now the generic `utils/formatter` module — a phone pattern is one instance of
// the model/view split, not a phone-specific mechanism.

export { default as countries } from "./countries.js";
export type { MaskKey } from "./masks.js";
export { default as masks } from "./masks.js";
export type { CountryCode, CountryData, KnownCountryCode } from "./types.js";
