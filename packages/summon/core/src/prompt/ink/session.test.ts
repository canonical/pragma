import { promptEffect, writeFile, writeFileEffect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { CONFIRM_ANSWER_KEY } from "../../execute/execute.js";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
import type { PromptEffect } from "../types.js";
import { SessionController } from "./session.js";

const gen: GeneratorDefinition = {
  meta: { name: "g", displayName: "g", description: "d", version: "1.0.0" },
  prompts: [
    { name: "path", type: "text", message: "Path?" },
    {
      name: "extra",
      type: "text",
      message: "Extra?",
      when: (a) => a.path === "y",
    },
  ],
  generate: (a) => writeFile(String(a.path), "x"),
};

const ask = (name: string): PromptEffect =>
  promptEffect({ type: "text", name, message: `${name}?` }) as PromptEffect;
const confirm = (): PromptEffect =>
  promptEffect({
    type: "confirm",
    name: CONFIRM_ANSWER_KEY,
    message: "Proceed?",
    default: true,
  }) as PromptEffect;

describe("SessionController", () => {
  it("starts idle with the applicable-prompt count", () => {
    const c = new SessionController(gen);
    expect(c.getSnapshot().phase).toBe("idle");
    expect(c.getSnapshot().total).toBe(1); // `extra` gated off (path !== 'y')
  });

  it("drives a prompt request → answer, accumulating state", async () => {
    const c = new SessionController(gen);
    let notified = 0;
    const unsub = c.subscribe(() => notified++);
    const p = c.request(ask("path"));
    expect(c.getSnapshot().phase).toBe("prompting");
    expect(c.getSnapshot().step).toBe(1);
    c.submitAnswer("y");
    await expect(p).resolves.toBe("y");
    expect(c.getSnapshot().answers).toEqual({ path: "y" });
    expect(notified).toBeGreaterThan(0);
    unsub();
  });

  it("computes a preview + confirm gate and proceeds", async () => {
    const c = new SessionController(gen);
    void c.request(ask("path"));
    c.submitAnswer("out.txt");
    const gate = c.request(confirm());
    expect(c.getSnapshot().phase).toBe("confirming");
    expect(c.getSnapshot().previewEffects.length).toBeGreaterThan(0);
    c.submitConfirm(true);
    await expect(gate).resolves.toBe(true);
    expect(c.getSnapshot().phase).toBe("executing");
    // After confirm, executionStart is set → completion carries real timing.
    c.reportEffectStart(writeFileEffect("a.txt", "x"));
    c.reportEffectComplete(writeFileEffect("a.txt", "x"), 3);
    expect(c.getSnapshot().progress.length).toBe(1);
  });

  it("keeps the cancelled phase if an effect completes after cancel", () => {
    const c = new SessionController(gen);
    c.cancel();
    c.reportEffectComplete(writeFileEffect("a.txt", "x"), 1);
    expect(c.getSnapshot().phase).toBe("cancelled");
  });

  it("tolerates a generator whose generate throws while previewing", async () => {
    const throwing: GeneratorDefinition = {
      ...gen,
      generate: () => {
        throw new Error("precondition");
      },
    };
    const c = new SessionController(throwing);
    const gate = c.request(confirm());
    expect(c.getSnapshot().phase).toBe("confirming");
    expect(c.getSnapshot().previewEffects).toEqual([]);
    c.submitConfirm(true);
    await expect(gate).resolves.toBe(true);
  });

  it("declining the gate resolves false and cancels", async () => {
    const c = new SessionController(gen);
    const gate = c.request(confirm());
    c.submitConfirm(false);
    await expect(gate).resolves.toBe(false);
    expect(c.getSnapshot().phase).toBe("cancelled");
  });

  it("records completed effects during execution", () => {
    const c = new SessionController(gen);
    c.reportEffectStart(writeFileEffect("a.txt", "x"));
    c.reportEffectComplete(writeFileEffect("a.txt", "x"), 5);
    expect(c.getSnapshot().progress.length).toBe(1);
    expect(c.getSnapshot().phase).toBe("executing");
  });

  it("marks completion and error, and ignores completion after cancel", () => {
    const c = new SessionController(gen);
    c.markComplete();
    expect(c.getSnapshot().phase).toBe("complete");
    c.markError({ code: "X", message: "boom" });
    expect(c.getSnapshot().phase).toBe("error");

    const c2 = new SessionController(gen);
    c2.cancel();
    c2.markComplete(); // guarded no-op after cancel
    expect(c2.getSnapshot().phase).toBe("cancelled");
  });

  it("cancel rejects the pending prompt (the cancellation signal)", async () => {
    const c = new SessionController(gen);
    const p = c.request(ask("path"));
    c.cancel();
    await expect(p).rejects.toThrow();
    expect(c.getSnapshot().phase).toBe("cancelled");
  });

  it("ignores answer/confirm submitted against the wrong pending kind", () => {
    const c = new SessionController(gen);
    c.submitAnswer("noop"); // nothing pending
    void c.request(ask("path"));
    c.submitConfirm(true); // pending is not a confirm
    expect(c.getSnapshot().phase).toBe("prompting");
    c.reportLog("info", "hi"); // parity no-op
  });
});
