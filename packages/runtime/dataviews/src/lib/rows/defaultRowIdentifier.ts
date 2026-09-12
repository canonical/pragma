import readField from "./readField.js";

/**
 * The identifier used where none is declared: the record's own `id`, which
 * must be a non-empty string. A record without one is a configuration
 * error, not a row with an unknown identity.
 */
export default function defaultRowIdentifier<TRow extends object>(
  row: TRow,
): string {
  const id = readField(row, "id");
  if (typeof id !== "string" || id === "") {
    throw new Error(
      "row record has no non-empty string id; declare identify to name one",
    );
  }
  return id;
}
