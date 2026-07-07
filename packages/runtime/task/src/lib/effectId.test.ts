import { describe, expect, it } from "vitest";
import {
  computeEffectId,
  extractEffectContent,
  formatEffectId,
} from "./effectId.js";
import { pure } from "./task.js";
import type { Effect } from "./types.js";

// One representative effect per tag, several carrying closures (transform,
// validate, undo) that must NOT appear in the extracted content.
const cases: Array<[string, Effect, unknown]> = [
  ["ReadFile", { _tag: "ReadFile", path: "/a" }, { path: "/a" }],
  [
    "WriteFile",
    { _tag: "WriteFile", path: "/a", content: "x", undo: pure(undefined) },
    { path: "/a", content: "x" },
  ],
  [
    "AppendFile",
    {
      _tag: "AppendFile",
      path: "/a",
      content: "x",
      createIfMissing: true,
      undo: pure(undefined),
    },
    { path: "/a", content: "x", createIfMissing: true },
  ],
  [
    "TransformFile",
    {
      _tag: "TransformFile",
      path: "/a",
      transform: (s: string) => s,
      undo: pure(undefined),
    },
    { path: "/a" },
  ],
  [
    "CopyFile",
    { _tag: "CopyFile", source: "/a", dest: "/b", undo: pure(undefined) },
    { source: "/a", dest: "/b" },
  ],
  [
    "CopyDirectory",
    { _tag: "CopyDirectory", source: "/a", dest: "/b", undo: pure(undefined) },
    { source: "/a", dest: "/b" },
  ],
  [
    "DeleteFile",
    { _tag: "DeleteFile", path: "/a", undo: pure(undefined) },
    { path: "/a" },
  ],
  [
    "DeleteDirectory",
    { _tag: "DeleteDirectory", path: "/a", undo: pure(undefined) },
    { path: "/a" },
  ],
  [
    "MakeDir",
    { _tag: "MakeDir", path: "/a", recursive: true, undo: pure(undefined) },
    { path: "/a", recursive: true },
  ],
  ["Exists", { _tag: "Exists", path: "/a" }, { path: "/a" }],
  [
    "Glob",
    { _tag: "Glob", pattern: "*.ts", cwd: "/a" },
    { pattern: "*.ts", cwd: "/a" },
  ],
  [
    "Exec",
    {
      _tag: "Exec",
      command: "ls",
      args: ["-l"],
      cwd: "/a",
      undo: pure(undefined),
    },
    { command: "ls", args: ["-l"], cwd: "/a" },
  ],
  [
    "Prompt",
    {
      _tag: "Prompt",
      question: {
        type: "text",
        name: "n",
        message: "m",
        default: "d",
        validate: () => true,
      },
    },
    { type: "text", name: "n", message: "m", default: "d" },
  ],
  [
    "Log",
    { _tag: "Log", level: "info", message: "m" },
    { level: "info", message: "m" },
  ],
  ["ReadContext", { _tag: "ReadContext", key: "k" }, { key: "k" }],
  [
    "WriteContext",
    { _tag: "WriteContext", key: "k", value: 42 },
    { key: "k", value: 42 },
  ],
  [
    "Symlink",
    { _tag: "Symlink", target: "/t", path: "/l", undo: pure(undefined) },
    { target: "/t", path: "/l" },
  ],
  ["Parallel", { _tag: "Parallel", tasks: [pure(1)] }, { taskCount: 1 }],
  ["Race", { _tag: "Race", tasks: [pure(1), pure(2)] }, { taskCount: 2 }],
];

describe("extractEffectContent", () => {
  it.each(
    cases,
  )("extracts identity content for %s, excluding closures", (_tag, effect, expected) => {
    expect(extractEffectContent(effect)).toEqual(expected);
  });

  it.each([
    ["confirm", { type: "confirm", name: "n", message: "m", default: true }],
    [
      "select",
      {
        type: "select",
        name: "n",
        message: "m",
        default: "a",
        choices: [{ label: "A", value: "a" }],
      },
    ],
    [
      "multiselect",
      {
        type: "multiselect",
        name: "n",
        message: "m",
        default: ["a"],
        choices: [{ label: "A", value: "a" }],
      },
    ],
  ] as const)("extracts content for a %s prompt", (_type, question) => {
    const effect: Effect = { _tag: "Prompt", question };
    expect(extractEffectContent(effect)).toEqual(question);
  });
});

describe("computeEffectId", () => {
  it("gives equal content to equal effects at the same position", () => {
    const a = computeEffectId({ _tag: "ReadFile", path: "/a" }, "", 0);
    const b = computeEffectId({ _tag: "ReadFile", path: "/a" }, "", 0);
    expect(a).toEqual(b);
    expect(a.kind).toBe("ReadFile");
  });

  it("carries the effect's tag into kind for a non-ReadFile effect", () => {
    const id = computeEffectId(
      { _tag: "Exec", command: "ls", args: ["-l"], cwd: "/a" },
      "",
      0,
    );
    expect(id.kind).toBe("Exec");
  });

  it("distinguishes different content", () => {
    const a = computeEffectId({ _tag: "ReadFile", path: "/a" }, "", 0);
    const b = computeEffectId({ _tag: "ReadFile", path: "/b" }, "", 0);
    expect(a.content).not.toBe(b.content);
  });

  it("distinguishes the same effect at different positions", () => {
    const a = computeEffectId({ _tag: "ReadFile", path: "/a" }, "", 0);
    const b = computeEffectId({ _tag: "ReadFile", path: "/a" }, "", 1);
    expect(a.content).toBe(b.content);
    expect(a.seq).not.toBe(b.seq);
  });

  it("ignores a transform closure so two transforms of one path match", () => {
    const a = computeEffectId(
      { _tag: "TransformFile", path: "/a", transform: (s) => s.toUpperCase() },
      "",
      0,
    );
    const b = computeEffectId(
      { _tag: "TransformFile", path: "/a", transform: (s) => s.trim() },
      "",
      0,
    );
    expect(a.content).toBe(b.content);
  });
});

describe("formatEffectId", () => {
  it("renders a stable string keyed by branch, seq, kind, and content", () => {
    const id = computeEffectId({ _tag: "ReadFile", path: "/a" }, "0", 2);
    expect(formatEffectId(id)).toBe('0#2:ReadFile:{"path":"/a"}');
  });
});
