import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dryRun, mkdir, sequence_, writeFile } from "@canonical/task";
import { runTask } from "@canonical/task/node";
import { describe, expect, it } from "vitest";
import autoPrompt from "../prompt/autoPrompt.js";
import type { PromptEffect, PromptHandler } from "../prompt/types.js";
import runGeneratorTask from "../run/runGeneratorTask.js";
import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import execute, {
  CONFIRM_ANSWER_KEY,
  GENERATOR_CANCELLED,
  GENERATOR_INVALID_ANSWER,
} from "./execute.js";

const fixture: GeneratorDefinition = {
  meta: { name: "fix", displayName: "fix", description: "d", version: "1.0.0" },
  prompts: [
    { name: "path", type: "text", message: "Path?", default: "out.txt" },
    {
      name: "flavor",
      type: "select",
      message: "Flavor?",
      choices: [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ],
      default: "a",
    },
  ],
  generate: (a) =>
    sequence_([mkdir("."), writeFile(String(a.path), `flavor=${a.flavor}\n`)]),
};

describe("execute — the summon↔pragma seam", () => {
  it("returns a task and does NOT run it (dry-run mocks prompts to defaults)", () => {
    const { value, effects } = dryRun(
      execute(fixture, { prompt: autoPrompt({}), params: {} }),
    );
    // Prompts + confirm gate mock to their defaults; the generate effects ARE
    // the plan (this is why --dry-run keeps working through the kernel).
    expect(value.answers).toEqual({ path: "out.txt", flavor: "a" });
    expect(effects.some((e) => e._tag === "WriteFile")).toBe(true);
    expect(value.effects.some((e) => e._tag === "WriteFile")).toBe(true);
  });

  it("performs the generation for real, honouring provided params", async () => {
    const dir = mkdtempSync(join(tmpdir(), "exec-"));
    const params = { path: "out.txt", flavor: "b" };
    const result = await runGeneratorTask(
      execute(fixture, { prompt: autoPrompt(params), params }),
      { cwd: dir, promptHandler: autoPrompt(params) },
    );
    expect(result.answers).toEqual(params);
    expect(readFileSync(join(dir, "out.txt"), "utf-8")).toBe("flavor=b\n");
  });

  it("rejects a flag-provided answer that fails its prompt's constraint", async () => {
    const params = { flavor: "z" }; // not a declared choice
    await expect(
      runTask(execute(fixture, { prompt: autoPrompt(params), params }), {
        promptHandler: autoPrompt(params),
      }),
    ).rejects.toMatchObject({
      taskError: { code: GENERATOR_INVALID_ANSWER },
    });
  });

  it("fails as cancelled when the confirm gate is declined", async () => {
    const decline: PromptHandler = (effect: PromptEffect) =>
      effect.question.name === CONFIRM_ANSWER_KEY
        ? Promise.resolve(false)
        : autoPrompt({})(effect);
    await expect(
      runTask(execute(fixture, { prompt: decline, params: {} }), {
        promptHandler: decline,
      }),
    ).rejects.toMatchObject({ taskError: { code: GENERATOR_CANCELLED } });
  });

  it("fails structurally on a missing required answer (no default, non-interactive)", async () => {
    const reqGen: GeneratorDefinition = {
      ...fixture,
      prompts: [{ name: "req", type: "text", message: "Required?" }],
    };
    await expect(
      runTask(execute(reqGen, { prompt: autoPrompt({}), params: {} }), {
        promptHandler: autoPrompt({}),
      }),
    ).rejects.toMatchObject({
      taskError: { code: "MISSING_REQUIRED_ANSWER" },
    });
  });
});
