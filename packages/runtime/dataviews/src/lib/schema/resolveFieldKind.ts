import type { Predicate, PredicateOperand } from "../query/index.js";
import isCalendarDate from "./isCalendarDate.js";
import readInstant from "./readInstant.js";
import type {
  ChoicesField,
  DateField,
  FieldKind,
  FieldKindRules,
  FlagField,
  KindOrder,
  NumberField,
  OrderKey,
  SchemaFieldDefinition,
  TextField,
} from "./types.js";

const createKey = (rank: number, text = ""): OrderKey => ({ rank, text });

const compareByCodePoint = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const describeOperand = (value: PredicateOperand): string =>
  typeof value === "string" ? `"${value}"` : String(value);

/** The single bound a range predicate carries. */
const readBound = (predicate: Predicate): unknown => predicate.operands[0];

/** Two values of one kind compared by identity, as every scalar kind is. */
const isSameValue = (a: unknown, b: unknown): boolean => a === b;

/**
 * Order two numbers, or two strings by code point. Values of different
 * types, and `NaN`, are incomparable — the source never invents an order
 * across types, and never reports a `NaN` as within a range.
 */
const compareScalars = (
  value: unknown,
  bound: PredicateOperand,
): number | null => {
  if (typeof value === "number" && typeof bound === "number") {
    return Number.isNaN(value) || Number.isNaN(bound)
      ? null
      : Math.sign(value - bound);
  }
  if (typeof value === "string" && typeof bound === "string") {
    return compareByCodePoint(value, bound);
  }
  return null;
};

/** Booleans order false before true; anything else is not a flag value. */
const compareBooleans = (
  value: unknown,
  bound: PredicateOperand,
): number | null =>
  typeof value === "boolean" && typeof bound === "boolean"
    ? Number(value) - Number(bound)
    : null;

const CHOICES: FieldKindRules<ChoicesField> = {
  operators: ["eq"],
  rejectDefinition: (definition) => {
    if (definition.options.length === 0) {
      return `choices field "${definition.field}" requires at least one option`;
    }
    if (
      definition.options.some(
        (option) => typeof option === "number" && !Number.isFinite(option),
      )
    ) {
      return `choices field "${definition.field}" requires finite number options`;
    }
    if (
      new Set(definition.options.map((option) => String(option))).size !==
      definition.options.length
    ) {
      return `choices field "${definition.field}" has options with colliding string forms`;
    }
    return null;
  },
  input: {
    kind: "text",
    parse: (definition, input) => {
      const operand = definition.options.find(
        (option) => String(option) === input,
      );
      return operand === undefined
        ? {
            status: "invalid",
            reason: `"${input}" is not an option of "${definition.field}"`,
          }
        : { status: "valid", operand };
    },
  },
  rejectOperands: (definition, operands) => {
    for (const operand of operands) {
      if (!definition.options.some((option) => option === operand)) {
        return `${describeOperand(operand)} is not an option of "${definition.field}"`;
      }
    }
    return null;
  },
  readApplied: (predicate) => new Set(predicate.operands),
  areAppliedEqual: (a, b) => {
    if (!(a instanceof Set) || !(b instanceof Set) || a.size !== b.size) {
      return false;
    }
    for (const entry of a) {
      if (!b.has(entry)) {
        return false;
      }
    }
    return true;
  },
  compareToBound: compareScalars,
  createOrder: (definition) => {
    // Keyed by string form, as the schema matches an option to an input:
    // colliding string forms are rejected at construction, so this is exact.
    const ranks = new Map(
      definition.options.map((option, index) => [String(option), index]),
    );
    return {
      readKey: (value) => {
        if (typeof value !== "string" && typeof value !== "number") {
          return null;
        }
        const text = String(value);
        const rank = ranks.get(text);
        // A value the options do not list is still a value: it orders after
        // every declared one rather than disappearing into the empties.
        return rank === undefined
          ? createKey(ranks.size, text)
          : createKey(rank);
      },
      compareText: compareByCodePoint,
    };
  },
};

const NUMBER_ORDER: KindOrder = {
  readKey: (value) => (isFiniteNumber(value) ? createKey(value) : null),
  compareText: compareByCodePoint,
};

