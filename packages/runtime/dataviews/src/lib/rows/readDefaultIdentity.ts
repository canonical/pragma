import readField from "./readField.js";

/**
 * The identifier used where none is declared: the record's own `id`, which
 * must be a non-empty string. A record without one is a configuration error,
 * not a row with an unknown identity, and the model rejects it — the read
 * itself answers with whatever the record carried.
 */
export default function readDefaultIdentity(row: object): unknown {
  return readField(row, "id");
}
