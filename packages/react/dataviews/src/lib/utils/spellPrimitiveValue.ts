/**
 * A field value as the text a renderer shows by default: a string as it is,
 * a number, bigint or boolean spelled out, and null for anything else — an
 * object, an array, null or undefined — which needs the field's own `cell`.
 */
export default function spellPrimitiveValue(value: unknown): string | null {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "bigint":
    case "boolean":
      return String(value);
    default:
      return null;
  }
}
