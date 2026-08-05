import type { Effect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { planEffectSeam, runEffectSeam } from "./effectSeam.js";

const write = (content: string): Effect => ({
  _tag: "WriteFile",
  path: "x.ts",
  content,
});

describe("runEffectSeam", () => {
  it("returns undefined when the verb declared neither half", () => {
    // Not a no-op function: the interpreter must install NO callback, so a verb
    // with no seam costs the run nothing per effect.
    expect(runEffectSeam({})).toBeUndefined();
  });

  it("passes each half through alone", () => {
    const seen: string[] = [];
    runEffectSeam({ onEffectStart: () => seen.push("ui") })?.(write("a"));
    runEffectSeam({ shapeEffect: () => seen.push("shape") })?.(write("a"));
    expect(seen).toEqual(["ui", "shape"]);
  });

  it("SHAPES before it reports, so the UI sees what will be performed", () => {
    // The ordering is the contract: `create`'s stamp rewrites `content` in
    // place, and a progress render (or the harness's recorder) reading the
    // pre-stamp bytes is exactly the divergence this seam exists to remove.
    const observed: string[] = [];
    const seam = runEffectSeam({
      shapeEffect: (effect) => {
        if (effect._tag === "WriteFile") {
          (effect as { content: string }).content = `stamp\n${effect.content}`;
        }
      },
      onEffectStart: (effect) => {
        if (effect._tag === "WriteFile") observed.push(effect.content);
      },
    });

    const effect = write("body");
    seam?.(effect);

    expect(observed).toEqual(["stamp\nbody"]);
    expect((effect as { content: string }).content).toBe("stamp\nbody");
  });
});

describe("planEffectSeam", () => {
  it("takes the SHAPING half and drops the UI half", () => {
    // The asymmetry with `runEffectSeam` is the whole point: a plan mounts no
    // progress render, but it must report the bytes the stamp will write.
    const shapeEffect = (): void => {};
    const onEffectStart = (): void => {};
    expect(planEffectSeam({ shapeEffect, onEffectStart })).toEqual({
      cwd: undefined,
      onEffectStart: shapeEffect,
    });
  });

  it("defaults cwd to the verb's own, so the plan reads where the run reads", () => {
    expect(planEffectSeam({ cwd: "/jail" }).cwd).toBe("/jail");
  });

  it("honours the caller's cwd OVERRIDE — the MCP projector's jail root", () => {
    // MCP resolves against the per-call root it validated, which is not
    // necessarily the one the verb wired in. That difference is a decision, so
    // it is passed rather than inferred.
    expect(planEffectSeam({ cwd: "/verb" }, "/per-call").cwd).toBe("/per-call");
  });

  it("survives a verb that declared no runner options at all", () => {
    expect(planEffectSeam(undefined)).toEqual({
      cwd: undefined,
      onEffectStart: undefined,
    });
  });
});
