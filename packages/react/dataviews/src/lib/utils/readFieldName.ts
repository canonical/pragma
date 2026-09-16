import type { DisplayField } from "../common/index.js";

/** The field one display field reads: its own, or its id when it names none. */
export default function readFieldName(field: DisplayField): string {
  return field.field ?? field.id;
}
