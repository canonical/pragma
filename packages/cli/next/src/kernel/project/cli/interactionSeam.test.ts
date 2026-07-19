/**
 * The §0 spine: a mutating verb reads `runtime.interaction` and sets
 * `runtime.exec`, and the dispatcher spreads `exec` into the node interpreter
 * on the REAL-run branch only — so an interactive Prompt effect is resolved by
 * the injected handler (not the bare `NO_PROMPT_HANDLER` throw), while
 * `--dry-run` stays handler-free and mocks the prompt.
 */

import { $, gen, prompt } from "@canonical/task";
import { describe, expect, it, vi } from "vitest";
import { bootRuntime } from "../../runtime/boot.js";
import type { GlobalFlags, VerbSpec } from "../../spec/types.js";
import { executeVerb, type MutationFlags } from "./dispatch.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const noMutation: MutationFlags = { dryRun: false, undo: false, yes: false };

const json = (d: unknown) => JSON.stringify(d);

/** A mutating verb whose task prompts once and whose `run` wires `exec`. */
function seamVerb(onExec?: () => void): VerbSpec {
  return {
    path: ["fixture", "seam"],
    summary: "A prompting mutation.",
    params: [],
    output: { formatters: { plain: json, llm: json, json } },
    capability: {
      needsStore: false,
      mutates: true,
      interactive: true,
      mcp: { expose: false, reason: "test fixture" },
    },
    run: (_params, rt) => {
      // The verb picks its strategy from the interaction context and records it
      // as the injected prompt handler + optional teardown.
      const answer = rt.interaction?.yes ? "confirmed" : "attended";
      rt.exec = {
        promptHandler: () => Promise.resolve(answer),
        dispose: onExec,
      };
      return gen(function* () {
        const value = yield* $(
          prompt({ type: "text", name: "which", message: "Which?" }),
        );
        return { value };
      });
    },
  };
}

describe("interaction/exec seam (PROTECTED)", () => {
  it("resolves an interactive Prompt through the verb's injected handler", async () => {
    const runtime = bootRuntime(FLAGS);
    const outcome = await executeVerb(
      seamVerb(),
      {},
      { ...noMutation, yes: true },
      runtime,
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("confirmed");
  });

  it("passes the interaction context (yes flag) to the verb", async () => {
    const runtime = bootRuntime(FLAGS);
    const outcome = await executeVerb(seamVerb(), {}, noMutation, runtime);
    expect(outcome.stdout).toContain("attended");
  });

  it("runs the verb's exec.dispose teardown after a real run", async () => {
    const dispose = vi.fn();
    const runtime = bootRuntime(FLAGS);
    await executeVerb(
      seamVerb(dispose),
      {},
      { ...noMutation, yes: true },
      runtime,
    );
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("dry-run stays handler-free, mocks the prompt, and omits it from the plan", async () => {
    const runtime = bootRuntime(FLAGS);
    const outcome = await executeVerb(
      seamVerb(),
      {},
      { ...noMutation, dryRun: true },
      runtime,
    );
    expect(outcome.exitCode).toBe(0);
    // The only effect is the Prompt (mocked) — filtered from the plan.
    expect(outcome.stdout).toContain("no effects");
  });
});
