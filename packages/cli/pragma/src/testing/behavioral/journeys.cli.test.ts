/**
 * B9 — the `block list` CLI journey, and the inverse pin on config scoping.
 *
 * BACKING ADAPTATION: the plan lists this as "fixture + spawn"; the PR4 quality
 * bar (R7 — keep the spawn-e2e layer to exactly A1-A4/A7) overrides that, so
 * this drives `block list` through the REAL CLI dispatch path (`executeVerb`,
 * the same function the compiled binary's `dispatch()` calls) IN-PROCESS
 * against the fixture, rather than spawning. It still exercises the true CLI
 * seam (typed params -> dispatch -> render), just without forking a process.
 *
 * WHAT IT ASSERTS NOW. `block list` was the one hand-written read: it narrowed
 * rows by the configured tier's parent chain and by the channel's release
 * levels. It is a declared story now, and the grammar has a term for neither,
 * so that filtering is GONE — deliberately, and the loss is in the CHANGELOG.
 * This file used to be the filtering's proof; it is now the proof that the
 * filtering is ABSENT, which is otherwise a claim a reader can only take on
 * trust. Four tier/channel configurations over the SAME canonical graph must
 * return the SAME rows, and those rows must include both the beta-channel block
 * and the untiered subcomponent that the old scoping hid.
 */

import { afterAll, describe, expect, it } from "vitest";
import { storyModules } from "../../capabilities/distribution.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  CANONICAL_CONFIG,
  CANONICAL_TTL,
} from "../fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
  type FixtureGraphOptions,
} from "../helpers/fixtureGraph.js";
import { JSON_FLAGS, NO_MUTATION } from "../helpers/parity.js";

const listVerb = storyModules
  .get("block")
  ?.verbs.find((v) => verbKey(v.path) === "block list") as VerbSpec;

/** Every block the canonical fixture graph carries, sorted by name. */
const EVERY_BLOCK = [
  "Beta Widget",
  "Button",
  "Button Icon",
  "LXD Panel",
  "Modal",
];

async function blockListNames(fixture: FixtureGraph): Promise<string[]> {
  const out = await executeVerb(
    listVerb,
    {},
    NO_MUTATION,
    bootRuntime(JSON_FLAGS, fixture.cwd),
  );
  const rows = JSON.parse(out.stdout as string).data as { name: string }[];
  return rows.map((r) => r.name).sort();
}

const fixtures: FixtureGraph[] = [];
afterAll(async () => {
  await Promise.all(fixtures.map((f) => f.dispose()));
});

/** Boot a tracked fixture over the canonical graph at one config. */
async function bootAt(
  config: FixtureGraphOptions["config"],
): Promise<FixtureGraph> {
  const fixture = await bootFixtureRuntime({ ttl: CANONICAL_TTL, config });
  fixtures.push(fixture);
  return fixture;
}

describe("block list — the configured tier no longer scopes it (B9)", () => {
  it("lists every block when nothing is configured", async () => {
    // The baseline the cases below are compared against. It already includes
    // Beta Widget (a beta-channel block the `normal` channel used to hide) and
    // Button Icon (an untiered subcomponent the tier join used to drop), so the
    // signed-off widening is visible in the very first assertion.
    const fixture = await bootAt(CANONICAL_CONFIG);
    expect(await blockListNames(fixture)).toEqual(EVERY_BLOCK);
  });

  it("a configured tier changes nothing, at any depth of the chain", async () => {
    // `global` used to exclude the apps/lxd-only block; `apps/lxd` used to
    // admit exactly its own chain. Both now list the whole graph, which is what
    // makes `config set tier` a no-op for every read.
    for (const tier of ["global", "apps/lxd"]) {
      const fixture = await bootAt({ tier, channel: "normal" });
      expect(await blockListNames(fixture), tier).toEqual(EVERY_BLOCK);
    }
  });

  it("a normal channel no longer hides the beta-only block", async () => {
    // The single most visible consequence: `normal` is the default and used to
    // mean "stable releases only". Beta Widget is annotated beta, and it lists.
    const fixture = await bootAt({ channel: "normal" });
    const names = await blockListNames(fixture);
    expect(names).toContain("Beta Widget");
    expect(names).toEqual(EVERY_BLOCK);
  });

  it("the prerelease channel is no longer distinguishable from any other", async () => {
    // It used to be the ONE config where every component listed. Every config
    // is now that config.
    const fixture = await bootAt({ channel: "prerelease" });
    expect(await blockListNames(fixture)).toEqual(EVERY_BLOCK);
  });
});
