import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import { writeFile } from "@canonical/task";
import { describe, expect, it } from "vitest";
import executeGenerator from "./executeGenerator.js";
import type { CommandContext } from "./types.js";

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
});

// =============================================================================
// Interactive fallback
// =============================================================================

describe("executeGenerator — interactive", () => {
  it("returns interactive result when missing required answers", async () => {
    const gen = makeGen(simplePrompts);
    const result = await executeGenerator(gen, {}, baseCtx);
    expect(result.tag).toBe("interactive");
    if (result.tag === "interactive") {
      expect(result.spec.generator).toBe(gen);
      expect(result.spec.partialAnswers).toEqual({});
    }
  });

  it("passes partial answers through", async () => {
    const gen = makeGen([
      { name: "name", message: "Name", type: "text" },
      { name: "path", message: "Path", type: "text" },
    ]);
    const result = await executeGenerator(gen, { name: "Button" }, baseCtx);
    expect(result.tag).toBe("interactive");
    if (result.tag === "interactive") {
      expect(result.spec.partialAnswers).toEqual({ name: "Button" });
    }
  });

  it("includes stamp config when generatedStamp is not false", async () => {
    const gen = makeGen(simplePrompts);
    const result = await executeGenerator(gen, {}, baseCtx);
    if (result.tag === "interactive") {
      expect(result.spec.options.stamp).toEqual({
        generator: "test-gen",
        version: "1.0.0",
      });
    }
  });

  it("excludes stamp when generatedStamp is false", async () => {
    const gen = makeGen(simplePrompts);
    const result = await executeGenerator(
      gen,
      { generatedStamp: false },
      baseCtx,
    );
    if (result.tag === "interactive") {
      expect(result.spec.options.stamp).toBeUndefined();
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
      expect(readFileSync(outputFile, "utf-8")).toBe("export {};\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prefers interactive mode in a TTY when only defaults would be used", async () => {
    const gen = makeGen([
      {
        name: "name",
        message: "Component name",
        type: "text",
        default: "Button",
      },
    ]);

    const stdinDescriptor = Object.getOwnPropertyDescriptor(
      process.stdin,
      "isTTY",
    );
    const stdoutDescriptor = Object.getOwnPropertyDescriptor(
      process.stdout,
      "isTTY",
    );

    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      configurable: true,
      value: true,
    });

    try {
      const result = await executeGenerator(gen, {}, baseCtx);
      expect(result.tag).toBe("interactive");
    } finally {
      if (stdinDescriptor) {
        Object.defineProperty(process.stdin, "isTTY", stdinDescriptor);
      }
      if (stdoutDescriptor) {
        Object.defineProperty(process.stdout, "isTTY", stdoutDescriptor);
      }
    }
  });

  it("prefers interactive mode in a TTY even when some answers were provided", async () => {
    const gen = makeGen(simplePrompts);

    const stdinDescriptor = Object.getOwnPropertyDescriptor(
      process.stdin,
      "isTTY",
    );
    const stdoutDescriptor = Object.getOwnPropertyDescriptor(
      process.stdout,
      "isTTY",
    );

    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      configurable: true,
      value: true,
    });

    try {
      const result = await executeGenerator(gen, { name: "Button" }, baseCtx);
      expect(result.tag).toBe("interactive");
    } finally {
      if (stdinDescriptor) {
        Object.defineProperty(process.stdin, "isTTY", stdinDescriptor);
      }
      if (stdoutDescriptor) {
        Object.defineProperty(process.stdout, "isTTY", stdoutDescriptor);
      }
    }
  });
});

// =============================================================================
// Confirm flag extraction
// =============================================================================

describe("executeGenerator — confirm extraction", () => {
  it("skips confirm when value matches default", async () => {
    const gen = makeGen(promptsWithDefault);
    // withTests default is true, pass true → should not be in partialAnswers
    const result = await executeGenerator(gen, { withTests: true }, baseCtx);
    if (result.tag === "interactive") {
      expect(result.spec.partialAnswers).not.toHaveProperty("withTests");
    }
  });

  it("includes confirm when value differs from default", async () => {
    const gen = makeGen(promptsWithDefault);
    // withTests default is true, pass false → should be in partialAnswers
    const result = await executeGenerator(gen, { withTests: false }, baseCtx);
    if (result.tag === "interactive") {
      expect(result.spec.partialAnswers.withTests).toBe(false);
    }
  });
});

// =============================================================================
// Multiselect comma split
// =============================================================================

describe("executeGenerator — multiselect", () => {
  it("splits comma-separated string into array", async () => {
    const gen = makeGen(multiselectPrompts);
    const result = await executeGenerator(
      gen,
      { name: "X", features: "a,b" },
      baseCtx,
    );
    // Should have all answers (name + features) → dry-run not set, so interactive
    if (result.tag === "interactive") {
      expect(result.spec.partialAnswers.features).toEqual(["a", "b"]);
    }
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
