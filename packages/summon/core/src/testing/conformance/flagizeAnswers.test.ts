import { describe, expect, it } from "vitest";
import type { PromptLike } from "../../projection/types.js";
import { flagizeAnswers } from "./flagizeAnswers.js";

const prompts: PromptLike[] = [
  {
    name: "componentPath",
    type: "text",
    message: "Path:",
    default: "src/components/MyComponent",
    positional: true,
  },
  { name: "withStyles", type: "confirm", message: "Styles?", default: true },
  { name: "withRelay", type: "confirm", message: "Relay?", default: false },
  {
    name: "kind",
    type: "select",
    message: "Kind:",
    choices: [
      { label: "a", value: "a" },
      { label: "b", value: "b" },
    ],
    default: "a",
  },
  { name: "note", type: "text", message: "Note:", default: "" },
  {
    name: "features",
    type: "multiselect",
    message: "Features:",
    choices: [
      { label: "x", value: "x" },
      { label: "y", value: "y" },
    ],
    default: ["x"],
  },
];

describe("flagizeAnswers", () => {
  it("omits answers equal to their defaults", () => {
    expect(
      flagizeAnswers(prompts, {
        componentPath: "src/components/MyComponent",
        withStyles: true,
        withRelay: false,
        kind: "a",
        note: "",
        features: ["x"],
      }),
    ).toEqual([]);
  });

  it("expresses each differing answer in its registered form", () => {
    expect(
      flagizeAnswers(prompts, {
        componentPath: "src/components/Button",
        withStyles: false,
        withRelay: true,
        kind: "b",
        note: "hello world",
        features: ["x", "y"],
      }),
    ).toEqual([
      "src/components/Button",
      "--no-with-styles",
      "--with-relay",
      "--kind=b",
      "--note=hello world",
      "--features=x,y",
    ]);
  });

  it("the positional comes first, whatever its prompt position", () => {
    const args = flagizeAnswers(prompts, {
      withRelay: true,
      componentPath: "lib/X",
    });
    expect(args[0]).toBe("lib/X");
    expect(args).toContain("--with-relay");
  });

  it("skips prompts the answer set does not carry", () => {
    expect(flagizeAnswers(prompts, { withRelay: true })).toEqual([
      "--with-relay",
    ]);
  });

  it("array defaults compare by element, not identity", () => {
    expect(flagizeAnswers(prompts, { features: ["x"] })).toEqual([]);
    expect(flagizeAnswers(prompts, { features: ["y"] })).toEqual([
      "--features=y",
    ]);
    expect(flagizeAnswers(prompts, { features: ["x", "y"] })).toEqual([
      "--features=x,y",
    ]);
  });

  // A confirm with NO declared default: buildOptionInfo registers only the
  // positive `--<kebab>`, so `true` is expressible and `false` is NOT — the
  // helper must fail loudly rather than hand the cross-CLI matrix a
  // `--no-<kebab>` argv both binaries reject as an unknown option (the
  // round-14 F3 class, previously masked because every shipped confirm
  // declares a boolean default).
  const defaultless: PromptLike[] = [
    { name: "quiet", type: "confirm", message: "Quiet?" },
  ];

  it("a default-less confirm answered true takes its registered positive form", () => {
    expect(flagizeAnswers(defaultless, { quiet: true })).toEqual(["--quiet"]);
  });

  it("a default-less confirm answered false THROWS naming the prompt — no unregistered spelling is ever emitted", () => {
    expect(() => flagizeAnswers(defaultless, { quiet: false })).toThrow(
      /confirm "quiet" answered false has no registered spelling/,
    );
    expect(() => flagizeAnswers(defaultless, { quiet: false })).toThrow(
      /--quiet/,
    );
  });
});
