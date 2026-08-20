import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  $,
  type Effect,
  exists,
  gen as gen_,
  promptEffect,
  readFile,
  writeFile,
  writeFileEffect,
} from "@canonical/task";
import { describe, expect, it } from "vitest";
import { CONFIRM_ANSWER_KEY } from "../../execute/execute.js";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
import type { PromptEffect } from "../types.js";
import { SessionController } from "./session.js";

/** The paths a plan writes, in order. */
const paths = (effects: readonly Effect[]): string[] =>
  effects.flatMap((e) => (e._tag === "WriteFile" ? [e.path] : []));

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
  it("starts idle with the applicable-prompt count", async () => {
    const c = new SessionController(gen);
    expect(c.getSnapshot().phase).toBe("idle");
    expect(c.getSnapshot().total).toBe(1); // `extra` gated off (path !== 'y')
    // No gate has opened, so there is no preview to wait for.
    await expect(c.previewSettled()).resolves.toBeUndefined();
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
    // The gate renders immediately; the honest preview fills the pane in.
    expect(c.getSnapshot().phase).toBe("confirming");
    expect(c.getSnapshot().previewEffects).toEqual([]);
    await c.previewSettled();
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
    await c.previewSettled();
    expect(c.getSnapshot().previewEffects).toEqual([]);
    c.submitConfirm(true);
    await expect(gate).resolves.toBe(true);
  });

  it("the pane's plan is HONEST: it reads real files and writes none", async () => {
    // The mock this replaced answered every read with a placeholder, so a
    // generator branching on the filesystem could promise the wrong plan.
    const dir = mkdtempSync(join(tmpdir(), "summon-pane-"));
    writeFileSync(join(dir, "present.txt"), "here");
    const branching: GeneratorDefinition = {
      ...gen,
      generate: () =>
        gen_(function* () {
          const found = yield* $(exists("present.txt"));
          yield* $(writeFile(found ? "found.txt" : "missing.txt", "x"));
        }),
    };

    const inDir = new SessionController(branching, undefined, dir);
    void inDir.request(confirm());
    await inDir.previewSettled();
    expect(paths(inDir.getSnapshot().previewEffects)).toEqual(["found.txt"]);
    // Nothing was written: the pane is shown BEFORE the user consents.
    expect(readdirSync(dir)).toEqual(["present.txt"]);

    // The same generator against an empty tree plans the other branch — proof
    // the pane reads the cwd it was given, not a mock.
    const empty = mkdtempSync(join(tmpdir(), "summon-pane-"));
    const inEmpty = new SessionController(branching, undefined, empty);
    void inEmpty.request(confirm());
    await inEmpty.previewSettled();
    expect(paths(inEmpty.getSnapshot().previewEffects)).toEqual([
      "missing.txt",
    ]);
    expect(readdirSync(empty)).toEqual([]);
  });

  it("shows an empty pane when the preview FAILS, and never a fiction", async () => {
    // A generator whose first read cannot succeed is a run that will fail. The
    // gate says nothing rather than promising a plan the run cannot deliver.
    const dir = mkdtempSync(join(tmpdir(), "summon-pane-"));
    const reading: GeneratorDefinition = {
      ...gen,
      generate: () =>
        gen_(function* () {
          const body = yield* $(readFile("nope.txt"));
          yield* $(writeFile("copy.txt", body));
        }),
    };
    const c = new SessionController(reading, undefined, dir);
    const gate = c.request(confirm());
    await c.previewSettled();
    expect(c.getSnapshot().previewEffects).toEqual([]);
    // The decision is still the user's to make.
    c.submitConfirm(true);
    await expect(gate).resolves.toBe(true);
  });

  it("drops a preview that resolves after the gate moved on", async () => {
    const c = new SessionController(gen);
    void c.request(ask("path"));
    c.submitAnswer("out.txt");
    const gate = c.request(confirm());
    // Answer before the in-flight preview resolves: its result is stale and
    // must not repaint a pane the wizard has already left.
    c.submitConfirm(true);
    await expect(gate).resolves.toBe(true);
    await c.previewSettled();
    expect(c.getSnapshot().phase).toBe("executing");
    expect(c.getSnapshot().previewEffects).toEqual([]);
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

  it("cancel rejects the pending prompt with a GENERATOR_CANCELLED code (H1)", async () => {
    const c = new SessionController(gen);
    const p = c.request(ask("path"));
    c.cancel();
    // A bare Error would flatten to INTERNAL at the boundary ("please report");
    // the code is what routes an at-prompt cancel to a clean exit 0.
    await expect(p).rejects.toMatchObject({ code: "GENERATOR_CANCELLED" });
    expect(c.getSnapshot().phase).toBe("cancelled");
  });

  it("cancel invokes the injected onUserCancel exactly once (H2)", () => {
    let aborts = 0;
    const c = new SessionController(gen, () => aborts++);
    // No pending prompt (models a Ctrl-C DURING execution): the abort is the
    // only thing that stops the run, so it must still fire.
    c.cancel();
    expect(aborts).toBe(1);
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
