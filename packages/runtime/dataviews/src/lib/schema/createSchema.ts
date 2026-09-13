import type { FieldValidation } from "../field/index.js";
import type {
  Predicate,
  PredicateOperand,
  PredicateOperator,
} from "../query/index.js";
import { wireNameRejection } from "../wire/index.js";
import isCalendarDate from "./isCalendarDate.js";
import type { SchemaFieldDefinition } from "./types.js";

/** A schema-enforced predicate, or the reason it is not valid. */
export type SchemaPredicateResult =
  | { readonly status: "valid"; readonly predicate: Predicate }
  | { readonly status: "invalid"; readonly reason: string };

/** Handle of one collection schema. */
export type Schema<TFields extends readonly SchemaFieldDefinition[]> = {
  /** The field definitions as a frozen copy, in construction order. */
  readonly fields: TFields;
  /** All field names, in definition order. */
  readonly fieldNames: readonly string[];
  /** Whether a field with this name exists. */
  readonly hasField: (name: string) => boolean;
  /**
   * The operators the field's kind accepts, empty for an unknown field and
   * for a kind the grammar has no operator for. One authority, so a source
   * declaring what it filters and a control offering it agree.
   *
   * @experimental Added with the text kind; a later operator on text would
   * change what it lists for such a field.
   */
  readonly listOperators: (name: string) => readonly PredicateOperator[];
  /**
   * Validate one text input for the field's single-value editing path.
   * Flag and text fields do not edit through a text input.
   */
  readonly validateInput: (name: string, input: string) => FieldValidation;
  /**
   * Build the addressed predicate for a field, enforcing the kind's legal
   * operators, the operator's grammar arity, and schema semantics beyond
   * the generic grammar: option membership, numeric range and date format.
   */
  readonly predicateFor: (
    name: string,
    operator: PredicateOperator,
    operands: readonly PredicateOperand[],
  ) => SchemaPredicateResult;
};

const isFiniteNumber = (value: PredicateOperand): value is number =>
  typeof value === "number" && Number.isFinite(value);

const operandLabel = (value: PredicateOperand): string =>
  typeof value === "string" ? `"${value}"` : String(value);

/** The operators each field kind accepts. */
const legalOperators = (
  definition: SchemaFieldDefinition,
): readonly PredicateOperator[] => {
  switch (definition.kind) {
    case "choices":
      return ["eq"];
    case "number":
    case "date":
      return ["gte", "lte"];
    case "flag":
      return ["isSet"];
    case "text":
      // The grammar has no substring operator.
      return [];
  }
};

/** The grammar arity each operator requires. */
const arityRejection = (
  operator: PredicateOperator,
  operandCount: number,
): string | null => {
  switch (operator) {
    case "eq":
      return operandCount > 0
        ? null
        : "eq predicate needs at least one operand";
    case "gte":
    case "lte":
      return operandCount === 1
        ? null
        : `${operator} predicate needs exactly one operand`;
    case "isSet":
      return operandCount === 0 ? null : "isSet predicate takes no operands";
  }
};

/** Validate operands against the field's schema semantics. */
const operandRejection = (
  definition: SchemaFieldDefinition,
  operands: readonly PredicateOperand[],
): string | null => {
  switch (definition.kind) {
    case "flag":
    case "text":
      // Neither carries an operand to check. Operand arity is the
      // operator's concern; see `arityRejection`.
      return null;
    case "choices":
      for (const operand of operands) {
        if (!definition.options.includes(operand as string | number)) {
          return `${operandLabel(operand)} is not an option of "${definition.field}"`;
        }
      }
      return null;
    case "number":
      for (const operand of operands) {
        if (!isFiniteNumber(operand)) {
          return `${operandLabel(operand)} is not a finite number`;
        }
        if (definition.min !== undefined && operand < definition.min) {
          return `${operandLabel(operand)} is below the minimum of ${definition.min}`;
        }
        if (definition.max !== undefined && operand > definition.max) {
          return `${operandLabel(operand)} is above the maximum of ${definition.max}`;
        }
      }
      return null;
    case "date":
      for (const operand of operands) {
        if (typeof operand !== "string" || !isCalendarDate(operand)) {
          return `${operandLabel(operand)} is not an ISO-8601 calendar date (YYYY-MM-DD)`;
        }
      }
      return null;
  }
};

/**
 * Create the collection schema: the one coherent construction path from
 * which field names, applied semantic types, input validation and schema
 * enforcement are inferred. Literal field names and options are inferred
 * without an `as const` annotation.
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
    const unspellable = wireNameRejection(definition.field);
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
    if (definition.kind === "number") {
      const { min, max } = definition;
      if (
        (min !== undefined && !Number.isFinite(min)) ||
        (max !== undefined && !Number.isFinite(max))
      ) {
        throw new Error(
          `number field "${definition.field}" requires finite bounds`,
        );
      }
      if (min !== undefined && max !== undefined && min > max) {
        throw new Error(
          `number field "${definition.field}" has an inverted range`,
        );
      }
    }
    if (definition.kind === "choices") {
      if (definition.options.length === 0) {
        throw new Error(
          `choices field "${definition.field}" requires at least one option`,
        );
      }
      if (
        definition.options.some(
          (option) => typeof option === "number" && !Number.isFinite(option),
        )
      ) {
        throw new Error(
          `choices field "${definition.field}" requires finite number options`,
        );
      }
      if (
        new Set(definition.options.map((option) => String(option))).size !==
        definition.options.length
      ) {
        throw new Error(
          `choices field "${definition.field}" has options with colliding string forms`,
        );
      }
    }
    byName.set(definition.field, definition);
  }

  return {
    fields: storedFields,
    fieldNames,
    hasField: (name: string) => byName.has(name),
    listOperators(name: string): readonly PredicateOperator[] {
      const definition = byName.get(name);
      return definition === undefined ? [] : legalOperators(definition);
    },
    validateInput(name: string, input: string): FieldValidation {
      const definition = byName.get(name);
      if (definition === undefined) {
        return { status: "invalid", reason: `unknown field "${name}"` };
      }
      if (definition.kind === "flag") {
        return {
          status: "invalid",
          reason: "flag fields edit through direct commands",
        };
      }
      if (definition.kind === "text") {
        return {
          status: "invalid",
          reason: "text fields are ordered, not filtered",
        };
      }
      if (input === "") {
        return { status: "incomplete" };
      }
      const parsed: PredicateOperand[] = [];
      if (definition.kind === "choices") {
        const operand = definition.options.find(
          (option) => String(option) === input,
        );
        if (operand === undefined) {
          return {
            status: "invalid",
            reason: `"${input}" is not an option of "${name}"`,
          };
        }
        parsed.push(operand);
      } else if (definition.kind === "number") {
        if (!/^-?\d+(\.\d+)?$/.test(input)) {
          return { status: "invalid", reason: "not a number" };
        }
        parsed.push(Number(input));
      } else {
        parsed.push(input);
      }
      const rejection = operandRejection(definition, parsed);
      if (rejection !== null) {
        return { status: "invalid", reason: rejection };
      }
      return { status: "valid", operands: parsed };
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
      if (!legalOperators(definition).includes(operator)) {
        return {
          status: "invalid",
          reason: `${definition.kind} field "${name}" does not accept the ${operator} operator`,
        };
      }
      const arity = arityRejection(operator, operands.length);
      if (arity !== null) {
        return { status: "invalid", reason: arity };
      }
      const rejection = operandRejection(definition, operands);
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
