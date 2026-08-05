// =============================================================================
// THE ACCEPTANCE GATE: every CORE lens operation the docsite ships must
// execute against a provider that has never heard of pragma.
//
// WHAT THE SCANNED DIRECTORY MEANS.
// `apps/react/pragma-docs/src/domains/lenses/**` is the docsite's CORE LENS
// SET, and this gate's subject is exactly that directory — never a
// hand-maintained allowlist. Membership of the core set IS the obligation to
// be provider-neutral: put a lens there and it must execute here, the day it
// lands. There is no third state.
//
// The docsite also has `src/addons/**`, which this gate does not scan. That is
// deliberate and it is narrow. An add-on is a view that is openly
// pragma-specific — it reads pragma's own ontology and makes no claim to run
// anywhere else — and it is expected to become a plugin once the docsite has a
// plugin mechanism. It is NOT a core lens, so it owes this gate nothing. It
// remains fully built, routed and tested in the app.
//
// ONE operation lives there today: `JourneysExplorerQuery`, moved out of the
// lens set by an OWNER DECISION, recorded verbatim: "keep it on side for now,
// it will be an add-on plugin not a core view." It was reclassified because it
// is not a core view; it was not reclassified because it was red.
//
// 🔴 `src/addons/**` IS NOT AN ESCAPE HATCH. A red operation does not get to
// move there. If a lens is meant to be part of the core set and cannot execute
// against this provider, the answer is to despecialise the operation — the
// failure report below is the to-do list. Relocating a core operation out of
// the scanned directory is "narrowing the operation set" under another name,
// and it is exactly the failure mode this gate exists to catch. Only an owner
// reclassifying a view as an add-on can move one, and the move must land with
// that reasoning written down (see `src/addons/journeys/index.ts`, which
// states what the contract cannot express and why).
//
// Journeys is on side for a reason no rewrite can fix: the contract exposes an
// entity's class and that class's SCHEMA, but `EntityMeta.field(name:)`
// returns CARDINALITY METADATA rather than a value, and no contract field
// returns the value of an arbitrary property on an arbitrary entity. Generic
// instance-level relation traversal is all that lens is.
//
// This gate is otherwise implemented at FULL STRENGTH. It is not filtered to
// the operations that happen to validate, not marked `it.fails`, not
// `skipIf`'d, and not hidden behind an env var. Every one of those turns a
// real signal into a silent one, and a silent gate is worse than a red one:
// the red gate is a to-do list, the silent one is a lie. It also asserts it
// discovered a non-zero number of operations, so it cannot pass vacuously if
// the core lens set is emptied or moved.
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

/**
 * The lane that owns any failure printed below.
 *
 * As of the journeys reclassification every operation in the core lens set
 * executes green here, so this string is unreachable — it renders again the
 * moment a core lens regresses or a new one lands unfinished.
 */
const BLOCKING_LANE =
  "Lane A (apps/react/pragma-docs) — a core lens operation is written against " +
  "something other than @canonical/prism-contract. Until it is despecialised " +
  "onto the contract, no contract-conformant provider can serve it.";

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
      "`fails`, by gating it on an env var, or by relocating the operation " +
      "into src/addons — that last one is narrowing the set under another " +
      "name, and only an owner reclassifying a view as a pragma-specific " +
      "add-on may move it. The list above IS the remaining despecialisation " +
      "work.",
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