const NUMBER: FieldKindRules<NumberField> = {
  operators: ["gte", "lte"],
  rejectDefinition: ({ field, min, max }) => {
    if (
      (min !== undefined && !Number.isFinite(min)) ||
      (max !== undefined && !Number.isFinite(max))
    ) {
      return `number field "${field}" requires finite bounds`;
    }
    if (min !== undefined && max !== undefined && min > max) {
      return `number field "${field}" has an inverted range`;
    }
    return null;
  },
  input: {
    kind: "text",
    parse: (_definition, input) =>
      /^-?\d+(\.\d+)?$/.test(input)
        ? { status: "valid", operand: Number(input) }
        : { status: "invalid", reason: "not a number" },
  },
  rejectOperands: (definition, operands) => {
    for (const operand of operands) {
      if (!isFiniteNumber(operand)) {
        return `${describeOperand(operand)} is not a finite number`;
      }
      if (definition.min !== undefined && operand < definition.min) {
        return `${describeOperand(operand)} is below the minimum of ${definition.min}`;
      }
      if (definition.max !== undefined && operand > definition.max) {
        return `${describeOperand(operand)} is above the maximum of ${definition.max}`;
      }
    }
    return null;
  },
  readApplied: readBound,
  areAppliedEqual: isSameValue,
  compareToBound: compareScalars,
  createOrder: () => NUMBER_ORDER,
};

/**
 * A flag orders false before true. Its domain is presence — the one thing
 * it filters on — so anything present that is not a boolean counts as set
 * and only an absent value is empty. Ordering and `isSet` then agree about
 * which rows are set.
 */
const FLAG_ORDER: KindOrder = {
  readKey: (value) =>
    value === null || value === undefined
      ? null
      : createKey(value === false ? 0 : 1),
  compareText: compareByCodePoint,
};

const FLAG: FieldKindRules<FlagField> = {
  operators: ["isSet"],
  // A flag is its name and nothing more.
  rejectDefinition: () => null,
  input: { kind: "none", reason: "flag fields edit through direct commands" },
  // Neither carries an operand to check; operand arity is the operator's
  // concern, and the grammar checks it.
  rejectOperands: () => null,
  readApplied: () => true,
  areAppliedEqual: isSameValue,
  compareToBound: compareBooleans,
  createOrder: () => FLAG_ORDER,
};

const DATE_ORDER: KindOrder = {
  readKey: (value) => {
    const at = readInstant(value);
    return at === null ? null : createKey(at);
  },
  compareText: compareByCodePoint,
};

const DATE: FieldKindRules<DateField> = {
  operators: ["gte", "lte"],
  rejectDefinition: () => null,
  input: {
    kind: "text",
    parse: (_definition, input) => ({ status: "valid", operand: input }),
  },
  rejectOperands: (_definition, operands) => {
    for (const operand of operands) {
      if (typeof operand !== "string" || !isCalendarDate(operand)) {
        return `${describeOperand(operand)} is not an ISO-8601 calendar date (YYYY-MM-DD)`;
      }
    }
    return null;
  },
  readApplied: readBound,
  areAppliedEqual: isSameValue,
  // The filter domain is the calendar date, so a row's value is compared
  // with the bound as the calendar-date string it was given as.
  compareToBound: compareScalars,
  createOrder: () => DATE_ORDER,
};

const TEXT: FieldKindRules<TextField> = {
  // The grammar has no substring operator.
  operators: [],
  rejectDefinition: () => null,
  input: { kind: "none", reason: "text fields are ordered, not filtered" },
  rejectOperands: () => null,
  readApplied: readBound,
  areAppliedEqual: isSameValue,
  compareToBound: compareScalars,
  /**
   * Text orders through the source's collator. An empty string carries
   * nothing to order by, so it is empty rather than a value: two blank cells
   * a reader cannot tell apart must not order differently, and one of them
   * must not move with the direction while the other stays last.
   */
  createOrder: (_definition, collator) => ({
    readKey: (value) =>
      typeof value === "string" && value !== "" ? createKey(0, value) : null,
    compareText: collator === null ? compareByCodePoint : collator.compare,
  }),
};

/**
 * The one table of field kinds. Each row is typed against its own
 * definition, and the table against every kind, so adding a kind is a
 * compile error until its row exists.
 */
const FIELD_KINDS: {
  readonly [TKind in FieldKind]: FieldKindRules<
    Extract<SchemaFieldDefinition, { readonly kind: TKind }>
  >;
} = {
  choices: CHOICES,
  number: NUMBER,
  flag: FLAG,
  date: DATE,
  text: TEXT,
};

/**
 * Resolve everything one field kind decides. The rules are typed against
 * the widest definition, because every caller holds a definition it has
 * already narrowed by the same kind; the table's own rows are typed
 * against theirs.
 */
export default function resolveFieldKind(kind: FieldKind): FieldKindRules {
  return FIELD_KINDS[kind] as FieldKindRules;
}
