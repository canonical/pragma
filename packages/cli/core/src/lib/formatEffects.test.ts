import type { Effect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import {
  buildReplayCommand,
  formatContentPreview,
  formatEffectLine,
  formatEffectWithContent,
  formatLlmHelp,
  formatLlmJson,
  formatLlmMarkdown,
  getActionColor,
  getActionLabel,
  getEffectPayload,
  getLanguageHint,
  getLlmActionLabel,
  getLlmEffectPath,
  isVisibleEffect,
} from "./formatEffects.js";

// =============================================================================
// Test fixtures
// =============================================================================

const writeFile: Effect = {
  _tag: "WriteFile",
  path: "src/index.ts",
  content: "export {};\n",
};
const appendFile: Effect = {
  _tag: "AppendFile",
  path: "log.txt",
  content: "line\n",
  createIfMissing: true,
};
const makeDir: Effect = { _tag: "MakeDir", path: "src/lib", recursive: true };
const copyFile: Effect = { _tag: "CopyFile", source: "a.ts", dest: "b.ts" };
const copyDir: Effect = { _tag: "CopyDirectory", source: "src", dest: "dist" };
const deleteFile: Effect = { _tag: "DeleteFile", path: "old.ts" };
const deleteDir: Effect = { _tag: "DeleteDirectory", path: "old/" };
const exec: Effect = { _tag: "Exec", command: "npm", args: ["install"] };
const symlink: Effect = {
  _tag: "Symlink",
  target: "../shared/utils",
  path: "src/utils",
};
const logInfo: Effect = { _tag: "Log", level: "info", message: "Installing" };
const logDebug: Effect = {
  _tag: "Log",
  level: "debug",
  message: "Verbose detail",
};
const logWarn: Effect = { _tag: "Log", level: "warn", message: "Heads up" };
const logError: Effect = { _tag: "Log", level: "error", message: "Failed" };
const readFile: Effect = { _tag: "ReadFile", path: "foo.ts" };
const prompt: Effect = {
  _tag: "Prompt",
  question: { type: "text", name: "q", message: "?" },
};
const existsEff: Effect = { _tag: "Exists", path: "foo" };

const mockGen = {
  meta: { name: "test-gen", description: "A test generator", version: "1.0.0" },
  prompts: [
    { name: "name", message: "Component name", type: "text" as const },
    {
      name: "withTests",
      message: "Include tests?",
      type: "confirm" as const,
      default: true,
    },
    {
      name: "style",
      message: "Style engine",
      type: "select" as const,
      choices: [
        { label: "CSS", value: "css" },
        { label: "SCSS", value: "scss" },
      ],
    },
    {
      name: "features",
      message: "Features",
      type: "multiselect" as const,
      choices: [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ],
    },
  ],
  generate: () => ({ _tag: "Pure" as const, value: undefined }),
};

// =============================================================================
// isVisibleEffect
// =============================================================================

describe("isVisibleEffect", () => {
  it("returns true for user-visible effects", () => {
    for (const effect of [
      writeFile,
      appendFile,
      makeDir,
      copyFile,
      copyDir,
      deleteFile,
      deleteDir,
      exec,
      symlink,
      logInfo,
    ]) {
      expect(isVisibleEffect(effect)).toBe(true);
    }
  });

  it("returns false for internal effects", () => {
    for (const effect of [readFile, prompt, existsEff]) {
      expect(isVisibleEffect(effect)).toBe(false);
    }
  });

  it("hides debug logs by default, shows with verbose", () => {
    expect(isVisibleEffect(logDebug)).toBe(false);
    expect(isVisibleEffect(logDebug, true)).toBe(true);
  });

  it("shows Symlink effects", () => {
    expect(isVisibleEffect(symlink)).toBe(true);
  });

  it("hides Glob, ReadContext, WriteContext, Parallel, Race effects", () => {
    const glob: Effect = { _tag: "Glob", pattern: "**/*.ts", cwd: "." };
    const readCtx: Effect = { _tag: "ReadContext", key: "k" };
    const writeCtx: Effect = { _tag: "WriteContext", key: "k", value: "v" };
    const parallel: Effect = { _tag: "Parallel", tasks: [] };
    const race: Effect = { _tag: "Race", tasks: [] };
    expect(isVisibleEffect(glob)).toBe(false);
    expect(isVisibleEffect(readCtx)).toBe(false);
    expect(isVisibleEffect(writeCtx)).toBe(false);
    expect(isVisibleEffect(parallel)).toBe(false);
    expect(isVisibleEffect(race)).toBe(false);
  });

  it("shows warn and error log effects", () => {
    expect(isVisibleEffect(logWarn)).toBe(true);
    expect(isVisibleEffect(logError)).toBe(true);
  });
});

// =============================================================================
// getActionLabel
// =============================================================================

describe("getActionLabel", () => {
  it.each([
    [writeFile, "Create file"],
    [appendFile, "Append to"],
    [makeDir, "Create dir"],
    [copyFile, "Copy file"],
    [copyDir, "Copy dir"],
    [deleteFile, "Delete file"],
    [deleteDir, "Delete dir"],
    [exec, "Execute"],
    [symlink, "Symlink"],
    [logInfo, "Info"],
    [logDebug, "Debug"],
    [logWarn, "Warning"],
    [logError, "Error"],
  ])("returns correct label for %s", (effect, expected) => {
    expect(getActionLabel(effect as Effect)).toBe(expected);
  });

  it("returns Log for unknown log level", () => {
    const unknownLog: Effect = {
      _tag: "Log",
      level: "trace" as never,
      message: "x",
    };
    expect(getActionLabel(unknownLog)).toBe("Log");
  });

  it("returns tag name for unknown effect types", () => {
    const unknownEffect = { _tag: "ReadFile", path: "foo" } as Effect;
    expect(getActionLabel(unknownEffect)).toBe("ReadFile");
  });
});

// =============================================================================
// getActionColor
// =============================================================================

describe("getActionColor", () => {
  it.each([
    [writeFile, "green"],
    [makeDir, "green"],
    [appendFile, "magenta"],
    [deleteFile, "red"],
    [deleteDir, "red"],
    [copyFile, "cyan"],
    [copyDir, "cyan"],
    [exec, "yellow"],
    [symlink, "cyan"],
    [logError, "red"],
    [logWarn, "yellow"],
    [logInfo, "blue"],
    [logDebug, undefined],
  ])("returns correct color for %s", (effect, expected) => {
    expect(getActionColor(effect as Effect)).toBe(expected);
  });

  it("returns undefined for unknown effect types", () => {
    const unknownEffect = { _tag: "ReadFile", path: "foo" } as Effect;
    expect(getActionColor(unknownEffect)).toBeUndefined();
  });
});

// =============================================================================
// getEffectPayload
// =============================================================================

describe("getEffectPayload", () => {
  it("returns path for file effects", () => {
    expect(getEffectPayload(writeFile)).toBe("src/index.ts");
    expect(getEffectPayload(deleteFile)).toBe("old.ts");
  });

  it("returns path for appendFile, makeDir, deleteDir", () => {
    expect(getEffectPayload(appendFile)).toBe("log.txt");
    expect(getEffectPayload(makeDir)).toBe("src/lib");
    expect(getEffectPayload(deleteDir)).toBe("old/");
  });

  it("returns source → dest for copy effects", () => {
    expect(getEffectPayload(copyFile)).toBe("a.ts → b.ts");
    expect(getEffectPayload(copyDir)).toBe("src/ → dist/");
  });

  it("returns target → path for symlink", () => {
    expect(getEffectPayload(symlink)).toBe("../shared/utils → src/utils");
  });

  it("returns command for exec", () => {
    expect(getEffectPayload(exec)).toBe("npm install");
  });

  it("returns message for log", () => {
    expect(getEffectPayload(logInfo)).toBe("Installing");
  });

  it("returns tag name for unknown effect types", () => {
    const unknownEffect = { _tag: "ReadFile", path: "foo" } as Effect;
    expect(getEffectPayload(unknownEffect)).toBe("ReadFile");
  });
});

// =============================================================================
// formatEffectLine
// =============================================================================

describe("formatEffectLine", () => {
  it("uses ├─ for non-last items", () => {
    const line = formatEffectLine(writeFile, false);
    expect(line).toContain("├─");
    expect(line).toContain("src/index.ts");
  });

  it("uses └─ for last item", () => {
    const line = formatEffectLine(writeFile, true);
    expect(line).toContain("└─");
  });

  it("includes action label and payload", () => {
    const line = formatEffectLine(exec, false);
    expect(line).toContain("Execute");
    expect(line).toContain("npm install");
  });

  it("uses identity function for effects with no color", () => {
    const line = formatEffectLine(logDebug, false);
    expect(line).toContain("Debug");
    expect(line).toContain("Verbose detail");
  });
});

// =============================================================================
// formatEffectWithContent
// =============================================================================

describe("formatEffectWithContent", () => {
  it("shows content preview for WriteFile", () => {
    const result = formatEffectWithContent(writeFile, false);
    expect(result).toContain("src/index.ts");
    expect(result).toContain("export {};");
  });

  it("shows content preview for AppendFile", () => {
    const result = formatEffectWithContent(appendFile, true);
    expect(result).toContain("log.txt");
    expect(result).toContain("line");
  });

  it("shows no content for Exec", () => {
    const result = formatEffectWithContent(exec, true);
    expect(result).toBe(formatEffectLine(exec, true));
  });

  it("uses pipe indent for non-last items", () => {
    const result = formatEffectWithContent(writeFile, false);
    expect(result).toContain("│");
  });
});

// =============================================================================
// formatContentPreview
// =============================================================================

describe("formatContentPreview", () => {
  it("shows line numbers", () => {
    const result = formatContentPreview("line1\nline2\nline3");
    expect(result).toContain("1");
    expect(result).toContain("line1");
    expect(result).toContain("3");
    expect(result).toContain("line3");
  });

  it("truncates at maxLines", () => {
    const content = Array.from({ length: 10 }, (_, i) => `line${i + 1}`).join(
      "\n",
    );
    const result = formatContentPreview(content, 3);
    expect(result).toContain("line1");
    expect(result).toContain("line3");
    expect(result).toContain("7 more lines omitted");
    expect(result).not.toContain("line4");
  });

  it("truncates long lines exceeding MAX_LINE_WIDTH", () => {
    const longLine = "x".repeat(200);
    const result = formatContentPreview(longLine);
    expect(result).toContain("...");
  });
});

// =============================================================================
// getLanguageHint
// =============================================================================

describe("getLanguageHint", () => {
  it("maps known extensions", () => {
    expect(getLanguageHint("foo.ts")).toBe("ts");
    expect(getLanguageHint("bar.py")).toBe("python");
    expect(getLanguageHint("baz.json")).toBe("json");
    expect(getLanguageHint("style.css")).toBe("css");
  });

  it('returns "" for unknown extensions', () => {
    expect(getLanguageHint("file.xyz")).toBe("");
    expect(getLanguageHint("noext")).toBe("");
  });
});

// =============================================================================
// getLlmActionLabel / getLlmEffectPath
// =============================================================================

describe("getLlmActionLabel", () => {
  it("returns lowercase labels for LLM output", () => {
    expect(getLlmActionLabel(writeFile)).toBe("create");
    expect(getLlmActionLabel(appendFile)).toBe("append");
    expect(getLlmActionLabel(makeDir)).toBe("mkdir");
    expect(getLlmActionLabel(copyFile)).toBe("copy");
    expect(getLlmActionLabel(copyDir)).toBe("copy-dir");
    expect(getLlmActionLabel(deleteFile)).toBe("delete");
    expect(getLlmActionLabel(deleteDir)).toBe("rmdir");
    expect(getLlmActionLabel(exec)).toBe("exec");
    expect(getLlmActionLabel(symlink)).toBe("symlink");
    expect(getLlmActionLabel(logInfo)).toBe("info");
  });

  it("returns lowercased tag name for unknown effect types", () => {
    const unknownEffect = { _tag: "ReadFile", path: "foo" } as Effect;
    expect(getLlmActionLabel(unknownEffect)).toBe("readfile");
  });
});

describe("getLlmEffectPath", () => {
  it("returns path for file effects", () => {
    expect(getLlmEffectPath(writeFile)).toBe("src/index.ts");
    expect(getLlmEffectPath(appendFile)).toBe("log.txt");
    expect(getLlmEffectPath(makeDir)).toBe("src/lib");
    expect(getLlmEffectPath(deleteFile)).toBe("old.ts");
    expect(getLlmEffectPath(deleteDir)).toBe("old/");
  });

  it("returns source -> dest for copy effects", () => {
    expect(getLlmEffectPath(copyFile)).toBe("a.ts -> b.ts");
    expect(getLlmEffectPath(copyDir)).toBe("src/ -> dist/");
  });

  it("returns target -> path for symlink", () => {
    expect(getLlmEffectPath(symlink)).toBe("../shared/utils -> src/utils");
  });

  it("returns command string for exec", () => {
    expect(getLlmEffectPath(exec)).toBe("npm install");
  });

  it("returns message for log", () => {
    expect(getLlmEffectPath(logInfo)).toBe("Installing");
  });

  it("returns empty string for unknown effect types", () => {
    const unknownEffect = { _tag: "ReadFile", path: "foo" } as Effect;
    expect(getLlmEffectPath(unknownEffect)).toBe("");
  });
});

// =============================================================================
// formatLlmMarkdown
// =============================================================================

describe("formatLlmMarkdown", () => {
  it("includes header, answers table, plan, files, and footer", () => {
    const effects: Effect[] = [writeFile, makeDir];
    const answers = { name: "Button" };
    const result = formatLlmMarkdown(mockGen, answers, effects);

    expect(result).toContain("# test-gen");
    expect(result).toContain("> A test generator");
    expect(result).toContain("## Answers");
    expect(result).toContain("| name | Button |");
    expect(result).toContain("## Plan");
    expect(result).toContain("| create | src/index.ts |");
    expect(result).toContain("## Files");
    expect(result).toContain("### src/index.ts");
    expect(result).toContain("```ts");
    expect(result).toContain("Dry-run complete.");
  });

  it("includes Symlink in plan table", () => {
    const result = formatLlmMarkdown(mockGen, {}, [symlink]);
    expect(result).toContain("| symlink | ../shared/utils -> src/utils |");
  });

  it("deduplicates MakeDir effects in plan table", () => {
    const effects: Effect[] = [makeDir, makeDir, writeFile];
    const result = formatLlmMarkdown(mockGen, { name: "X" }, effects);
    const lines = result
      .split("\n")
      .filter((l: string) => l.includes("| mkdir |"));
    expect(lines).toHaveLength(1);
  });

  it("omits Answers section when no answers given", () => {
    const result = formatLlmMarkdown(mockGen, {}, [writeFile]);
    expect(result).not.toContain("## Answers");
  });

  it("includes AppendFile in files section", () => {
    const result = formatLlmMarkdown(mockGen, {}, [appendFile]);
    expect(result).toContain("### log.txt");
    expect(result).toContain("line");
  });

  it("renders array answer values as comma-separated", () => {
    const result = formatLlmMarkdown(mockGen, { features: ["a", "b"] }, [
      writeFile,
    ]);
    expect(result).toContain("| features | a, b |");
  });

  it("includes verbose debug effects when verbose is true", () => {
    const result = formatLlmMarkdown(mockGen, {}, [logDebug], true);
    expect(result).toContain("debug");
    expect(result).toContain("Verbose detail");
  });

  it("omits Plan and Files sections when no visible effects", () => {
    const result = formatLlmMarkdown(mockGen, { name: "X" }, [readFile]);
    expect(result).not.toContain("## Plan");
    expect(result).not.toContain("## Files");
    expect(result).toContain("Dry-run complete.");
  });
});

// =============================================================================
// formatLlmJson
// =============================================================================

describe("formatLlmJson", () => {
  it("returns structured object", () => {
    const effects: Effect[] = [writeFile];
    const answers = { name: "Button" };
    const result = formatLlmJson(mockGen, answers, effects);

    expect(result).toHaveProperty("generator.name", "test-gen");
    expect(result).toHaveProperty("answers.name", "Button");
    expect(result).toHaveProperty("plan");
    expect(result).toHaveProperty("files");
    expect(result).toHaveProperty("executeCommand");
  });

  it("includes Symlink in plan", () => {
    const result = formatLlmJson(mockGen, {}, [symlink]);
    const plan = result.plan as Array<Record<string, unknown>>;
    expect(plan[0]).toEqual({
      action: "symlink",
      path: "../shared/utils -> src/utils",
    });
  });

  it("deduplicates MakeDir effects with the same path", () => {
    const effects: Effect[] = [makeDir, makeDir, writeFile];
    const result = formatLlmJson(mockGen, {}, effects);
    const plan = result.plan as Array<Record<string, unknown>>;
    const mkdirEntries = plan.filter((e) => e.action === "mkdir");
    expect(mkdirEntries).toHaveLength(1);
  });
});

// =============================================================================
// buildReplayCommand
// =============================================================================

describe("buildReplayCommand", () => {
  it("builds replay command with flags", () => {
    const answers = { name: "Button", withTests: false };
    const result = buildReplayCommand("test-gen", answers, mockGen.prompts);
    expect(result).toBe("summon test-gen --name Button --no-with-tests --yes");
  });

  it("handles multiselect values", () => {
    const answers = { features: ["a", "b"] };
    const result = buildReplayCommand("test-gen", answers, mockGen.prompts);
    expect(result).toContain("--features a,b");
    expect(result).toContain("--yes");
  });

  it("skips confirm flags when value matches default", () => {
    // withTests has default: true, value is true → skip
    const answers = { withTests: true };
    const result = buildReplayCommand("test-gen", answers, mockGen.prompts);
    expect(result).not.toContain("--with-tests");
    expect(result).not.toContain("--no-with-tests");
  });

  it("adds confirm flag when value is true and default is not true", () => {
    const prompts = [
      {
        name: "verbose" as const,
        message: "Verbose?",
        type: "confirm" as const,
        default: false,
      },
    ];
    const answers = { verbose: true };
    const result = buildReplayCommand("test-gen", answers, prompts);
    expect(result).toContain("--verbose");
    expect(result).not.toContain("--no-verbose");
  });

  it("skips empty multiselect values", () => {
    const answers = { features: [] as string[] };
    const result = buildReplayCommand("test-gen", answers, mockGen.prompts);
    expect(result).not.toContain("--features");
  });
});

// =============================================================================
// formatLlmHelp
// =============================================================================

describe("formatLlmHelp", () => {
  it("uses commandPath directly in header", () => {
    const result = formatLlmHelp(mockGen, "summon test-gen");
    expect(result).toContain("# summon test-gen");
  });

  it("includes required and optional sections", () => {
    const result = formatLlmHelp(mockGen, "test-gen");
    expect(result).toContain("## Required Options");
    expect(result).toContain("--name");
    expect(result).toContain("## Optional Options");
    expect(result).toContain("--with-tests");
  });

  it("includes global options and workflow", () => {
    const result = formatLlmHelp(mockGen, "test-gen");
    expect(result).toContain("## Global Options");
    expect(result).toContain("## Workflow");
    expect(result).toContain("--llm");
    expect(result).toContain("--yes");
  });

  it("includes meta.help when present", () => {
    const genWithHelp = {
      ...mockGen,
      meta: { ...mockGen.meta, help: "Extended help text for the generator." },
    };
    const result = formatLlmHelp(genWithHelp, "test-gen");
    expect(result).toContain("Extended help text for the generator.");
  });

  it("includes meta.examples when present", () => {
    const genWithExamples = {
      ...mockGen,
      meta: {
        ...mockGen.meta,
        examples: [
          "test-gen --name Button",
          "test-gen --name Card --style scss",
        ],
      },
    };
    const result = formatLlmHelp(genWithExamples, "test-gen");
    expect(result).toContain("## Examples");
    expect(result).toContain("test-gen --name Button");
    expect(result).toContain("test-gen --name Card --style scss");
  });

  it("shows multiselect type hint in required options", () => {
    const genWithRequiredMulti = {
      ...mockGen,
      prompts: [
        {
          name: "items",
          message: "Items to select",
          type: "multiselect" as const,
          choices: [
            { label: "A", value: "a" },
            { label: "B", value: "b" },
          ],
        },
      ],
    };
    const result = formatLlmHelp(genWithRequiredMulti, "test-gen");
    expect(result).toContain("[value,value,...]");
  });

  it("shows select type hint with pipe-separated values", () => {
    const genWithRequiredSelect = {
      ...mockGen,
      prompts: [
        {
          name: "style",
          message: "Style",
          type: "select" as const,
          choices: [
            { label: "CSS", value: "css" },
            { label: "SCSS", value: "scss" },
          ],
        },
      ],
    };
    const result = formatLlmHelp(genWithRequiredSelect, "test-gen");
    expect(result).toContain("css\\|scss");
  });

  it("shows confirm type hint in optional options", () => {
    const genWithConfirmDefault = {
      ...mockGen,
      prompts: [
        {
          name: "verbose",
          message: "Verbose?",
          type: "confirm" as const,
          default: false,
        },
      ],
    };
    const result = formatLlmHelp(genWithConfirmDefault, "test-gen");
    expect(result).toContain("[boolean]");
  });

  it("includes optional options with when conditions", () => {
    const genWithWhen = {
      ...mockGen,
      prompts: [
        { name: "name", message: "Name", type: "text" as const },
        {
          name: "path",
          message: "Path",
          type: "text" as const,
          when: () => true,
        },
      ],
    };
    const result = formatLlmHelp(genWithWhen, "test-gen");
    expect(result).toContain("## Required Options");
    expect(result).toContain("## Optional Options");
  });
});
