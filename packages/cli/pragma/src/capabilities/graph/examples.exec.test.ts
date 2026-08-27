/**
 * The documented examples, EXECUTED against the shipped pack (PROTECTED).
 *
 * The existing documentation suite validates example GRAMMAR — that a `cmd`
 * parses as a command this CLI declares. Grammar is not truth: the previous
 * `graph inspect ds:button` examples passed that check for as long as they
 * existed while 404ing for every user who copied them, and the `graph query`
 * ASK example passed while quietly answering `false`.
 *
 * So these run the examples as WRITTEN, against the embedded graph, and assert
 * they answer. An example is a promise to a stranger; this is the only check
 * that reads it as one.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { InspectResult } from "../../kernel/runtime/readEntity.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { TEST_FLAGS } from "../../testing/helpers/projectCli.js";
import { graphModule } from "./index.js";

const verb = (name: string): VerbSpec =>
  graphModule.verbs.find((v) => verbKey(v.path) === name) as VerbSpec;

/**
 * The name of a verb's single positional, read from the verb rather than
 * retyped — the point of this file is that documentation and code agree, so it
 * should not itself hardcode a name that could drift.
 */
const positionalOf = (spec: VerbSpec): string =>
  spec.params.find((p) => p.positional)?.name ?? "";

/**
 * The argument an example passes, recovered from the example's own `cmd`.
 *
 * Read from the declaration rather than retyped, so editing an example without
 * editing this file cannot leave the test asserting the old one.
 */
function exampleArg(spec: VerbSpec, index: number): string {
  const cmd = spec.examples?.[index]?.cmd ?? "";
  const quoted = cmd.match(/"([^"]*)"/);
  if (quoted?.[1]) return quoted[1];
  return cmd.trim().split(/\s+/).slice(3).join(" ");
}

// ONE store for the file. Booting per case tripled this suite's cost against
// the shipped pack for no extra coverage, and the whole package already flakes
// under parallel contention — a test that need not add load should not.
let rt: PragmaRuntime;
beforeAll(() => {
  rt = bootRuntime(TEST_FLAGS);
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

describe("documented examples resolve against the shipped graph (PROTECTED)", () => {
  it("runs every `graph inspect` example as written", async () => {
    const inspect = verb("graph inspect");
    expect(inspect.examples?.length).toBeGreaterThan(0);

    for (const [index] of (inspect.examples ?? []).entries()) {
      const uri = exampleArg(inspect, index);
      const result = (await inspect.run(
        { [positionalOf(inspect)]: uri },
        rt,
      )) as InspectResult;
      // The prefixed and absolute forms are two spellings of one subject.
      expect(
        result.uri,
        `example ${index} (${uri}) did not resolve to the documented entity`,
      ).toBe("https://ds.canonical.com/global.component.button");
      expect(result.groups.length).toBeGreaterThan(0);
    }
  });

  it("runs the `graph query` ASK example and gets a true answer", async () => {
    // The old example returned `false` — syntactically fine, semantically a lie
    // about the graph. Asserting the ANSWER is what catches that.
    const query = verb("graph query");
    const ask = (query.examples ?? []).findIndex((e) => e.cmd.includes("ASK"));
    expect(ask, "no ASK example to execute").toBeGreaterThanOrEqual(0);

    const result = (await query.run(
      { [positionalOf(query)]: exampleArg(query, ask) },
      rt,
    )) as { type: string; result?: boolean };

    expect(result.type).toBe("ask");
    expect(result.result, "the documented ASK example answers false").toBe(
      true,
    );
  });

  it("runs the `graph query` SELECT example and gets rows", async () => {
    const query = verb("graph query");
    const result = (await query.run(
      { [positionalOf(query)]: exampleArg(query, 0) },
      rt,
    )) as { type: string; bindings?: unknown[] };

    expect(result.type).toBe("select");
    expect(result.bindings?.length ?? 0).toBeGreaterThan(0);
  });
});
