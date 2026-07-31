// =============================================================================
// The contract check: does a provider's schema SUBSUME the contract?
//
// This is deliberately NOT an AST or text comparison. A real provider's SDL is
// a strict superset of the contract (it adds every ontology-derived type), so
// it always differs textually and always will. The question that actually
// matters is semantic: could every operation that is legal against the
// contract also run against the provider?
//
// graphql-js already answers exactly that. findBreakingChanges(old, new)
// reports every way in which `new` fails to remain compatible with `old`, so
// with the contract as `old` and the provider as `new`:
//
//     provider satisfies contract  <=>  findBreakingChanges(...).length === 0
//
// findDangerousChanges is deliberately NOT consulted: adding an optional
// argument or a new enum value is dangerous for a CLIENT but perfectly legal
// for a superset PROVIDER, and every real provider does both.
// =============================================================================

import { buildSchema, findBreakingChanges } from "graphql";
import { readContractSdl } from "./contractSdl.js";
import type {
  ContractResult,
  ContractViolation,
  SatisfiesContractOptions,
} from "./types.js";

/**
 * Violation code used when the provider's SDL cannot be parsed. A provider
 * whose schema does not parse has failed the contract; that is a result to
 * return, not a crash to propagate.
 */
export const INVALID_SDL = "INVALID_SDL";

/** Default name used in {@link assertSatisfiesContract} error text. */
const DEFAULT_PROVIDER_NAME = "provider";

const describeError = (error: unknown): string => {
  /* v8 ignore else -- unreachable: the only call site catches buildSchema, which throws GraphQLError (an Error subclass) exclusively; the String(error) arm stays because `catch` is typed `unknown` and dropping it would mean asserting a type the language does not guarantee */
  if (error instanceof Error) {
    return error.message;
  } else {
    return String(error);
  }
};

/**
 * Check a provider's SDL against the contract.
 *
 * Takes SDL as a STRING, never a GraphQLSchema. Two graphql versions coexist
 * in this repo and a schema object built by one must never be handed to the
 * other; text is the only safe currency across that boundary.
 *
 * A malformed CONTRACT throws (the contract is ours: that is a programmer
 * error). A malformed PROVIDER SDL is caught and returned as a single
 * violation coded {@link INVALID_SDL}.
 */
export const satisfiesContract = (
  providerSdl: string,
  options: SatisfiesContractOptions = {},
): ContractResult => {
  // Outside the try: a broken contract must surface as a thrown error.
  const contractSchema = buildSchema(options.contractSdl ?? readContractSdl());

  let providerSchema: ReturnType<typeof buildSchema>;
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

  const violations: ContractViolation[] = findBreakingChanges(
    contractSchema,
    providerSchema,
  ).map((change) => ({ code: change.type, message: change.description }));

  return { satisfied: violations.length === 0, violations };
};

/**
 * Throw unless the provider's SDL satisfies the contract. The thrown message
 * lists every violation, so one run reports the whole gap rather than the
 * first item of it.
 */
export const assertSatisfiesContract = (
  providerSdl: string,
  options: SatisfiesContractOptions = {},
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
