import { describe, expect, it } from "vitest";
import {
  excessPositionalError,
  renderUsageError,
  unknownSegmentError,
} from "./usage.js";

describe("renderUsageError — verbatim parity vectors", () => {
  it("unknown-segment uses SINGLE quotes around the stray", () => {
    const error = unknownSegmentError(["bin", "component"], "reakt", ["react"]);
    expect(renderUsageError(error)).toBe(
      "error: unknown command 'reakt'\nDid you mean 'bin component react'?",
    );
  });

  it("excess-positional uses DOUBLE quotes around the stray", () => {
    const error = excessPositionalError(
      ["bin", "component", "react"],
      "Extra",
      ["MyComponent", "Extra"],
      new Set(),
      new Set(),
    );
    expect(renderUsageError(error)).toBe('error: unexpected argument "Extra"');
  });

  it("the sibling branch slices the chain so [...chain, suggestion] IS the corrected invocation", () => {
    const error = excessPositionalError(
      ["bin", "component", "react"],
      "X",
      ["svelte", "X"],
      new Set(["svelte", "lit"]),
      new Set(),
    );
    expect(error.chain).toEqual(["bin", "component"]);
    expect([...error.chain, error.suggestion].join(" ")).toBe(
      "bin component svelte",
    );
    expect(renderUsageError(error)).toBe(
      "error: unexpected argument \"X\"\nDid you mean 'bin component svelte'?",
    );
  });

  it("the child branch keeps the chain whole — same join equivalence", () => {
    const error = excessPositionalError(
      ["bin", "dual"],
      "sub",
      ["value", "sub"],
      new Set(),
      new Set(["sub"]),
    );
    expect(error.chain).toEqual(["bin", "dual"]);
    expect(renderUsageError(error)).toBe(
      "error: unexpected argument \"sub\"\nDid you mean 'bin dual sub'?",
    );
  });

  it("a suggestion-free error renders the headline line alone", () => {
    const error = unknownSegmentError(["bin", "component"], "vue", [
      "react",
      "svelte",
      "lit",
    ]);
    expect(renderUsageError(error)).toBe("error: unknown command 'vue'");
  });
});

describe("unknownSegmentError", () => {
  const chain = ["bin", "component"] as const;
  const children = ["react", "svelte", "lit"] as const;

  it("carries the structured facts: kind, prefix-free headline, suggestion, chain", () => {
    expect(unknownSegmentError(chain, "reakt", children)).toEqual({
      kind: "unknown-segment",
      headline: "unknown command 'reakt'",
      suggestion: "react",
      chain,
    });
  });

  it("a transposed typo resolves (raect → react)", () => {
    expect(unknownSegmentError(chain, "raect", children).suggestion).toBe(
      "react",
    );
  });

  it("a prefix match wins outright", () => {
    expect(unknownSegmentError(chain, "rea", children).suggestion).toBe(
      "react",
    );
  });

  it("a case-only stray IS suggested — suggestNames' exact-match exclusion is deliberately dropped", () => {
    expect(unknownSegmentError(chain, "REACT", children).suggestion).toBe(
      "react",
    );
  });

  it("a closer candidate replaces an earlier in-threshold match", () => {
    expect(
      unknownSegmentError(chain, "reakt", ["reacts", "react"]).suggestion,
    ).toBe("react");
  });

  it("omits the suggestion when nothing is close, or the token is empty", () => {
    expect(unknownSegmentError(chain, "vue", children)).toEqual({
      kind: "unknown-segment",
      headline: "unknown command 'vue'",
      chain,
    });
    expect(unknownSegmentError(chain, "", children)).toEqual({
      kind: "unknown-segment",
      headline: "unknown command ''",
      chain,
    });
  });
});

describe("excessPositionalError", () => {
  it("names the stray; no suggestion when no operand is a segment", () => {
    expect(
      excessPositionalError(
        ["bin", "component", "react"],
        "X",
        ["X"],
        new Set(["svelte"]),
        new Set(),
      ),
    ).toEqual({
      kind: "excess-positional",
      headline: 'unexpected argument "X"',
      chain: ["bin", "component", "react"],
    });
  });

  it("a child match beats a sibling match", () => {
    const error = excessPositionalError(
      ["bin", "component", "react"],
      "svelte",
      ["svelte"],
      new Set(["svelte"]),
      new Set(["svelte"]),
    );
    expect(error).toEqual({
      kind: "excess-positional",
      headline: 'unexpected argument "svelte"',
      suggestion: "svelte",
      chain: ["bin", "component", "react"],
    });
    expect(renderUsageError(error)).toBe(
      "error: unexpected argument \"svelte\"\nDid you mean 'bin component react svelte'?",
    );
  });

  it("a mounted chain keeps its full invocation in the suggestion", () => {
    const error = excessPositionalError(
      ["pragma", "create", "component", "react"],
      "X",
      ["svelte", "X"],
      new Set(["svelte", "lit"]),
      new Set(),
    );
    expect(error.chain).toEqual(["pragma", "create", "component"]);
    expect(renderUsageError(error)).toBe(
      "error: unexpected argument \"X\"\nDid you mean 'pragma create component svelte'?",
    );
  });
});
