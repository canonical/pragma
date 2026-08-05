// =============================================================================
// THE ACCEPTANCE GATE: every lens operation the docsite ships must execute
// against a provider that has never heard of pragma.
//
// 🔴 THIS GATE IS EXPECTED TO FAIL until the docsite's lens operations are
// despecialised onto the contract. That failure is the deliverable, not a
// defect in this package — it is the measurement the whole exercise exists to
// take, and its output names precisely what is still provider-specific.
//
// It is deliberately implemented at FULL STRENGTH. It is not filtered to the
// operations that happen to validate, not marked `it.fails`, not `skipIf`'d,
// and not hidden behind an env var. Every one of those turns a real signal
// into a silent one, and a silent gate is worse than a red one: the red gate
// is a to-do list, the silent one is a lie.
// =============================================================================

import {
  type ExecutionResult,
  type GraphQLError,
  graphql,
  parse,
  validate,
} from "graphql";
import { describe, expect, it } from "vitest";
import { createExampleProvider } from "../../lib/provider/index.js";
import { LENS_OPERATION_VARIABLES } from "../fixtures.js";
import {
  APP_ROOT,
  discoverLensOperationNames,
  readOperationText,
} from "../lensOperations.js";

const provider = createExampleProvider();

/** The lane whose work this gate is waiting on. */
const BLOCKING_LANE =
  "Lane A (apps/react/pragma-docs) — the lens operations are still written " +
  "against the pre-contract schema. Until they are despecialised onto " +
  "@canonical/prism-contract, no contract-conformant provider can serve them.";

interface OperationFailure {
  readonly name: string;
  readonly problems: readonly string[];
}

const describeErrors = (errors: readonly GraphQLError[]): string[] =>
  errors.map((error) => error.message);

/** Validate, then execute, one operation. Returns its problems, if any. */
const checkOperation = async (name: string): Promise<OperationFailure> => {
  const variables = LENS_OPERATION_VARIABLES[name];
  if (variables === undefined) {
    return {
      name,
      problems: [
        "No entry in LENS_OPERATION_VARIABLES. A lens nobody wrote variables " +
          "for is a lens nobody tested — add one to src/testing/fixtures.ts.",
      ],
    };
  }

  const text = readOperationText(name);

  let document: ReturnType<typeof parse>;
  try {
    document = parse(text);
  } catch (error) {
    return {
      name,
      problems: [`Operation text does not parse: ${String(error)}`],
    };
  }

  const validationErrors = validate(provider.schema, document);
  if (validationErrors.length > 0) {
    return { name, problems: describeErrors(validationErrors) };
  }

  const result: ExecutionResult = await graphql({
    schema: provider.schema,
    source: text,
    rootValue: provider.rootValue,
    variableValues: variables,
  });

  if (result.errors !== undefined && result.errors.length > 0) {
    return { name, problems: describeErrors(result.errors) };
  }
  if (result.data === null || result.data === undefined) {
    return {
      name,
      problems: ["Executed without errors but returned no data."],
    };
  }
  // Guard against green nulls: an operation whose every root field came back
  // null "passed" only because the variables pointed at nothing.
  if (Object.values(result.data).every((value) => value === null)) {
    return {
      name,
      problems: [
        "Every root field resolved to null — the operation ran but looked " +
          "nothing up. Check LENS_OPERATION_VARIABLES for this operation.",
      ],
    };
  }
  return { name, problems: [] };
};

const buildReport = (failures: readonly OperationFailure[]): string =>
  [
    `${failures.length} lens operation(s) cannot execute against a ` +
      "contract-conformant provider.",
    "",
    ...failures.flatMap((failure) => [
      `  ${failure.name} — ${failure.problems.length} problem(s)`,
      ...failure.problems.map((problem) => `    - ${problem}`),
      "",
    ]),
    `Provider: @canonical/prism-graph-example (metro network, zero pragma vocabulary)`,
    `Operations harvested at run time from: ${APP_ROOT}`,
    "",
    `WAITING ON: ${BLOCKING_LANE}`,
    "",
    "Do NOT fix this by narrowing the operation set, by marking the test " +
      "`fails`, or by gating it on an env var. The list above IS the " +
      "remaining despecialisation work.",
  ].join("\n");

describe("the lens operations", () => {
  const names = discoverLensOperationNames();

  it("discovers at least one operation (anti-vacuity)", () => {
    expect(names.length).toBeGreaterThan(0);
  });

  it("has variables declared for every discovered operation", () => {
    expect(
      names.filter((name) => LENS_OPERATION_VARIABLES[name] === undefined),
    ).toEqual([]);
  });

  it("all carry an inline operation text (not persisted queries)", () => {
    for (const name of names) {
      expect(readOperationText(name).length).toBeGreaterThan(0);
    }
  });

  it("every one of them executes green against this provider", async () => {
    const results = await Promise.all(names.map(checkOperation));
    const failures = results.filter((result) => result.problems.length > 0);
    if (failures.length > 0) {
      throw new Error(buildReport(failures));
    }
    expect(failures).toEqual([]);
  });
});
