/**
 * The response-size budget for a list-shaped answer, measured over the SHIPPED
 * pack (PROTECTED).
 *
 * No list had a size budget before this. The five enforced performance
 * constants are all latency, none of them runs a story's list query, and the
 * only size ceiling in the package covered the MCP resource listing rather than
 * a verb — so a story could grow its payload without limit and nothing turned
 * red. The largest answer the distribution ships today is 78 KB from one call,
 * and an agent pays for it twice: once in transfer, once in the context window
 * it can no longer spend on the task.
 *
 * WHY A BUDGET AND NOT JUST PAGINATION. `--limit` gives a caller a way to ask
 * for less. A budget is what fails the build when a story forgets that its
 * DEFAULT answer is the one every speculative call gets. The two are
 * complementary: the default page (500 rows) bounds the row count, and this
 * bounds the bytes those rows turn into — because a row's width is a story's
 * choice and no row count implies a payload size.
 *
 * WHERE IT IS ENFORCED. Where the payload is BUILT — the `json` formatter, the
 * one seam both machine surfaces serialise through (`--format json` parses it
 * into the envelope; the MCP tool result parses it into `toolSuccess`). Not in
 * the timed perf pass: that pass is deliberately not run by CI (owner ruling
 * 2026-08-30), and a budget nothing runs is not a gate. This is the same choice
 * the resource listing's ceiling made, for the same reason.
 *
 * WHAT IT DOES NOT COVER. Latency. Declaring stories is measurably free — when
 * five read stories moved into the distribution's configuration and grew it
 * from 55 to 513 lines, the fast-path deltas straddled zero — and no latency
 * constant moves for this either.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileStoryModule } from "../kernel/packs/compile.js";
import { DEFAULT_LIST_LIMIT, MAX_LIST_WINDOW } from "../kernel/packs/paging.js";
import {
  distributionSource,
  type PackList,
  type PackPage,
} from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { bootRuntime } from "../kernel/runtime/boot.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { TEST_FLAGS } from "../testing/helpers/projectCli.js";
import { declaredStories } from "./distribution.js";

/**
 * The ceiling on ONE list-shaped answer, in bytes of the serialised payload.
 *
 * **Derived from measurement, 2026-09-10**, over the pack the distribution
 * actually ships: the largest answer is `standard list` at 147 rows and 78,129
 * bytes, whose rows are fat rather than many, and the most ROWS is `block list`
 * at 252 for 32,956 bytes. 1.6 × 78,129 = 125,006, rounded to 125,000 — the
 * same shape of derivation the resource listing used (60,000 → 100,000 at a
 * measured 65,119, i.e. 1.54×), and headroom enough that ordinary upstream
 * growth in the code-standards pack does not turn this red on a pack bump.
 * Every figure and the full table are in BUDGETS.md.
 *
 * **When this is next reached, the fix is not a bigger number.** A ceiling
 * raised on demand is a formality. The fix is either a narrower default page
 * for the story that blew it — which is the kernel decision K-1 deliberately
 * left un-taken, there being no story that needs it yet — or narrower columns,
 * which trades an honest surface for an arithmetic one and is the worse of the
 * two. Whichever is chosen, it is a decision with a reason, which is what a
 * budget exists to force.
 */
const LIST_PAYLOAD_BUDGET_BYTES = 125_000;

const SOURCE = distributionSource("pragma.conf.ts");

/** One list-shaped body of a declared story, with the verb that runs it. */
interface Body {
  readonly label: string;
  readonly verb: VerbSpec;
}

/**
 * Every list-shaped body the distribution declares, DERIVED from the config —
 * a story declared tomorrow is held to this budget by the author who declares
 * it, without their help and without an entry in a list here.
 */
const BODIES: readonly Body[] = [...declaredStories].flatMap(
  ([noun, story]) => {
    const module = compileStoryModule(story, SOURCE, {});
    const find = (verb: string): Body => {
      const found = module.verbs.find(
        (v) => verbKey(v.path) === `${noun} ${verb}`,
      );
      if (!found) throw new Error(`no compiled "${noun} ${verb}" verb`);
      return { label: `${noun} ${verb}`, verb: found };
    };
    const bodies: Body[] = [];
    if ((story.list as PackList | undefined) !== undefined) {
      bodies.push(find("list"));
    }
    for (const verb of story.verbs ?? []) bodies.push(find(verb.verb));
    return bodies;
  },
);

let rt: PragmaRuntime;
beforeAll(async () => {
  rt = bootRuntime(TEST_FLAGS);
  await rt.store.get();
}, 60_000);

afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

/**
 * The payload one call transmits, in bytes.
 *
 * The `json` formatter's own output is indented — it is read by humans through
 * `--format json | jq` as often as by machines — but neither machine surface
 * sends those spaces: both parse it and re-serialise into their envelope. So
 * the budget measures what crosses the wire, not what the formatter's string
 * happens to weigh.
 */
async function payloadBytes(
  body: Body,
  params: Record<string, unknown>,
): Promise<{ rows: number; bytes: number }> {
  const page = (await body.verb.run(params, rt)) as { rows: unknown[] };
  const built = body.verb.output.formatters.json(page as never);
  return {
    rows: page.rows.length,
    bytes: Buffer.byteLength(JSON.stringify(JSON.parse(built))),
  };
}

