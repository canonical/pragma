import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  $,
  collectUndos,
  dryRun,
  exists,
  fail,
  flatMap,
  gen,
  ifElseM,
  mkdir,
  pure,
  sequence_,
  type Task,
  writeFile,
} from "@canonical/task";
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
  invalidAnswersError,
  isInvalidAnswersError,
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

describe("execute — a generator that adds to existing files", () => {
  // Refuses unless `base.txt` is already there: the guard depends on the
  // host, which the pure preview walk cannot see.
  const addsTo: GeneratorDefinition = {
    ...fixture,
    prompts: [],
    generate: () =>
      ifElseM(
        exists("base.txt"),
        writeFile("added.txt", "added\n"),
        fail({ code: "BASE_MISSING", message: "base.txt is missing" }),
      ),
  };
  const run = (dir: string) =>
    runGeneratorTask(execute(addsTo, { prompt: autoPrompt({}), params: {} }), {
      cwd: dir,
      promptHandler: autoPrompt({}),
    });

  it("runs when the file it adds to exists, and summarises the write", async () => {
    const dir = mkdtempSync(join(tmpdir(), "exec-adds-"));
    writeFileSync(join(dir, "base.txt"), "base\n");
    const result = await run(dir);
    expect(readFileSync(join(dir, "added.txt"), "utf-8")).toBe("added\n");
    expect(
      result.effects.some(
        (e) => e._tag === "WriteFile" && e.path === "added.txt",
      ),
    ).toBe(true);
  });

  it("fails with the guard's own message when that file is missing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "exec-adds-"));
    await expect(run(dir)).rejects.toMatchObject({
      taskError: { code: "BASE_MISSING" },
    });
  });

  it("rethrows a preview failure that is not a task failure, unchanged", () => {
    // Each walk throws its own instance, so the one that comes back says
    // which walk's error was rethrown: it must be the plain walk's, the first.
    const thrown: RangeError[] = [];
    const broken: GeneratorDefinition = {
      ...addsTo,
      generate: () =>
        flatMap(pure(undefined), (): Task<void> => {
          const error = new RangeError(`walk ${thrown.length + 1}`);
          thrown.push(error);
          throw error;
        }),
    };
    let caught: unknown;
    try {
      dryRun(execute(broken, { prompt: autoPrompt({}), params: {} }));
    } catch (error) {
      caught = error;
    }
    expect(thrown.length).toBeGreaterThan(1);
    expect(caught).toBe(thrown[0]);
  });
});

describe("execute — the summary walk behind a guard on an existing file", () => {
  const runIn = (dir: string, generate: GeneratorDefinition["generate"]) => {
    const generator: GeneratorDefinition = {
      ...fixture,
      prompts: [],
      generate,
    };
    return runGeneratorTask(
      execute(generator, { prompt: autoPrompt({}), params: {} }),
      { cwd: dir, promptHandler: autoPrompt({}) },
    );
  };

  it("summarises a gen()-built generator's real effects (each walk builds afresh)", async () => {
    // gen() is single-use: a retry that re-walked the first walk's task would
    // drive its spent iterator, whose walk no longer passes the guard — the
    // summary would lose the existence check between the two writes.
    const dir = mkdtempSync(join(tmpdir(), "exec-gen-"));
    writeFileSync(join(dir, "base.txt"), "base\n");
    const result = await runIn(dir, () =>
      gen(function* () {
        yield* $(writeFile("first.txt", "first\n"));
        const present = yield* $(exists("base.txt"));
        if (!present) {
          yield* $(
            fail({ code: "BASE_MISSING", message: "base.txt is missing" }),
          );
        }
        yield* $(writeFile("added.txt", "added\n"));
      }),
    );
    const walked = result.effects.flatMap((e) =>
      e._tag === "WriteFile" || e._tag === "Exists"
        ? [`${e._tag} ${e.path}`]
        : [],
    );
    expect(walked).toEqual([
      "WriteFile first.txt",
      "Exists base.txt",
      "WriteFile added.txt",
    ]);
    expect(readFileSync(join(dir, "added.txt"), "utf-8")).toBe("added\n");
  });

  it("fails with the plain walk's error when no existence answer avoids a failure", async () => {
    const dir = mkdtempSync(join(tmpdir(), "exec-both-"));
    await expect(
      runIn(dir, () =>
        ifElseM(
          exists("a"),
          fail({ code: "A_EXISTS", message: "a exists" }),
          fail({ code: "B", message: "b" }),
        ),
      ),
    ).rejects.toMatchObject({ taskError: { code: "B" } });
  });
});

