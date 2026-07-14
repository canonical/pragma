import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import {
  flatMap,
  mkdir,
  readFile,
  sequence_,
  writeFile,
} from "@canonical/task";
import { describe, expect, it, vi } from "vitest";
import executeGenerator from "./executeGenerator.js";
import type { CommandContext, CommandResult, PromptSession } from "./types.js";

// =============================================================================
// Helpers
// =============================================================================

const baseCtx: CommandContext = {
  cwd: "/tmp",
  globalFlags: { llm: false, format: "text", verbose: false },
};

const llmCtx: CommandContext = {
  cwd: "/tmp",
  globalFlags: { llm: true, format: "text", verbose: false },
};

const jsonCtx: CommandContext = {
  cwd: "/tmp",
  globalFlags: { llm: false, format: "json", verbose: false },
};

const makeGen = (prompts: PromptDefinition[]): GeneratorDefinition => ({
  meta: { name: "test-gen", description: "A test generator", version: "1.0.0" },
  prompts,
  generate: (answers: Record<string, unknown>) =>
    writeFile(`src/${String(answers.name ?? "default")}.ts`, "export {};\n"),
});

const simplePrompts: PromptDefinition[] = [
  { name: "name", message: "Component name", type: "text" },
];

const promptsWithDefault: PromptDefinition[] = [
  { name: "name", message: "Component name", type: "text" },
  {
    name: "withTests",
    message: "Include tests?",
    type: "confirm",
    default: true,
  },
];

const promptsWithWhen: PromptDefinition[] = [
  { name: "name", message: "Component name", type: "text" },
  {
    name: "testRunner",
    message: "Test runner",
    type: "select",
    choices: [{ label: "Vitest", value: "vitest" }],
    when: (a) => a.withTests === true,
  },
];

const multiselectPrompts: PromptDefinition[] = [
  { name: "name", message: "Component name", type: "text" },
  {
    name: "features",
    message: "Features",
    type: "multiselect",
    choices: [
      { label: "A", value: "a" },
      { label: "B", value: "b" },
    ],
  },
];

/** A generator that records the answers it receives into a JSON file. */
const recordingGen = (prompts: PromptDefinition[]): GeneratorDefinition => ({
  meta: {
    name: "record-gen",
    description: "Records the answers it receives",
    version: "1.0.0",
  },
  prompts,
  generate: (answers: Record<string, unknown>) =>
    writeFile("answers.json", `${JSON.stringify(answers)}\n`),
});

/** Force stdin/stdout `isTTY` for the duration of `work`, then restore. */
const withTty = async (
  value: boolean,
  work: () => Promise<void>,
): Promise<void> => {
  const streams = ["stdin", "stdout"] as const;
  const saved = streams.map(
    (stream) =>
      [
        stream,
        Object.getOwnPropertyDescriptor(process[stream], "isTTY"),
      ] as const,
  );
  for (const stream of streams) {
    Object.defineProperty(process[stream], "isTTY", {
      configurable: true,
      value,
    });
  }
  try {
    await work();
  } finally {
    for (const [stream, descriptor] of saved) {
      if (descriptor) {
        Object.defineProperty(process[stream], "isTTY", descriptor);
      } else {
        // No original descriptor (a non-TTY test env): remove what we added so
        // the non-interactive default is restored for later tests.
        delete (process[stream] as { isTTY?: boolean }).isTTY;
      }
    }
  }
};

/** A scripted prompt session recording which questions it was asked. */
const scriptSession = (
  answers: Record<string, unknown>,
  mode: "ok" | "interrupt" | "fail" = "ok",
): {
  asked: string[];
  construct: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  factory: () => PromptSession;
} => {
  const asked: string[] = [];
  let interrupted = false;
  const dispose = vi.fn();
  const construct = vi.fn();
  const session: PromptSession = {
    answerPrompt: (effect) => {
      asked.push(effect.question.name);
      if (mode === "interrupt") {
        interrupted = true;
        return Promise.reject(new Error("Prompt interrupted"));
      }
      if (mode === "fail") {
        return Promise.reject(new Error("boom"));
      }
      return Promise.resolve(answers[effect.question.name]);
    },
    wasInterrupted: () => interrupted,
    dispose,
  };
  const factory = () => {
    construct();
    return session;
  };
  return { asked, construct, dispose, factory };
};

