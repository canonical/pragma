/**
 * The rule every tool is held to, derived from the registry — nothing listed
 * by hand:
 *
 * 1. every registered verb states the question it answers (`useWhen`) and
 *    declares one example call;
 * 2. every call anywhere — an example, a pack's empty-state recovery, a generic
 *    dead end — names a registered verb and carries params that validate
 *    against that verb's OWN MCP input schema, so none can rot.
 *
 * Error recoveries are built where they are thrown and cannot be listed here;
 * `testing/setupCallChecking.ts` checks each as it is constructed, and the last
 * case below proves that check is live in this suite.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DEFAULT_EMPTY_RECOVERY } from "../kernel/packs/renderPack.js";
import { buildToolShape } from "../kernel/project/mcp/registerVerb.js";
import { type Call, renderCall } from "../kernel/spec/call.js";
import { exampleCall } from "../kernel/spec/guidance.js";
import type { VerbSpec } from "../kernel/spec/index.js";
import { declaredStories } from "./distribution.js";
import { EMPTY_QUERY_CALLS } from "./graph/query.render.js";
import { capabilities } from "./index.js";
import { STATUS_NEXT_CALL } from "./sources/status.render.js";

const verbs: readonly VerbSpec[] = capabilities
  .flatMap((module) => module.verbs)
  .filter((verb) => !verb.hidden);
const byPath = new Map(verbs.map((verb) => [verb.path.join(" "), verb]));

/** What is wrong with a call, or nothing: unknown verb, or params its schema rejects. */
function findProblem(call: Call): string | undefined {
  const verb = byPath.get(call.verb);
  if (!verb) return `names no registered verb`;
  const parsed = z
    .object(buildToolShape(verb))
    .strict()
    .safeParse(call.params ?? {});
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}

const storyEmpties = [...declaredStories.values()].flatMap((story) =>
  [story.list, ...(story.verbs ?? [])].flatMap((half) =>
    half?.emptyRecovery?.call ? [half.emptyRecovery.call] : [],
  ),
);

describe("every tool states the question it answers", () => {
  it("every registered verb declares useWhen and an example", () => {
    const missing = verbs
      .filter((verb) => !verb.useWhen || verb.example === undefined)
      .map((verb) => verb.path.join(" "));
    expect(missing).toEqual([]);
  });
});

describe("every call names a registered verb and params its schema accepts", () => {
  const calls: readonly (readonly [string, Call])[] = [
    ...verbs.flatMap((verb) => {
      const call = exampleCall(verb);
      return call ? [[`example of ${call.verb}`, call] as const] : [];
    }),
    ...storyEmpties.map(
      (call) => [`story empty → ${call.verb}`, call] as const,
    ),
    ["default empty", DEFAULT_EMPTY_RECOVERY.call as Call],
    ["empty query → inspect", EMPTY_QUERY_CALLS.inspect],
    ["empty query → namespaces", EMPTY_QUERY_CALLS.namespaces],
    ["sources status", STATUS_NEXT_CALL],
  ];

  it("holds for every example, story empty and generic dead end", () => {
    const offenders = calls.flatMap(([label, call]) => {
      const problem = findProblem(call);
      return problem ? [`${label}: ${problem}`] : [];
    });
    expect(offenders).toEqual([]);
    // Guard against a vacuous pass: the stories do declare empties.
    expect(storyEmpties.length).toBeGreaterThan(0);
  });

  it("checks a recovery as it is built, anywhere in this suite", () => {
    expect(() => renderCall({ verb: "no such verb" }, "cli")).toThrow(
      /not a declared verb/,
    );
    expect(() =>
      renderCall({ verb: "config unset", params: { field: "tier" } }, "mcp"),
    ).toThrow(/declares no param field/);
    expect(() => renderCall({ verb: "graph inspect" }, "cli")).toThrow(
      /requires uri/,
    );
  });
});