describe("list response budget, shipped pack (PROTECTED)", () => {
  it("derives every list-shaped body from the config", () => {
    // A guard, not a no-op: an empty derivation would make the sweep below
    // vacuously green, which is the failure mode a budget can least afford.
    expect(BODIES.map((body) => body.label)).toContain("standard list");
    expect(BODIES.length).toBeGreaterThanOrEqual(9);
  });

  it.each(BODIES.map((body) => [body.label, body] as const))(
    "%s: the default answer is inside the budget",
    async (_label, body) => {
      const { rows, bytes } = await payloadBytes(body, {});
      expect(bytes).toBeLessThanOrEqual(LIST_PAYLOAD_BUDGET_BYTES);
      // The row half of the budget: the default page is the ceiling, and a
      // body answering more of them would mean the page was not applied.
      expect(rows).toBeLessThanOrEqual(DEFAULT_LIST_LIMIT);
    },
    60_000,
  );

  it.each(BODIES.map((body) => [body.label, body] as const))(
    "%s: a population past the budget is PAGED, and each page is inside it",
    async (_label, body) => {
      // This case used to assert that the whole population also fitted one
      // answer, and recorded that the two measurements were the same number
      // because every story fitted one default page. Its own note said the day
      // a story outgrew the page they would diverge and that this assertion
      // would be what said so. They have diverged: the token-graph stories
      // brought populations of 745, 1,156, 1,237 and 1,746 rows, and asking one
      // of them for everything at once now measures 158 KB to 273 KB.
      //
      // So the claim moves to the one that survives, and it is the stronger of
      // the two for exactly the bodies that broke the old one. The budget
      // bounds an ANSWER, never a population — a population outgrowing it is
      // what pagination is for, and the promise is that every page a caller can
      // reach is inside the budget and that the pages together are the whole
      // answer. A story still inside the budget is held to the old assertion
      // unchanged, so nothing is given up where nothing had to be.
      const whole = await payloadBytes(body, { limit: MAX_LIST_WINDOW });
      if (whole.bytes <= LIST_PAYLOAD_BUDGET_BYTES) {
        expect(whole.bytes).toBeLessThanOrEqual(LIST_PAYLOAD_BUDGET_BYTES);
        return;
      }
      // Past the budget: every page inside it, and the pages exhaust the
      // population rather than stopping short of it.
      let after: string | undefined;
      let seen = 0;
      let pages = 0;
      do {
        const page = (await body.verb.run(
          after === undefined ? {} : { after },
          rt,
        )) as PackPage;
        const bytes = Buffer.byteLength(
          JSON.stringify(
            JSON.parse(body.verb.output.formatters.json(page as never)),
          ),
        );
        expect(
          bytes,
          `page ${pages + 1} of ${body.label} is outside the budget`,
        ).toBeLessThanOrEqual(LIST_PAYLOAD_BUDGET_BYTES);
        expect(page.rows.length).toBeLessThanOrEqual(DEFAULT_LIST_LIMIT);
        seen += page.rows.length;
        after = page.nextAfter;
        pages += 1;
        // A guard against a cursor that never terminates: the kernel's own row
        // ceiling bounds how far a caller may walk, so a walk needing more
        // pages than that is a defect in the cursor rather than a big corpus.
        expect(pages).toBeLessThan(MAX_LIST_WINDOW / DEFAULT_LIST_LIMIT);
      } while (after !== undefined);
      expect(pages).toBeGreaterThan(1);
      expect(seen).toBe(whole.rows);
    },
    120_000,
  );

  it("the budget has headroom over the largest answer, and is not slack", async () => {
    // A ceiling that no longer bounds anything catches nothing, and one sitting
    // on the measurement flakes. Both halves are asserted so a future edit to
    // the constant has to face them.
    //
    // The effective headroom is the 0.8 factor, not the 1.6 the ceiling was
    // derived from: the largest answer may grow by 28 per cent before this
    // turns red, and BUDGETS.md says 28 per cent for that reason. The two
    // numbers answer different questions — 1.6 is how the ceiling was chosen,
    // 0.8 is what the suite enforces — and the tighter one is the gate.
    const measured = await Promise.all(
      BODIES.map((body) => payloadBytes(body, {})),
    );
    const largest = Math.max(...measured.map((entry) => entry.bytes));
    expect(largest).toBeGreaterThan(LIST_PAYLOAD_BUDGET_BYTES / 4);
    expect(largest).toBeLessThan(LIST_PAYLOAD_BUDGET_BYTES * 0.8);
  }, 60_000);

  it("the kernel's row ceiling cannot ask for an answer above the budget", () => {
    // The arithmetic that makes `MAX_LIST_WINDOW` a derived number rather than
    // a taste: the narrowest row a story can serialise is `{}` and its
    // separating comma, three bytes, so a limit above BUDGET/3 could not
    // produce a legal answer whatever the story's columns are — and a limit
    // that cannot produce a legal answer is not a legal limit. Asserted here
    // because the ceiling lives in `paging.ts`, which cannot import a test.
    expect(MAX_LIST_WINDOW * 3).toBeLessThanOrEqual(LIST_PAYLOAD_BUDGET_BYTES);
    // And it is not so tight that it refuses a caller who wants everything.
    expect(MAX_LIST_WINDOW).toBeGreaterThan(DEFAULT_LIST_LIMIT);
  });
});