/** Collect everything written to `process.stderr` during a test. */
const captureStderr = (): { text: () => string; restore: () => void } => {
  const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  return {
    text: () => spy.mock.calls.map((call) => String(call[0])).join(""),
    restore: () => spy.mockRestore(),
  };
};

// =============================================================================
// LLM mode
// =============================================================================

describe("executeGenerator — LLM mode", () => {
  it("returns output result with markdown string via globalFlags.llm", async () => {
    const gen = makeGen(simplePrompts);
    const result = await executeGenerator(gen, { name: "Button" }, llmCtx);
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("# test-gen");
      expect(text).toContain("## Plan");
      expect(text).toContain("src/Button.ts");
    }
  });

  it("returns output result with markdown string via params.llm", async () => {
    const gen = makeGen(simplePrompts);
    const result = await executeGenerator(
      gen,
      { name: "Button", llm: true },
      baseCtx,
    );
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("# test-gen");
    }
  });
});

// =============================================================================
// JSON mode
// =============================================================================

describe("executeGenerator — JSON mode", () => {
  it("returns output result with JSON object via globalFlags.format", async () => {
    const gen = makeGen(simplePrompts);
    const result = await executeGenerator(gen, { name: "Button" }, jsonCtx);
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      const parsed = JSON.parse(text);
      expect(parsed.generator.name).toBe("test-gen");
      expect(parsed.files["src/Button.ts"]).toBe("export {};\n");
    }
  });

  it("returns output result with JSON via params.format", async () => {
    const gen = makeGen(simplePrompts);
    const result = await executeGenerator(
      gen,
      { name: "Button", format: "json" },
      baseCtx,
    );
    expect(result.tag).toBe("output");
  });
});

// =============================================================================
// Dry-run mode
// =============================================================================

describe("executeGenerator — dry-run", () => {
  it("returns output result with formatted effect lines", async () => {
    const gen = makeGen(simplePrompts);
    const result = await executeGenerator(
      gen,
      { name: "Button", dryRun: true, yes: true },
      baseCtx,
    );
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("src/Button.ts");
      expect(text).toContain("Dry-run complete.");
    }
  });

  it("shows --show-files tip when showFiles is false", async () => {
    const gen = makeGen(simplePrompts);
    const result = await executeGenerator(
      gen,
      { name: "Button", dryRun: true, yes: true },
      baseCtx,
    );
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("--show-files");
    }
  });

  it("includes file contents when showFiles is true", async () => {
    const gen = makeGen(simplePrompts);
    const result = await executeGenerator(
      gen,
      { name: "Button", dryRun: true, yes: true, showFiles: true },
      baseCtx,
    );
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("export {};");
      expect(text).not.toContain("--show-files");
    }
  });

  it("deduplicates MakeDir effects with the same path", async () => {
    const genWithDirs: GeneratorDefinition = {
      meta: { name: "dir-gen", description: "Dir gen", version: "1.0.0" },
      prompts: [{ name: "name", message: "Name", type: "text" }],
      generate: (answers: Record<string, unknown>) =>
        sequence_([
          mkdir("src"),
          mkdir("src"),
          writeFile(
            `src/${String(answers.name ?? "default")}.ts`,
            "export {};\n",
          ),
        ]),
    };
    const result = await executeGenerator(
      genWithDirs,
      { name: "Button", dryRun: true, yes: true },
      baseCtx,
    );
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      // "src" should appear only once for MakeDir
      const lines = text
        .split("\n")
        .filter((l: string) => l.includes("Create dir") && l.includes("src"));
      expect(lines).toHaveLength(1);
    }
  });
});

