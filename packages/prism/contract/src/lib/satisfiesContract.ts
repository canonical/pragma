/**
 * The contract check: does a provider's schema SUBSUME the contract?
 *
 * This is deliberately NOT an AST or text comparison. A real provider's SDL is
 * a strict superset of the contract (it adds every ontology-derived type), so
 * it always differs textually and always will. The question that actually
 * matters is semantic: could every operation that is legal against the
 * contract also run against the provider?
 *
 * graphql-js answers most of that. `findBreakingChanges(old, new)` reports
 * every way in which `new` fails to remain compatible with `old`, so with the
 * contract as `old` and the provider as `new`, zero breaking changes means the
 * provider kept everything the contract promised.
 *
 * Most, not all — so two things are settled around it:
 *
 * - `findBreakingChanges` compares TYPE MAPS by name and never looks at which
 *   type a schema actually uses as a root. A provider that declares
 *   `schema { query: RootQuery }` while leaving a conforming but unreachable
 *   `type Query` in its type map would therefore pass while serving nothing.
 *   The root-assignment check below closes that: for every operation the
 *   contract names a root for, the provider must serve that operation from a
 *   type of the same name. Every real provider already does, because the
 *   contract is the shape it was compiled from — but "already does" is not a
 *   check, and this predicate is quoted as an equivalence.
 * - `findDangerousChanges` is not consulted. Adding an optional argument, a
 *   union member, or an enum value is dangerous for a CLIENT and perfectly
 *   legal for a superset PROVIDER, and every real provider does several. One
 *   member of that set is a genuine divergence rather than a superset —
 *   `ARG_DEFAULT_VALUE_CHANGE` — and it is knowingly out of scope: a default
 *   changes what an omitted argument MEANS, not which operations are legal,
 *   and the contract's promise is about legality. `satisfiesContract.test.ts`
 *   pins that acceptance so the boundary is measured rather than assumed.
 */

import {
  assertValidSchema,
  buildSchema,
  findBreakingChanges,
  GraphQLError,
  type GraphQLObjectType,
  type GraphQLSchema,
  validateSchema,
} from "graphql";
import {
  DEFAULT_PROVIDER_NAME,
  INVALID_SCHEMA,
  INVALID_SDL,
  ROOT_TYPE_MISMATCH,
} from "./constants.js";
import { readContractSdl } from "./contractSdl.js";
import type {
  AssertSatisfiesContractOptions,
  ContractResult,
  ContractViolation,
  SatisfiesContractOptions,
} from "./types.js";

/**
 * Render a `buildSchema` failure for a provider author.
 *
 * `buildSchema` throws two different things, and the difference is worth the
 * branch. A PARSE failure is a `GraphQLError`, whose `toString()` prints the
 * message, the line and column, and a caret-annotated excerpt of the offending
 * source — everything the author needs, and all of it lost if only `.message`
 * is read. An SDL-VALIDATION failure (a duplicated type name, say) is a plain
 * `Error` aggregating several messages, with no location to print.
 */
const describeError = (error: unknown): string => {
  if (error instanceof GraphQLError) {
    return String(error);
  }
  /* v8 ignore else -- unreachable: buildSchema throws GraphQLError for a parse failure and a plain aggregated Error for an SDL-validation failure, both handled above; the String(error) arm stays because `catch` is typed `unknown` and dropping it would mean asserting a type the language does not guarantee */
  if (error instanceof Error) {
    return error.message;
  } else {
    return String(error);
  }
};

/**
 * How to read each operation's root type off a schema, by operation name.
 *
 * Keyed rather than hard-coded to `query` so that a contract which later names
 * a mutation or subscription root is covered the day it does, without a second
 * edit here.
 */
const ROOT_TYPE_READERS: Readonly<
  Record<
    string,
    (schema: GraphQLSchema) => GraphQLObjectType | null | undefined
  >
> = {
  query: (schema) => schema.getQueryType(),
  mutation: (schema) => schema.getMutationType(),
  subscription: (schema) => schema.getSubscriptionType(),
};

/**
 * Every operation whose root type the provider does not share with the
 * contract.
 *
 * The contract's own roots are the subject: an operation the contract does not
 * name (it names no mutation today) puts no obligation on a provider, so a
 * provider is free to add one.
 */
