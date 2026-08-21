/**
 * A generator-raised typed invalid answer (summon-core's
 * `invalidAnswersError`, code GENERATOR_INVALID_ANSWER — the shape
 * application/react's ssr+router guard throws) renders as the App's clean
 * error phase — message + code, no crash box, no stack — on the run path
 * (pre-filled answers), the same UI every execution failure gets.
 */

import {
  type GeneratorDefinition,
  invalidAnswersError,
} from "@canonical/summon-core";
import { pure, task } from "@canonical/task";
import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

const guarded: GeneratorDefinition = {
  meta: {
    name: "fixture/guarded",
    displayName: "guarded",
    description: "A guarded fixture",
    version: "0.0.1",
  },
  prompts: [{ name: "ok", type: "confirm", message: "OK?", default: true }],
  generate: (answers) => {
    if ((answers as { ok?: unknown }).ok !== true) {
      throw invalidAnswersError("OK is required — drop --no-ok.");
    }
    return task(pure(undefined)).unwrap();
  },
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 25));

describe("App — a typed invalid answer is the clean error phase, not a crash", () => {
  it("renders the message and its code on the run path", async () => {
    const { lastFrame, unmount } = render(
      <App generator={guarded} preview={false} answers={{ ok: false }} />,
    );
    await tick();
    const frame = lastFrame() ?? "";
    expect(frame).toContain("✗ Error: OK is required — drop --no-ok.");
    expect(frame).toContain("Code: GENERATOR_INVALID_ANSWER");
    // The error phase, not the raw throw: no stack frames in the frame.
    expect(frame).not.toContain("at generate");
    unmount();
  }, 20_000);
});
