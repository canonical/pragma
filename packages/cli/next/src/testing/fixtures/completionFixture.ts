/**
 * A synthetic capability module exercising every completion path (D8 —
 * test-only, never listed in `src/capabilities/index.ts`): an entity
 * positional, an enum positional, enum/files/boolean/none flags, a variadic
 * `string[]` positional, a repeatable `string[]` flag, a mutating verb, a
 * self-verb-only noun, a mixed self-verb + sub-verb noun, and a hidden verb.
 *
 * Snapshots and the protected parse/resolve tests pin against THIS module,
 * not the live capabilities, so live noun renames never churn them.
 */

import { succeed } from "@canonical/task";
import type {
  CapabilityModule,
  Formatters,
  VerbSpec,
} from "../../kernel/spec/types.js";

const passthrough: Formatters<unknown> = {
  plain: (d) => String(d),
  llm: (d) => String(d),
  json: (d) => JSON.stringify(d),
};

const read = {
  needsStore: false,
  mutates: false,
  mcp: { expose: false, reason: "completion test fixture" },
} as const;

/** `block get <ref>` — entity positional; enum, files, boolean, none flags. */
const blockGet: VerbSpec = {
  path: ["block", "get"],
  summary: "Get a block.",
  params: [
    {
      kind: "string",
      name: "ref",
      doc: "The block to get.",
      positional: true,
      required: true,
      complete: { kind: "entity", type: "ds:Block" },
    },
    {
      kind: "enum",
      name: "view",
      doc: "Which projection to show.",
      values: ["anatomy", "full", "summary"],
    },
    {
      kind: "string",
      name: "out",
      doc: "Write the result to a file.",
      complete: { kind: "files" },
    },
    { kind: "boolean", name: "withMeta", doc: "Include metadata." },
    { kind: "string", name: "note", doc: "Free-text note (not completable)." },
  ],
  output: { formatters: passthrough },
  capability: read,
  run: async () => "ok",
};

/** `block list [tier]` — enum positional (declared) + repeatable tags flag. */
const blockList: VerbSpec = {
  path: ["block", "list"],
  summary: "List blocks.",
  params: [
    {
      kind: "enum",
      name: "tier",
      doc: "Restrict to a tier.",
      values: ["community", "core"],
      positional: true,
      complete: { kind: "values" },
    },
    { kind: "string[]", name: "tags", doc: "Filter by tags." },
  ],
  output: { formatters: passthrough },
  capability: read,
  run: async () => "ok",
};

/** `block diff <refs...>` — variadic entity positional. */
const blockDiff: VerbSpec = {
  path: ["block", "diff"],
  summary: "Diff blocks.",
  params: [
    {
      kind: "string[]",
      name: "refs",
      doc: "The blocks to diff.",
      positional: true,
      required: true,
      complete: { kind: "entity", type: "ds:Block" },
    },
  ],
  output: { formatters: passthrough },
  capability: read,
  run: async () => "ok",
};

/** `block remove <ref>` — mutates (mutation flags), completion opted out. */
const blockRemove: VerbSpec = {
  path: ["block", "remove"],
  summary: "Remove a block.",
  params: [
    {
      kind: "string",
      name: "ref",
      doc: "The block to remove.",
      positional: true,
      required: true,
      complete: { kind: "none" },
    },
  ],
  output: { formatters: passthrough },
  capability: {
    needsStore: true,
    mutates: true,
    destructive: true,
    mcp: { expose: false, reason: "completion test fixture" },
  },
  run: () => succeed({ removed: true }),
};

/** `block probe` — hidden; must never appear in completions. */
const blockProbe: VerbSpec = {
  path: ["block", "probe"],
  summary: "Internal probe.",
  hidden: true,
  params: [],
  output: { formatters: passthrough },
  capability: read,
  run: async () => "ok",
};

/** `standard [query]` — self-verb on a noun that ALSO has a sub-verb. */
const standardSelf: VerbSpec = {
  path: ["standard"],
  summary: "Look up a standard.",
  params: [
    {
      kind: "string",
      name: "query",
      doc: "The standard to look up.",
      positional: true,
      complete: { kind: "entity", type: "ds:Standard" },
    },
  ],
  output: { formatters: passthrough },
  capability: read,
  run: async () => "ok",
};

/** `standard list` — the sub-verb beside the self-verb. */
const standardList: VerbSpec = {
  path: ["standard", "list"],
  summary: "List standards.",
  params: [],
  output: { formatters: passthrough },
  capability: read,
  run: async () => "ok",
};

/** `status [scope]` — a self-verb-only noun with an enum positional. */
const statusSelf: VerbSpec = {
  path: ["status"],
  summary: "Show status.",
  params: [
    {
      kind: "enum",
      name: "scope",
      doc: "Which scope to report.",
      values: ["all", "dirty"],
      positional: true,
    },
  ],
  output: { formatters: passthrough },
  capability: read,
  run: async () => "ok",
};

/** The synthetic completion module (D8 — test-only). */
export const completionFixture: CapabilityModule = {
  name: "completion-fixture",
  verbs: [
    blockGet,
    blockList,
    blockDiff,
    blockRemove,
    blockProbe,
    standardSelf,
    standardList,
    statusSelf,
  ],
};

/**
 * A compact per-type name table backing {@link fixtureEntityReader} — the
 * hand-built stand-in the resolver's RANKING tests (resolve/complete) drive,
 * NOT PR2's on-disk `PackIndex` (that is a flat `entities[{name,type}]` array).
 * The real PR2-shape ⟷ reader agreement is proven live, against a freshly
 * built index, by `kernel/runtime/graphpack/completionSeam.test.ts`.
 */
export const fixtureIndex = {
  version: 1,
  entities: {
    "ds:Block": {
      names: [
        "button",
        "button-group",
        "card",
        "chip",
        "navigation",
        "tooltip",
      ],
    },
    "ds:Standard": { names: ["accessibility", "naming"] },
  },
} as const;

/** An entity reader serving {@link fixtureIndex} (the PR-C stand-in for PR2). */
export const fixtureEntityReader = {
  names: (type: string): readonly string[] =>
    (
      fixtureIndex.entities as Record<
        string,
        { names: readonly string[] } | undefined
      >
    )[type]?.names ?? [],
};
