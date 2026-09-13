import { OPERATOR_DELIMITER, RESERVED_QUERY_KEYS } from "./constants.js";

/** Why a field name cannot be spelled on the wire, or null when it can. */
export default function rejectWireName(field: string): string | null {
  if (field.includes(OPERATOR_DELIMITER)) {
    return `field name "${field}" must not contain "${OPERATOR_DELIMITER}"`;
  }
  if (RESERVED_QUERY_KEYS.includes(field)) {
    return `field name "${field}" is a reserved query parameter`;
  }
  return null;
}
