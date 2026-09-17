/**
 * The rule every tool is held to.
 *
 * 1. Every registered verb states the question it answers (`useWhen`, as a
 *    bare clause), and declares an example call when it has a required param —
 *    a verb callable with no arguments has nothing an example would teach.
 * 2. Every call anywhere names a registered verb and carries params that
 *    validate against that verb's OWN MCP input schema, so none can rot.
 *
 * The verbs, their examples and the stories' empty-state recoveries are DERIVED
 * from the registry and `declaredStories`. The generic dead ends are constants
 * their renderers export, and are imported below by name: a new one has to be
 * added here. Error recoveries are built where they are thrown and cannot be
 * listed at all; `testing/setupCallChecking.ts` holds each to the same
 * validator as it is constructed, and the last case proves that is live.
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_EMPTY_RECOVERY } from "../kernel/packs/renderPack.js";
import { renderCall } from "../kernel/spec/call.js";
import { exampleCall } from "../kernel/spec/guidance.js";
import type { Call, VerbSpec } from "../kernel/spec/index.js";
import { findCallProblem } from "../testing/helpers/callSchema.js";
import { declaredStories } from "./distribution.js";
import { EMPTY_QUERY_CALLS } from "./graph/query.render.js";
import { capabilities } from "./index.js";
import {
  BUILD_STORE_CALL,
  LINK_SKILLS_CALL,
  VERBOSE_BUILD_CALL,
} from "./shared/calls.js";

const verbs: readonly VerbSpec[] = capabilities
  .flatMap((module) => module.verbs)
  .filter((verb) => !verb.hidden);
const byPath = new Map(verbs.map((verb) => [verb.path.join(" "), verb]));
const findProblem = (call: Call): string | undefined =>
  findCallProblem(call, byPath.get(call.verb));
const label = (verb: VerbSpec): string => verb.path.join(" ");

const storyEmpties = [...declaredStories.values()].flatMap((story) =>
  [story.list, ...(story.verbs ?? [])].flatMap((half) =>
    [half?.emptyRecovery, ...(half?.emptyRecovery?.also ?? [])].flatMap(
      (recovery) => (recovery?.call ? [recovery.call] : []),
    ),
  ),
);

describe("every tool states the question it answers", () => {
  it("every registered verb declares useWhen, as a clause the prose can lead", () => {
    expect(verbs.filter((verb) => !verb.useWhen).map(label)).toEqual([]);
    // The lead ("Use …") is added where prose needs it; stored, it would be
    // said twice in the catalogue's `use_when` field.
    expect(
      verbs.filter((verb) => /^use\b|\.$/i.test(verb.useWhen ?? "")).map(label),
    ).toEqual([]);
  });

  it("every verb with a required param declares an example, and none is empty", () => {
    const needs = verbs.filter((verb) => verb.params.some((p) => p.required));
    expect(needs.filter((verb) => !verb.example).map(label)).toEqual([]);
    expect(
      verbs
        .filter(
          (verb) => verb.example && Object.keys(verb.example).length === 0,
        )
        .map(label),
    ).toEqual([]);
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
    ["build the store", BUILD_STORE_CALL],
    ["build the store, verbosely", VERBOSE_BUILD_CALL],
    ["link skills", LINK_SKILLS_CALL],
  ];

  it("holds for every example, story empty and generic dead end", () => {
    const offenders = calls.flatMap(([name, call]) => {
      const problem = findProblem(call);
      return problem ? [`${name}: ${problem}`] : [];
    });
    expect(offenders).toEqual([]);
    // Guard against a vacuous pass: the stories do declare empties.
    expect(storyEmpties.length).toBeGreaterThan(0);
  });

  it("the validator is the verb's tool schema: it knows confirm and detail, and rejects the rest", () => {
    expect(
      findProblem({ verb: "sources update", params: { confirm: true } }),
    ).toBeUndefined();
    expect(
      findProblem({
        verb: "block lookup",
        params: { name: ["Button"], detail: "summary" },
      }),
    ).toBeUndefined();
    expect(
      findProblem({ verb: "block list", params: { confirm: true } }),
    ).toMatch(/confirm/i);
    expect(
      findProblem({ verb: "standard sample", params: { count: 2 } }),
    ).toMatch(/count/);
  });

  it("checks a recovery as it is built, anywhere in this suite", () => {
    expect(() => renderCall({ verb: "no such verb" }, "cli")).toThrow(
      /names no registered verb/,
    );
    expect(() =>
      renderCall({ verb: "config unset", params: { field: "tier" } }, "mcp"),
    ).toThrow(/Unsound call config unset/);
    expect(() => renderCall({ verb: "graph inspect" }, "cli")).toThrow(/uri/);
  });
});