describe("execute — generate() re-interpretation parity (no single-use gen() under generate)", () => {
  // execute performs `const built = generate(answers); dryRun(built).effects;
  // yield* $(built)` — it interprets the generate() result TWICE (preview then
  // perform). The composed task must therefore survive a second drive, so
  // pragma's create/setup generators compose with re-runnable combinators
  // (sequence_/when), never a single-use gen(). These pin that invariant.
  it("interprets a generate() result twice (dryRun then real) with identical effects", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gen-parity-"));
    const answers = { path: "out.txt", flavor: "a" };
    const built = fixture.generate(answers);

    // #1 — the pure preview (what execute shows and --dry-run applies).
    const preview = dryRun(built).effects.map((e) => e._tag);
    expect(preview).toContain("WriteFile");

    // #2 — the SAME task, driven for real: it was not consumed by the preview.
    await runTask(built, { cwd: dir, promptHandler: autoPrompt(answers) });
    expect(readFileSync(join(dir, "out.txt"), "utf-8")).toBe("flavor=a\n");

    // #3 — re-preview after the real run: still identical (an immutable task,
    // not a spent generator). This parity is exactly what execute relies on.
    expect(dryRun(built).effects.map((e) => e._tag)).toEqual(preview);
  });

  it("a single-use gen() generate loses parity on the second drive (the guarded hazard)", () => {
    // The SAME two steps composed with gen() instead of sequence_: gen() closes
    // over ONE iterator, so the first drive exhausts it and the second
    // truncates — precisely why a generator's `generate` must not use gen().
    const genBuilt: Task<void> = gen(function* () {
      yield* $(mkdir("."));
      yield* $(writeFile("out.txt", "x"));
    });
    const first = dryRun(genBuilt).effects.map((e) => e._tag);
    const second = dryRun(genBuilt).effects.map((e) => e._tag);
    expect(first.length).toBeGreaterThan(second.length); // truncated re-drive
    expect(second).not.toEqual(first);

    // sequence_ (what generate actually uses) is stable across drives.
    const seqBuilt = sequence_([mkdir("."), writeFile("out.txt", "x")]);
    expect(dryRun(seqBuilt).effects.map((e) => e._tag)).toEqual(
      dryRun(seqBuilt).effects.map((e) => e._tag),
    );
  });
});

describe("invalidAnswersError — a generator's typed cross-answer failure", () => {
  it("builds the GENERATOR_INVALID_ANSWER shape a host's invalid-input pathway routes", () => {
    const error = invalidAnswersError("A and B are required together.");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(GENERATOR_INVALID_ANSWER);
    expect(error.message).toBe("A and B are required together.");
    expect(error.taskError).toEqual({
      code: GENERATOR_INVALID_ANSWER,
      message: "A and B are required together.",
    });
  });

  it("isInvalidAnswersError matches by CODE, never by class identity", () => {
    expect(isInvalidAnswersError(invalidAnswersError("m"))).toBe(true);
    // A duplicate module instance produces a different class but the same
    // code — still matched.
    const foreign = Object.assign(new Error("m"), {
      code: GENERATOR_INVALID_ANSWER,
    });
    expect(isInvalidAnswersError(foreign)).toBe(true);
    // Everything else is somebody's bug, not an invalid answer.
    expect(isInvalidAnswersError(new Error("m"))).toBe(false);
    expect(
      isInvalidAnswersError(
        Object.assign(new Error("m"), { code: "OTHER_CODE" }),
      ),
    ).toBe(false);
    expect(
      isInvalidAnswersError({ code: GENERATOR_INVALID_ANSWER, message: "m" }),
    ).toBe(false); // not an Error instance
    expect(isInvalidAnswersError(undefined)).toBe(false);
  });
});

describe("execute — the seam task itself is re-interpretable", () => {
  // execute() used to be gen()-based and therefore single-use — but undo
  // collection re-walks the seam task (including fail-backtracking restarts),
  // interpreting the SAME task object more than once, so it must be built
  // from re-runnable combinators.
  it("yields identical effects when interpreted twice", () => {
    // `flavor` is deliberately NOT provided: the walk must re-drive through
    // an actual Prompt continuation (dry-run resolves it to its default), so
    // a one-shot prompt chain in collectAnswers would fail this re-drive.
    const task = execute(fixture, {
      prompt: autoPrompt({}),
      params: { path: "out.txt" },
    });

    const first = dryRun(task).effects.map((e) => e._tag);
    const second = dryRun(task).effects.map((e) => e._tag);

    expect(first).toContain("Prompt");
    expect(first).toContain("WriteFile");
    expect(second).toEqual(first);
  });

  it("performs ALL effects of a gen()-based generate (fresh build per drive)", async () => {
    // A generator whose generate() uses gen() previously truncated: the
    // preview dry-run spent the iterator and the real run performed only the
    // first effect. Each interpretation now invokes generate() anew.
    const genFixture: GeneratorDefinition = {
      ...fixture,
      generate: (a) =>
        gen(function* () {
          yield* $(mkdir("."));
          yield* $(writeFile(String(a.path), "one\n"));
          yield* $(writeFile("second.txt", "two\n"));
        }),
    };
    const dir = mkdtempSync(join(tmpdir(), "execute-gen-"));

    await runGeneratorTask(
      execute(genFixture, {
        prompt: autoPrompt({}),
        params: { path: "out.txt", flavor: "a" },
      }),
      { cwd: dir, promptHandler: autoPrompt({}) },
    );

    expect(readFileSync(join(dir, "out.txt"), "utf-8")).toBe("one\n");
    expect(readFileSync(join(dir, "second.txt"), "utf-8")).toBe("two\n");
  });

  it("undo collection backtracks through a fail-if-exists guard", () => {
    // The pragma --undo path collects undos from the execute() task itself.
    // A guard that refuses to scaffold over an existing directory reads as
    // failing under host-backed Exists resolution (the forward run created
    // the directory), so collection must be able to restart the walk with
    // that decision flipped — impossible while the seam was single-use.
    const guarded: GeneratorDefinition = {
      ...fixture,
      generate: (a) =>
        ifElseM(
          exists("target"),
          fail({ code: "TARGET_EXISTS", message: "already exists" }),
          sequence_([mkdir("target"), writeFile(String(a.path), "x\n")]),
        ),
    };

    const undos = collectUndos(
      execute(guarded, {
        prompt: autoPrompt({}),
        params: { path: "out.txt", flavor: "a" },
      }),
      { resolveExists: (p) => p === "target" },
    );

    expect(undos.length).toBeGreaterThan(0);
  });
});
