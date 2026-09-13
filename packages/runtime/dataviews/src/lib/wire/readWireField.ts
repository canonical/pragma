import { OPERATOR_DELIMITER } from "./constants.js";

/** The field a wire key addresses: the part before the delimiter. */
export default function readWireField(key: string): string {
  const at = key.indexOf(OPERATOR_DELIMITER);
  return at === -1 ? key : key.slice(0, at);
}