const findRootTypeMismatches = (
  contractSchema: GraphQLSchema,
  providerSchema: GraphQLSchema,
): ContractViolation[] =>
  Object.entries(ROOT_TYPE_READERS).flatMap(([operation, readRootType]) => {
    const expected = readRootType(contractSchema)?.name;
    const actual = readRootType(providerSchema)?.name;
    if (expected === undefined || expected === actual) {
      return [];
    }
    return [
      {
        code: ROOT_TYPE_MISMATCH,
        message: `the contract serves ${operation} operations from type "${expected}", but the provider serves them from "${actual}": every ${operation} the contract promises would be executed against a different type`,
      },
    ];
  });

/**
 * Check a provider's SDL against the contract.
 *
 * Takes SDL as a STRING, never a GraphQLSchema. Two graphql versions coexist
 * in this repo and a schema object built by one must never be handed to the
 * other; text is the only safe currency across that boundary.
 *
 * A malformed CONTRACT throws (the contract is ours: that is a programmer
 * error). A provider that does not parse comes back as a single
 * `INVALID_SDL` violation, one that parses into an invalid schema as
 * `INVALID_SCHEMA` violations, and one that serves a contract operation from a
 * differently named root type as a `ROOT_TYPE_MISMATCH` violation.
 *
 * @note Impure: reads the shipped contract SDL from the filesystem unless
 * `contractSdl` is supplied. This is the documented default path, so the
 * common call is a reading one.
 */
export const satisfiesContract = (
  providerSdl: string,
  options: SatisfiesContractOptions = {},
): ContractResult => {
  // Outside the try: a broken contract must surface as a thrown error. Both
  // halves of "broken" are checked, because parsing is not validity here
  // either — a contract that builds into a schema graphql refuses to execute
  // could otherwise certify a provider as conforming to something unservable.
  const contractSchema = buildSchema(options.contractSdl ?? readContractSdl());
  assertValidSchema(contractSchema);

  let providerSchema: GraphQLSchema;
  try {
    providerSchema = buildSchema(providerSdl);
  } catch (error) {
    return {
      satisfied: false,
      violations: [
        {
          code: INVALID_SDL,
          message: `provider SDL could not be parsed: ${describeError(error)}`,
        },
      ],
    };
  }

  // Parsing is not validity. `buildSchema` runs document-level SDL rules only,
  // so a type that implements an interface without providing its fields builds
  // happily, differs from the contract in no way findBreakingChanges can see,
  // and then fails EVERY query at execution. Reporting that as conformance
  // would be the worst answer this function can give, so it is checked before
  // the comparison rather than after.
  const schemaErrors = validateSchema(providerSchema);
  if (schemaErrors.length > 0) {
    return {
      satisfied: false,
      violations: schemaErrors.map((error) => ({
        code: INVALID_SCHEMA,
        message: `provider schema is not valid: ${error.message}`,
      })),
    };
  }

  const violations: ContractViolation[] = [
    ...findBreakingChanges(contractSchema, providerSchema).map((change) => ({
      code: change.type as ContractViolation["code"],
      message: change.description,
    })),
    ...findRootTypeMismatches(contractSchema, providerSchema),
  ];

  return { satisfied: violations.length === 0, violations };
};

/**
 * Throw unless the provider's SDL satisfies the contract. The thrown message
 * lists every violation, so one run reports the whole gap rather than the
 * first item of it.
 *
 * @note Impure: inherits {@link satisfiesContract}'s filesystem read.
 */
export const assertSatisfiesContract = (
  providerSdl: string,
  options: AssertSatisfiesContractOptions = {},
): void => {
  const result = satisfiesContract(providerSdl, options);
  if (result.satisfied) {
    return;
  }
  const name = options.providerName ?? DEFAULT_PROVIDER_NAME;
  const detail = result.violations
    .map((violation) => `  - [${violation.code}] ${violation.message}`)
    .join("\n");
  throw new Error(
    `${name} does not satisfy the Prism data contract (${result.violations.length} violation(s)):\n${detail}`,
  );
};