describe("executeGenerator — invisible effects filtering", () => {
  it("filters out invisible effects (ReadFile) in dry-run output", async () => {
    const genWithRead: GeneratorDefinition = {
      meta: {
        name: "read-gen",
        description: "Gen with reads",
        version: "1.0.0",
      },
      prompts: [{ name: "name", message: "Name", type: "text" }],
      generate: (answers: Record<string, unknown>) =>
        flatMap(readFile("existing.ts"), (_content) =>
          writeFile(
            `src/${String(answers.name ?? "default")}.ts`,
            "export {};\n",
          ),
        ),
    };
    const result = await executeGenerator(
      genWithRead,
      { name: "Button", dryRun: true, yes: true },
      baseCtx,
    );
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      // WriteFile should be visible
      expect(text).toContain("src/Button.ts");
      // ReadFile should be filtered out (invisible)
      expect(text).not.toContain("existing.ts");
    }
  });
});

// =============================================================================
// Interactive execution
// =============================================================================

describe("executeGenerator — interactive execution", () => {
  it("reports missing required flags and exits 3 on a non-interactive terminal", async () => {
    const gen = makeGen(simplePrompts); // `name` required, no default
    const stderr = captureStderr();
    try {
      const result = await executeGenerator(gen, {}, baseCtx);
      expect(result).toEqual({ tag: "exit", code: 3 });
      expect(stderr.text()).toContain(
        "not available on a non-interactive terminal",
      );
      expect(stderr.text()).toContain("--name <value>");
    } finally {
      stderr.restore();
    }
  });

  it("formats every prompt kind in the missing-flags message", async () => {
    const gen = makeGen([
      { name: "name", message: "Name", type: "text" },
      {
        name: "primary",
        message: "Primary",
        type: "select",
        choices: [{ label: "A", value: "a" }],
      },
      { name: "confirmed", message: "Confirm?", type: "confirm" },
      {
        name: "features",
        message: "Features",
        type: "multiselect",
        choices: [{ label: "A", value: "a" }],
      },
    ]);
    const stderr = captureStderr();
    try {
      await executeGenerator(gen, {}, baseCtx);
      const written = stderr.text();
      expect(written).toContain("--name <value>");
      expect(written).toContain("--primary <value>");
      expect(written).toContain("--confirmed\n"); // boolean flag: no argument
      expect(written).toContain("--features <values...>");
    } finally {
      stderr.restore();
    }
  });

  it("reports the no-session header on a TTY when nothing is missing but no session is available", async () => {
    // All prompts default → nothing missing; a TTY prefers interaction, but with
    // no injected session the run cannot prompt. The header must name the real
    // cause (no session) rather than falsely claiming a non-interactive terminal.
    const gen = makeGen([
      { name: "name", message: "Name", type: "text", default: "Button" },
    ]);
    const stderr = captureStderr();
    try {
      await withTty(true, async () => {
        const result = await executeGenerator(gen, {}, baseCtx);
        expect(result).toEqual({ tag: "exit", code: 3 });
      });
      expect(stderr.text()).toContain(
        "No interactive prompt session is available.",
      );
      expect(stderr.text()).toContain("Provide all required flags.");
      expect(stderr.text()).not.toContain("non-interactive terminal");
    } finally {
      stderr.restore();
    }
  });

  it("exits 3 without constructing a session on a non-interactive terminal", async () => {
    const gen = makeGen(simplePrompts);
    const { factory, construct, dispose } = scriptSession({ name: "Button" });
    const stderr = captureStderr();
    try {
      const result = await executeGenerator(
        gen,
        {},
        {
          ...baseCtx,
          promptSession: factory,
        },
      );
      expect(result).toEqual({ tag: "exit", code: 3 });
      // The factory is never invoked off a TTY — no readline handle is opened
      // and then leaked.
      expect(construct).not.toHaveBeenCalled();
      expect(dispose).not.toHaveBeenCalled();
      expect(stderr.text()).toContain("non-interactive terminal");
    } finally {
      stderr.restore();
    }
  });

  it("prompts remaining answers through the session, then executes in batch", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-exec-interactive-"));
    const stderr = captureStderr();
    try {
      const gen = makeGen(simplePrompts);
      const { factory, asked, dispose } = scriptSession({ name: "Button" });
      await withTty(true, async () => {
        const result = await executeGenerator(
          gen,
          {},
          {
            ...baseCtx,
            cwd: dir,
            promptSession: factory,
          },
        );
        expect(result.tag).toBe("output");
        if (result.tag === "output") {
          expect(result.render.plain(result.value)).toContain(
            "Generation complete.",
          );
        }
      });
      expect(asked).toEqual(["name"]);
      expect(dispose).toHaveBeenCalledTimes(1);
      // The batch re-dispatch stamps by default, exactly as summon writes.
      expect(readFileSync(join(dir, "src", "Button.ts"), "utf-8")).toBe(
        "// Generated by test-gen v1.0.0\n\nexport {};\n",
      );
    } finally {
      stderr.restore();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not re-ask prompts already provided as flags", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-exec-partial-"));
    const stderr = captureStderr();
    try {
      const gen = makeGen(promptsWithDefault); // name (text), withTests (confirm)
      const { factory, asked } = scriptSession({ withTests: false });
      await withTty(true, async () => {
        await executeGenerator(
          gen,
          { name: "Card" },
          {
            ...baseCtx,
            cwd: dir,
            promptSession: factory,
          },
        );
      });
      expect(asked).toEqual(["withTests"]); // `name` came from a flag
    } finally {
      stderr.restore();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("aborts with exit 130 when the user interrupts a prompt", async () => {
    const gen = makeGen(simplePrompts);
    const { factory, dispose } = scriptSession({}, "interrupt");
    const stderr = captureStderr();
    try {
      let result: CommandResult | undefined;
      await withTty(true, async () => {
        result = await executeGenerator(
          gen,
          {},
          {
            ...baseCtx,
            promptSession: factory,
          },
        );
      });
      expect(result).toEqual({ tag: "exit", code: 130 });
      expect(dispose).toHaveBeenCalledTimes(1);
    } finally {
      stderr.restore();
    }
  });

  it("re-throws a non-interrupt prompt failure and still disposes", async () => {
    const gen = makeGen(simplePrompts);
    const { factory, dispose } = scriptSession({}, "fail");
    const stderr = captureStderr();
    try {
      await withTty(true, async () => {
        await expect(
          executeGenerator(gen, {}, { ...baseCtx, promptSession: factory }),
        ).rejects.toThrow("boom");
      });
      expect(dispose).toHaveBeenCalledTimes(1);
    } finally {
      stderr.restore();
    }
  });
});

describe("executeGenerator — batch execution", () => {
  it("runs the generator when all answers are available", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-execute-generator-"));

    try {
      const gen = makeGen(simplePrompts);
      const result = await executeGenerator(
        gen,
        { name: "Button" },
        { ...baseCtx, cwd: dir },
      );

      expect(result.tag).toBe("output");
      if (result.tag === "output") {
        const text = result.render.plain(result.value);
        expect(text).toContain("src/Button.ts");
        expect(text).toContain("Generation complete.");
      }

      const outputFile = join(dir, "src", "Button.ts");
      expect(existsSync(outputFile)).toBe(true);
      // Batch output is stamped by default — the same bytes summon writes.
      expect(readFileSync(outputFile, "utf-8")).toBe(
        "// Generated by test-gen v1.0.0\n\nexport {};\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes unstamped output when generatedStamp is disabled", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-exec-nostamp-"));

    try {
      const gen = makeGen(simplePrompts);
      await executeGenerator(
        gen,
        { name: "Button", generatedStamp: false },
        { ...baseCtx, cwd: dir },
      );

      expect(readFileSync(join(dir, "src", "Button.ts"), "utf-8")).toBe(
        "export {};\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runs in cwd without chdir when cwd matches process.cwd()", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-exec-samecwd-"));
    const originalCwd = process.cwd();
    process.chdir(dir);

    try {
      const gen = makeGen(simplePrompts);
      const result = await executeGenerator(
        gen,
        { name: "Button" },
        { ...baseCtx, cwd: dir },
      );

      expect(result.tag).toBe("output");
      if (result.tag === "output") {
        const text = result.render.plain(result.value);
        expect(text).toContain("Generation complete.");
      }
    } finally {
      process.chdir(originalCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// =============================================================================
// CLI answer extraction (observed through the batch path)
// =============================================================================

describe("executeGenerator — answer extraction", () => {
  const readAnswers = (dir: string): Record<string, unknown> =>
    JSON.parse(readFileSync(join(dir, "answers.json"), "utf-8"));

  const runRecording = async (
    prompts: PromptDefinition[],
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-answers-"));
    try {
      await executeGenerator(
        recordingGen(prompts),
        { ...params, yes: true, generatedStamp: false },
        { ...baseCtx, cwd: dir },
      );
      return readAnswers(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it("omits a confirm answer matching its default, then applies the default", async () => {
    // withTests default true, flag true → excluded from CLI answers, defaulted back.
    const answers = await runRecording(promptsWithDefault, {
      name: "X",
      withTests: true,
    });
    expect(answers.withTests).toBe(true);
  });

  it("keeps a confirm answer that differs from its default", async () => {
    const answers = await runRecording(promptsWithDefault, {
      name: "X",
      withTests: false,
    });
    expect(answers.withTests).toBe(false);
  });

  it("splits a comma-separated multiselect string into an array", async () => {
    const answers = await runRecording(multiselectPrompts, {
      name: "X",
      features: "a,b",
    });
    expect(answers.features).toEqual(["a", "b"]);
  });

  it("passes an array multiselect value through unchanged", async () => {
    const answers = await runRecording(multiselectPrompts, {
      name: "X",
      features: ["a", "b"],
    });
    expect(answers.features).toEqual(["a", "b"]);
  });
});

// =============================================================================
// when-conditional prompts
// =============================================================================

describe("executeGenerator — when conditions", () => {
  it("does not block hasAllRequiredAnswers for conditional prompts", async () => {
    const gen = makeGen(promptsWithWhen);
    // Only "name" is truly required; "testRunner" has a when condition
    const result = await executeGenerator(
      gen,
      { name: "Button", dryRun: true, yes: true },
      baseCtx,
    );
    // Should succeed as dry-run since only "name" is required
    expect(result.tag).toBe("output");
  });
});

// =============================================================================
// Undo dry-run mode
// =============================================================================

describe("executeGenerator — undo dry-run", () => {
  it("shows undo preview with step count", async () => {
    const gen = makeGen(simplePrompts);
    const result = await executeGenerator(
      gen,
      { name: "Button", undo: true, dryRun: true, yes: true },
      baseCtx,
    );
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("Undo would reverse");
      expect(text).toContain("Dry-run complete. No changes were made.");
    }
  });

  it("pluralizes step count for multiple undo steps", async () => {
    const multiGen: GeneratorDefinition = {
      meta: { name: "multi-undo", description: "Multi undo", version: "1.0.0" },
      prompts: [{ name: "name", message: "Name", type: "text" }],
      generate: (answers: Record<string, unknown>) =>
        sequence_([
          writeFile(`src/${String(answers.name ?? "a")}.ts`, "a"),
          writeFile(`src/${String(answers.name ?? "b")}.test.ts`, "b"),
        ]),
    };
    const result = await executeGenerator(
      multiGen,
      { name: "Button", undo: true, dryRun: true, yes: true },
      baseCtx,
    );
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("2 steps");
    }
  });

  it("shows nothing to undo when generator has no undo tasks", async () => {
    const noUndoGen: GeneratorDefinition = {
      meta: { name: "no-undo", description: "No undo gen", version: "1.0.0" },
      prompts: [{ name: "name", message: "Name", type: "text" }],
      generate: () => ({
        _tag: "Pure" as const,
        value: undefined,
      }),
    };
    const result = await executeGenerator(
      noUndoGen,
      { name: "Button", undo: true, dryRun: true, yes: true },
      baseCtx,
    );
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("Nothing to undo.");
    }
  });
});

// =============================================================================
// Undo execution mode
// =============================================================================

describe("executeGenerator — undo execution", () => {
  it("executes undo and reports step count", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-undo-exec-"));

    try {
      const gen = makeGen(simplePrompts);
      // First run to create the file
      await executeGenerator(gen, { name: "Button" }, { ...baseCtx, cwd: dir });

      // Then undo
      const result = await executeGenerator(
        gen,
        { name: "Button", undo: true, yes: true },
        { ...baseCtx, cwd: dir },
      );
      expect(result.tag).toBe("output");
      if (result.tag === "output") {
        const text = result.render.plain(result.value);
        expect(text).toContain("Undo complete");
        expect(text).toContain("reversed");
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports nothing to undo for pure task", async () => {
    const noUndoGen: GeneratorDefinition = {
      meta: { name: "no-undo", description: "No undo gen", version: "1.0.0" },
      prompts: [{ name: "name", message: "Name", type: "text" }],
      generate: () => ({
        _tag: "Pure" as const,
        value: undefined,
      }),
    };
    const result = await executeGenerator(
      noUndoGen,
      { name: "Button", undo: true, yes: true },
      baseCtx,
    );
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("Nothing to undo.");
    }
  });

  it("undoes in cwd without chdir when cwd matches process.cwd()", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-undo-samecwd-"));
    const originalCwd = process.cwd();
    process.chdir(dir);

    try {
      const gen = makeGen(simplePrompts);
      await executeGenerator(gen, { name: "Button" }, { ...baseCtx, cwd: dir });

      const result = await executeGenerator(
        gen,
        { name: "Button", undo: true, yes: true },
        { ...baseCtx, cwd: dir },
      );
      expect(result.tag).toBe("output");
      if (result.tag === "output") {
        expect(result.render.plain(result.value)).toContain("Undo complete");
      }
    } finally {
      process.chdir(originalCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("pluralizes step count for multi-step undo execution", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-undo-multi-"));

    try {
      const multiGen: GeneratorDefinition = {
        meta: {
          name: "multi-undo",
          description: "Multi undo",
          version: "1.0.0",
        },
        prompts: [{ name: "name", message: "Name", type: "text" }],
        generate: (answers: Record<string, unknown>) =>
          sequence_([
            writeFile(`src/${String(answers.name ?? "a")}.ts`, "a"),
            writeFile(`src/${String(answers.name ?? "b")}.test.ts`, "b"),
          ]),
      };
      // First run forward to create files
      await executeGenerator(
        multiGen,
        { name: "Button" },
        { ...baseCtx, cwd: dir },
      );

      // Then undo
      const result = await executeGenerator(
        multiGen,
        { name: "Button", undo: true, yes: true },
        { ...baseCtx, cwd: dir },
      );
      expect(result.tag).toBe("output");
      if (result.tag === "output") {
        const text = result.render.plain(result.value);
        expect(text).toContain("2 steps reversed");
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("handles non-Error throws during undo", async () => {
    const failGen: GeneratorDefinition = {
      meta: {
        name: "fail-undo-str",
        description: "Fail undo string",
        version: "1.0.0",
      },
      prompts: [{ name: "name", message: "Name", type: "text" }],
      generate: () => ({
        _tag: "Effect" as const,
        effect: {
          _tag: "WriteFile" as const,
          path: "test.ts",
          content: "x",
          undo: {
            _tag: "Effect" as const,
            effect: { _tag: "Exec" as const, command: "false", args: [] },
            cont: () => {
              throw "string-error";
            },
          },
        },
        cont: () => ({ _tag: "Pure" as const, value: undefined }),
      }),
    };
    const result = await executeGenerator(
      failGen,
      { name: "Button", undo: true, yes: true },
      baseCtx,
    );
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("Undo failed:");
    }
  });

  it("reports error when undo fails", async () => {
    const failGen: GeneratorDefinition = {
      meta: {
        name: "fail-undo",
        description: "Fail undo gen",
        version: "1.0.0",
      },
      prompts: [{ name: "name", message: "Name", type: "text" }],
      generate: () => ({
        _tag: "Effect" as const,
        effect: {
          _tag: "WriteFile" as const,
          path: "test.ts",
          content: "x",
          undo: {
            _tag: "Fail" as const,
            error: "Simulated undo failure",
          },
        },
        cont: () => ({ _tag: "Pure" as const, value: undefined }),
      }),
    };
    const result = await executeGenerator(
      failGen,
      { name: "Button", undo: true, yes: true },
      baseCtx,
    );
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("Undo failed:");
    }
  });
});

// =============================================================================
// Answer validation
// =============================================================================

describe("executeGenerator — answer validation", () => {
  const selectPrompts: PromptDefinition[] = [
    {
      name: "kind",
      message: "Kind",
      type: "select",
      choices: [
        { label: "Library", value: "library" },
        { label: "Tool", value: "tool-ts" },
      ],
    },
  ];

  const validatedPrompts: PromptDefinition[] = [
    {
      name: "target",
      message: "Target",
      type: "text",
      validate: (value) =>
        typeof value === "string" && value.length > 0
          ? true
          : "Target is required",
    },
  ];

  it("rejects a select value outside its choices and exits 3", async () => {
    const gen = makeGen(selectPrompts);
    const result = await executeGenerator(
      gen,
      { kind: "bogus", yes: true },
      llmCtx,
    );
    expect(result).toEqual({ tag: "exit", code: 3 });
  });

  it("accepts a valid select value", async () => {
    const gen = makeGen(selectPrompts);
    const result = await executeGenerator(
      gen,
      { kind: "library", yes: true },
      llmCtx,
    );
    expect(result.tag).toBe("output");
  });

  it("rejects a value its prompt validator refuses and exits 3", async () => {
    const gen = makeGen(validatedPrompts);
    const result = await executeGenerator(
      gen,
      { target: "", yes: true },
      llmCtx,
    );
    expect(result).toEqual({ tag: "exit", code: 3 });
  });

  it("uses a generic message when the validator returns a non-string falsy verdict", async () => {
    const gen = makeGen([
      {
        name: "target",
        message: "Target",
        type: "text",
        validate: () => false,
      },
    ]);
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
      const result = await executeGenerator(
        gen,
        { target: "anything", yes: true },
        llmCtx,
      );
      expect(result).toEqual({ tag: "exit", code: 3 });
      expect(stderr).toHaveBeenCalledWith(
        expect.stringContaining("invalid value"),
      );
    } finally {
      stderr.mockRestore();
    }
  });

  it("passes a valid answer through its prompt validator", async () => {
    const gen = makeGen(validatedPrompts);
    const result = await executeGenerator(
      gen,
      { target: "ok", yes: true },
      llmCtx,
    );
    expect(result.tag).toBe("output");
  });

  it("skips validation for a when-gated prompt whose gate is off", async () => {
    const gen = makeGen([
      {
        name: "advanced",
        message: "Advanced?",
        type: "confirm",
        default: false,
      },
      {
        name: "level",
        message: "Level",
        type: "select",
        choices: [{ label: "High", value: "high" }],
        when: (a) => a.advanced === true,
      },
    ]);
    // `level` carries an out-of-choices value but its gate is off, so it must
    // not be validated.
    const result = await executeGenerator(
      gen,
      { advanced: false, level: "bogus", yes: true },
      llmCtx,
    );
    expect(result.tag).toBe("output");
  });
});
