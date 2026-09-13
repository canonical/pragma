import {
  type Applicability,
  type RowModel,
  type RowRecord,
  readField,
} from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import type { RecordTyping, RecordTypingConfig } from "./types.js";

const valueLabel = (value: unknown): string =>
  typeof value === "string" ? `"${value}"` : String(value);

/**
 * Create one collection's record typing: the discriminator checked against
 * the schema, the type scoping of every field indexed, and the memory of
 * what type each selected identity was displayed as.
 *
 * A monomorphic collection builds none of this; the provider holds null
 * instead and answers from that.
 */
export default function createRecordTyping<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(config: RecordTypingConfig<TFields, TRow>): RecordTyping<TRow> {
  const { schema, field: discriminator, selection, rows } = config;
  const definition = schema.fields.find(
    (candidate) => candidate.field === discriminator,
  );
  if (definition === undefined) {
    throw new Error(`unknown discriminator field "${discriminator}"`);
  }
  if (definition.kind !== "choices") {
    throw new Error(
      `discriminator field "${discriminator}" must be a choices field, not a ${definition.kind} one`,
    );
  }
  const names: string[] = [];
  for (const option of definition.options) {
    if (typeof option !== "string") {
      throw new Error(
        `discriminator field "${discriminator}" requires string options`,
      );
    }
    names.push(option);
  }
  const declared = new Set(names);

  // One scope per scoped field, indexed once: applicability is asked per
  // cell, and walking the field list would be a walk per cell.
  const scopes = new Map<string, ReadonlySet<string>>();
  for (const scoped of schema.fields) {
    if (scoped.types === undefined) {
      continue;
    }
    for (const name of scoped.types) {
      if (!declared.has(name)) {
        throw new Error(
          `field "${scoped.field}" is scoped to "${name}", which is not a type of "${discriminator}"`,
        );
      }
    }
    scopes.set(scoped.field, new Set(scoped.types));
  }

  /** A row's declared type name, or null when it carries no such name. */
  const nameOf = (row: TRow): string | null => {
    const value = readField(row, discriminator);
    return typeof value === "string" && declared.has(value) ? value : null;
  };

  // Keyed by the selected identities alone, so it is bounded by the
  // selection and never by how many rows have been displayed.
  let remembered = new Map<string, string>();

  return {
    declared: Object.freeze({
      field: discriminator,
      names: Object.freeze(names),
    }),
    rejectionOf(model: RowModel<TRow>): string | null {
      for (const entry of model.entries) {
        const value = readField(entry.record, discriminator);
        if (typeof value !== "string" || !declared.has(value)) {
          return `record type ${valueLabel(value)} of row "${entry.id}" is not declared`;
        }
      }
      return null;
    },
    applicability(field: string, row: TRow): Applicability {
      const scope = scopes.get(field);
      if (scope === undefined) {
        return "applies";
      }
      const type = nameOf(row);
      return type !== null && scope.has(type) ? "applies" : "not-applicable";
    },
    recordType(id: string): string | null {
      // Memory is of identities while they are selected: an identity that
      // left the selection is not one an action can be decided for.
      if (!selection.state.get().ids.has(id)) {
        return null;
      }
      // A row on display is the answer; memory answers for the rows that
      // are not. Reading it the other way round would let a remembered
      // type outlive the record it was taken from and contradict what
      // `applicability` reads off that same record.
      const record = rows.get().byId(id);
      return record === undefined
        ? (remembered.get(id) ?? null)
        : nameOf(record);
    },
    remember(model: RowModel<TRow>): void {
      // Rebuilt rather than added to: the pass that takes the types about
      // to leave the display is the pass that drops the deselected ones.
      const next = new Map<string, string>();
      for (const id of selection.state.get().ids) {
        const record = model.byId(id);
        const name =
          record === undefined ? (remembered.get(id) ?? null) : nameOf(record);
        if (name !== null) {
          next.set(id, name);
        }
      }
      remembered = next;
    },
    forget(): void {
      remembered = new Map();
    },
  };
}
