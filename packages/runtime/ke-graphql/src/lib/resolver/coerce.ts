// =============================================================================
// Literal coercion: boolean-as-string (EC.03), numeric parsing, language-tag
// stripping (EC.06). Runtime failures go to the context's warning channel.
// =============================================================================

import { type RuntimeWarningHandler, XSD } from "../compiler/index.js";
import type { ScalarName } from "./types.js";

/**
 * Coerce a literal's lexical value to the target GraphQL scalar: strings
 * pass through, "true"/"false"/"1"/"0" become booleans, and numbers are
 * parsed base-10. Returns null (plus a runtime warning through the provided
 * handler) when the value cannot be coerced.
 */
export const coerce = (
  value: string,
  scalar: ScalarName,
  property: string,
  warn: RuntimeWarningHandler,
): string | number | boolean | null => {
  switch (scalar) {
    case "String":
      return value;
    case "Boolean": {
      if (value === "true" || value === "1") {
        return true;
      }
      if (value === "false" || value === "0") {
        return false;
      }
      warn({ property, value, reason: "not coercible to Boolean" });
      return null;
    }
    case "Int": {
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) {
        warn({ property, value, reason: "not coercible to Int" });
        return null;
      }
      return parsed;
    }
    case "Float": {
      const parsed = Number.parseFloat(value);
      if (Number.isNaN(parsed)) {
        warn({ property, value, reason: "not coercible to Float" });
        return null;
      }
      return parsed;
    }
  }
};

/**
 * Map an XSD datatype IRI to the GraphQL scalar it coerces to (boolean →
 * Boolean, integer family → Int, decimal family → Float); anything else,
 * including unknown datatypes, maps to String.
 */
export const mapXsdToScalar = (xsd: string): ScalarName => {
  switch (xsd) {
    case `${XSD}boolean`:
      return "Boolean";
    case `${XSD}integer`:
    case `${XSD}int`:
    case `${XSD}long`:
      return "Int";
    case `${XSD}float`:
    case `${XSD}double`:
    case `${XSD}decimal`:
      return "Float";
    default:
      return "String";
  }
};
