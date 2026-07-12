/**
 * Tests for the registry-status client. All lookups are @canonical/task
 * effects, so everything here runs against a MOCKED Exec effect via
 * `dryRunWith` — no network, no npm binary.
 */

import {
  collectEffects,
  dryRunWith,
  type Effect,
  filterEffects,
  type Task,
} from "@canonical/task";
import { describe, expect, test } from "vitest";
import {
  classifyNpmView,
  npmViewArgs,
  registryStatusesTask,
  registryStatusTask,
} from "./registry.js";

const PUBLISHED_DOC = JSON.stringify({
  name: "@canonical/utils",
  version: "0.29.0",
  "dist-tags": { latest: "0.29.0" },
  versions: ["0.28.0", "0.29.0"],
  dist: { attestations: { provenance: { predicateType: "https://slsa.dev" } } },
});

const E404_STDOUT = JSON.stringify({
  error: { code: "E404", summary: "Not Found - GET …" },
});

/** dryRunWith mock map with a custom Exec handler. */
function execMock(
  handler: (effect: Effect & { _tag: "Exec" }) => unknown,
): Map<string, (effect: Effect) => unknown> {
  return new Map([
    ["Exec", (effect: Effect) => handler(effect as Effect & { _tag: "Exec" })],
  ]);
}

/**
 * Like dryRunWith, but drives Parallel children with the SAME mocks and
 * journals their effects too (dryRunWith's default Parallel mock dry-runs
 * children with default mocks and discards their effects).
 */
function dryRunDeep<A>(
  task: Task<A>,
  mocks: Map<string, (effect: Effect) => unknown>,
): { value: A; effects: Effect[] } {
  const childEffects: Effect[] = [];
  const withParallel = new Map(mocks);
  withParallel.set("Parallel", (effect: Effect) => {
    if (effect._tag !== "Parallel") throw new Error("unreachable");
    return effect.tasks.map((child) => {
      const result = dryRunDeep(child, mocks);
      childEffects.push(...result.effects);
      return result.value;
    });
  });
  const { value, effects } = dryRunWith(task, withParallel);
  return { value, effects: [...effects, ...childEffects] };
}

describe("classifyNpmView", () => {
  test("parses a published package (versions, latest, provenance)", () => {
    const status = classifyNpmView({
      stdout: PUBLISHED_DOC,
      stderr: "",
      exitCode: 0,
    });
    expect(status).toEqual({
      state: "published",
      versions: ["0.28.0", "0.29.0"],
      latest: "0.29.0",
      hasProvenance: true,
    });
  });

  test("normalises npm's single-version string collapse to an array", () => {
    const status = classifyNpmView({
      stdout: JSON.stringify({ version: "1.0.0", versions: "1.0.0" }),
      stderr: "",
      exitCode: 0,
    });
    expect(status).toMatchObject({ state: "published", versions: ["1.0.0"] });
  });

  test("E404 on stdout (npm --json error object) is definitively absent", () => {
    expect(
      classifyNpmView({ stdout: E404_STDOUT, stderr: "", exitCode: 1 }),
    ).toEqual({ state: "absent" });
  });

  test("E404 on stderr is definitively absent", () => {
    expect(
      classifyNpmView({
        stdout: "",
        stderr: "npm error code E404\nnpm error 404 Not Found",
        exitCode: 1,
      }),
    ).toEqual({ state: "absent" });
  });

  test("rate limit / 5xx is unknown, never absent or published (fail closed)", () => {
    const status = classifyNpmView({
      stdout: "",
      stderr: "npm error code E429\nnpm error 429 Too Many Requests",
      exitCode: 1,
    });
    expect(status.state).toBe("unknown");
  });

  test("unparseable success output is unknown (fail closed)", () => {
    const status = classifyNpmView({
      stdout: "not json at all",
      stderr: "",
      exitCode: 0,
    });
    expect(status.state).toBe("unknown");
  });
});

describe("registryStatusTask", () => {
  test("issues an `npm view <name> --json` Exec effect", () => {
    const { effects } = dryRunWith(
      registryStatusTask("@canonical/utils"),
      execMock(() => ({ stdout: PUBLISHED_DOC, stderr: "", exitCode: 0 })),
    );
    const execs = filterEffects(effects, "Exec") as Array<
      Effect & { _tag: "Exec" }
    >;
    expect(execs).toHaveLength(1);
    expect(execs[0].command).toBe("npm");
    expect(execs[0].args).toEqual(npmViewArgs("@canonical/utils"));
  });

  test("retries transient failures, then fails closed to unknown", () => {
    let calls = 0;
    const { value, effects } = dryRunWith(
      registryStatusTask("@canonical/flaky", { attempts: 3 }),
      execMock(() => {
        calls += 1;
        return {
          stdout: "",
          stderr: "npm error 503 Service Unavailable",
          exitCode: 1,
        };
      }),
    );
    expect(calls).toBe(3);
    expect(filterEffects(effects, "Exec")).toHaveLength(3);
    expect((value as { state: string }).state).toBe("unknown");
  });

  test("recovers when a retry succeeds", () => {
    let calls = 0;
    const { value } = dryRunWith(
      registryStatusTask("@canonical/flaky", { attempts: 3 }),
      execMock(() => {
        calls += 1;
        if (calls < 3) {
          return { stdout: "", stderr: "npm error E500", exitCode: 1 };
        }
        return { stdout: PUBLISHED_DOC, stderr: "", exitCode: 0 };
      }),
    );
    expect(calls).toBe(3);
    expect((value as { state: string }).state).toBe("published");
  });

  test("does NOT retry a definitive 404", () => {
    let calls = 0;
    const { value } = dryRunWith(
      registryStatusTask("@canonical/i18n-core", { attempts: 3 }),
      execMock(() => {
        calls += 1;
        return { stdout: E404_STDOUT, stderr: "", exitCode: 1 };
      }),
    );
    expect(calls).toBe(1);
    expect(value).toEqual({ state: "absent" });
  });
});

describe("registryStatusesTask", () => {
  test("dedupes names: one lookup per unique package (registry cache)", () => {
    const names = ["@c/a", "@c/b", "@c/a", "@c/b", "@c/a"];
    const { value, effects } = dryRunDeep(
      registryStatusesTask(names),
      execMock(() => ({ stdout: E404_STDOUT, stderr: "", exitCode: 1 })),
    );
    expect(filterEffects(effects, "Exec")).toHaveLength(2);
    const statuses = value as Map<string, { state: string }>;
    expect(statuses.size).toBe(2);
    expect(statuses.get("@c/a")).toEqual({ state: "absent" });
    expect(statuses.get("@c/b")).toEqual({ state: "absent" });
  });

  test("runs lookups in a Parallel batch (not serially)", () => {
    const effects = collectEffects(
      registryStatusesTask(["@c/a", "@c/b", "@c/c"]),
    );
    expect(filterEffects(effects, "Parallel").length).toBeGreaterThanOrEqual(1);
  });

  test("the task tree is deterministic: same input set, same journal", () => {
    const journal = (names: string[]) =>
      dryRunDeep(
        registryStatusesTask(names),
        execMock(() => ({ stdout: E404_STDOUT, stderr: "", exitCode: 1 })),
      ).effects.map((effect) =>
        effect._tag === "Exec" ? effect.args.join(" ") : effect._tag,
      );
    expect(journal(["@c/b", "@c/a", "@c/b"])).toEqual(
      journal(["@c/a", "@c/b", "@c/a"]),
    );
  });
});
