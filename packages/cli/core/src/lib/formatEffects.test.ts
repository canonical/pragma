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
});

// =============================================================================
// getEffectPayload
// =============================================================================

describe("getEffectPayload", () => {
  it("returns path for file effects", () => {
    expect(getEffectPayload(writeFile)).toBe("src/index.ts");
    expect(getEffectPayload(deleteFile)).toBe("old.ts");
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

  it("shows no content for Exec", () => {
    const result = formatEffectWithContent(exec, true);
    expect(result).toBe(formatEffectLine(exec, true));
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
    expect(getLlmActionLabel(symlink)).toBe("symlink");
    expect(getLlmActionLabel(exec)).toBe("exec");
  });
});

describe("getLlmEffectPath", () => {
  it("returns path for file effects", () => {
    expect(getLlmEffectPath(writeFile)).toBe("src/index.ts");
  });

  it("returns target -> path for symlink", () => {
    expect(getLlmEffectPath(symlink)).toBe("../shared/utils -> src/utils");
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
});
