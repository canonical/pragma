import type { FieldValidation } from "../field/index.js";
import {
  type PredicateOperand,
  type PredicateOperator,
  rejectOperandArity,
} from "../query/index.js";
import { rejectWireName } from "../wire/index.js";
import resolveFieldKind from "./resolveFieldKind.js";
import type {
  Schema,
  SchemaFieldDefinition,
  SchemaPredicateResult,
} from "./types.js";

/**
 * Create the collection schema: the one coherent construction path from
 * which field names, applied semantic types, input validation and schema
 * enforcement are inferred. Literal field names and options are inferred
 * without an `as const` annotation.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createSchema<
  const TFields extends readonly SchemaFieldDefinition[],
>(fields: TFields): Schema<TFields> {
  // Copy and freeze the caller's definitions so later mutations of the
  // input cannot desynchronize the public list from the lookups: the
  // lookups answer from the frozen copies, not the originals.
  const storedFields = Object.freeze(
    fields.map((definition) => {
      const scoping =
        definition.types === undefined
          ? {}
          : { types: Object.freeze([...definition.types]) };
      return definition.kind === "choices"
        ? Object.freeze({
            field: definition.field,
            kind: definition.kind,
            options: Object.freeze([...definition.options]),
            ...scoping,
          })
        : Object.freeze({ ...definition, ...scoping });
    }),
  ) as TFields;
  const fieldNames = Object.freeze(
    storedFields.map((definition) => definition.field),
  );
  const byName = new Map<string, SchemaFieldDefinition>();
  for (const definition of storedFields) {
    if (definition.field === "" || definition.field.includes("\u0000")) {
      throw new Error(
        "schema field names must be non-empty and free of NUL characters",
      );
    }
    if (byName.has(definition.field)) {
      throw new Error(`duplicate schema field "${definition.field}"`);
    }
    // A field is addressed on the wire by its own name, so a name the flat
    // grammar cannot spell is rejected here rather than at the first URL.
    const unspellable = rejectWireName(definition.field);
    if (unspellable !== null) {
      throw new Error(`schema ${unspellable}`);
    }
    // A field scoped to no type applies to no row at all. The provider
    // checks the names themselves against the discriminator's options; an
    // empty list is the one mistake only the schema can see.
    if (definition.types !== undefined && definition.types.length === 0) {
      throw new Error(
        `field "${definition.field}" is scoped to no record type`,
      );
    }
    const malformed = resolveFieldKind(definition.kind).rejectDefinition(
      definition,
    );
    if (malformed !== null) {
      throw new Error(malformed);
    }
    byName.set(definition.field, definition);
  }

  return {
    fields: storedFields,
    fieldNames,
    findField: (name: string) => byName.get(name),
    listOperators(name: string): readonly PredicateOperator[] {
      const definition = byName.get(name);
      return definition === undefined
        ? []
        : resolveFieldKind(definition.kind).operators;
    },
    validateInput(name: string, input: string): FieldValidation {
      const definition = byName.get(name);
      if (definition === undefined) {
        return { status: "invalid", reason: `unknown field "${name}"` };
      }
      const kind = resolveFieldKind(definition.kind);
      if (kind.input.kind === "none") {
        return { status: "invalid", reason: kind.input.reason };
      }
      if (input === "") {
        return { status: "incomplete" };
      }
      const parsed = kind.input.parse(definition, input);
      if (parsed.status === "invalid") {
        return parsed;
      }
      const operands: PredicateOperand[] = [parsed.operand];
      const rejection = kind.rejectOperands(definition, operands);
      if (rejection !== null) {
        return { status: "invalid", reason: rejection };
      }
      return { status: "valid", operands };
    },
    predicateFor(
      name: string,
      operator: PredicateOperator,
      operands: readonly PredicateOperand[],
    ): SchemaPredicateResult {
      const definition = byName.get(name);
      if (definition === undefined) {
        return { status: "invalid", reason: `unknown field "${name}"` };
      }
      const kind = resolveFieldKind(definition.kind);
      if (!kind.operators.includes(operator)) {
        return {
          status: "invalid",
          reason: `${definition.kind} field "${name}" does not accept the ${operator} operator`,
        };
      }
      const arity = rejectOperandArity(operator, operands.length);
      if (arity !== null) {
        return { status: "invalid", reason: arity };
      }
      const rejection = kind.rejectOperands(definition, operands);
      if (rejection !== null) {
        return { status: "invalid", reason: rejection };
      }
      return {
        status: "valid",
        predicate: { field: name, operator, operands: [...operands] },
      };
    },
  };
}
