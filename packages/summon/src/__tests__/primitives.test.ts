import { describe, expect, it } from "vitest";
import { dryRun, dryRunWith } from "../dry-run.js";
import {
  copyDirectory,
  copyFile,
  debug,
  deleteDirectory,
  deleteFile,
  error,
  exec,
  execSimple,
  exists,
  getContext,
  glob,
  info,
  log,
  mkdir,
  noop,
  prompt,
  promptConfirm,
  promptMultiselect,
  promptSelect,
  promptText,
  readFile,
  setContext,
  sortFileLines,
  succeed,
  warn,
  withContext,
  writeFile,
} from "../primitives.js";
import { flatMap } from "../task.js";

// =============================================================================
// File System Primitives
// =============================================================================

describe("Primitives - File System", () => {
  describe("readFile", () => {
    it("creates a ReadFile effect", () => {
      const task = readFile("/path/to/file.txt");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("ReadFile");
      expect((effects[0] as { path: string }).path).toBe("/path/to/file.txt");
    });

    it("returns mock content in dry run", () => {
      const task = readFile("/test.txt");
      const { value } = dryRun(task);

      expect(value).toBe("[mock content of /test.txt]");
    });

    it("handles absolute paths", () => {
      const task = readFile("/absolute/path/file.ts");
      const { effects } = dryRun(task);
      expect((effects[0] as { path: string }).path).toBe(
        "/absolute/path/file.ts",
      );
    });

    it("handles relative paths", () => {
      const task = readFile("./relative/file.ts");
      const { effects } = dryRun(task);
      expect((effects[0] as { path: string }).path).toBe("./relative/file.ts");
    });

    it("handles paths with spaces", () => {
      const task = readFile("/path/with spaces/file.txt");
      const { effects } = dryRun(task);
      expect((effects[0] as { path: string }).path).toBe(
        "/path/with spaces/file.txt",
      );
    });
  });

  describe("writeFile", () => {
    it("creates a WriteFile effect", () => {
      const task = writeFile("/path/to/file.txt", "Hello, World!");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("WriteFile");
      expect((effects[0] as { path: string }).path).toBe("/path/to/file.txt");
      expect((effects[0] as { content: string }).content).toBe("Hello, World!");
    });

    it("handles empty content", () => {
      const task = writeFile("/empty.txt", "");
      const { effects } = dryRun(task);
      expect((effects[0] as { content: string }).content).toBe("");
    });

    it("handles multiline content", () => {
      const content = "line1\nline2\nline3";
      const task = writeFile("/multiline.txt", content);
      const { effects } = dryRun(task);
      expect((effects[0] as { content: string }).content).toBe(content);
    });

    it("handles content with special characters", () => {
      const content = 'const x = "hello"; // comment\n\t@decorator';
      const task = writeFile("/code.ts", content);
      const { effects } = dryRun(task);
      expect((effects[0] as { content: string }).content).toBe(content);
    });

    it("handles JSON content", () => {
      const json = JSON.stringify({ key: "value", arr: [1, 2, 3] }, null, 2);
      const task = writeFile("/data.json", json);
      const { effects } = dryRun(task);
      expect((effects[0] as { content: string }).content).toBe(json);
    });
  });

  describe("copyFile", () => {
    it("creates a CopyFile effect", () => {
      const task = copyFile("/source.txt", "/dest.txt");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("CopyFile");
      expect((effects[0] as { source: string }).source).toBe("/source.txt");
      expect((effects[0] as { dest: string }).dest).toBe("/dest.txt");
    });
  });

  describe("copyDirectory", () => {
    it("creates a CopyDirectory effect", () => {
      const task = copyDirectory("/source/dir", "/dest/dir");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("CopyDirectory");
      expect((effects[0] as { source: string }).source).toBe("/source/dir");
      expect((effects[0] as { dest: string }).dest).toBe("/dest/dir");
    });
  });

  describe("deleteFile", () => {
    it("creates a DeleteFile effect", () => {
      const task = deleteFile("/path/to/delete.txt");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("DeleteFile");
      expect((effects[0] as { path: string }).path).toBe("/path/to/delete.txt");
    });
  });

  describe("deleteDirectory", () => {
    it("creates a DeleteDirectory effect", () => {
      const task = deleteDirectory("/path/to/delete/dir");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("DeleteDirectory");
      expect((effects[0] as { path: string }).path).toBe("/path/to/delete/dir");
    });
  });

  describe("mkdir", () => {
    it("creates a MakeDir effect with recursive true by default", () => {
      const task = mkdir("/path/to/dir");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("MakeDir");
      expect((effects[0] as { path: string }).path).toBe("/path/to/dir");
      expect((effects[0] as { recursive: boolean }).recursive).toBe(true);
    });

    it("allows setting recursive to false", () => {
      const task = mkdir("/path/to/dir", false);
      const { effects } = dryRun(task);
      expect((effects[0] as { recursive: boolean }).recursive).toBe(false);
    });

    it("allows explicit recursive true", () => {
      const task = mkdir("/deep/nested/path", true);
      const { effects } = dryRun(task);
      expect((effects[0] as { recursive: boolean }).recursive).toBe(true);
    });
  });

  describe("exists", () => {
    it("creates an Exists effect", () => {
      const task = exists("/path/to/file");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Exists");
      expect((effects[0] as { path: string }).path).toBe("/path/to/file");
    });

    it("returns false by default in dry run when file not created", () => {
      const task = exists("/any/path");
      const { value } = dryRun(task);
      expect(value).toBe(false);
    });

    it("returns true in dry run when file was created during run", () => {
      const task = flatMap(writeFile("/any/path", "content"), () =>
        exists("/any/path"),
      );
      const { value } = dryRun(task);
      expect(value).toBe(true);
    });
  });

  describe("glob", () => {
    it("creates a Glob effect", () => {
      const task = glob("**/*.ts", "/src");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Glob");
      expect((effects[0] as { pattern: string }).pattern).toBe("**/*.ts");
      expect((effects[0] as { cwd: string }).cwd).toBe("/src");
    });

    it("handles complex glob patterns", () => {
      const task = glob("**/*.{ts,tsx,js,jsx}", "/project");
      const { effects } = dryRun(task);
      expect((effects[0] as { pattern: string }).pattern).toBe(
        "**/*.{ts,tsx,js,jsx}",
      );
    });

    it("returns empty array by default in dry run", () => {
      const task = glob("**/*", "/src");
      const { value } = dryRun(task);
      expect(value).toEqual([]);
    });
  });
});

// =============================================================================
// Process Primitives
// =============================================================================

describe("Primitives - Process", () => {
  describe("exec", () => {
    it("creates an Exec effect", () => {
      const task = exec("npm", ["install"], "/project");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Exec");
      expect((effects[0] as { command: string }).command).toBe("npm");
      expect((effects[0] as { args: string[] }).args).toEqual(["install"]);
      expect((effects[0] as { cwd?: string }).cwd).toBe("/project");
    });

    it("works without cwd", () => {
      const task = exec("ls", ["-la"]);
      const { effects } = dryRun(task);
      expect((effects[0] as { cwd?: string }).cwd).toBeUndefined();
    });

    it("handles empty args", () => {
      const task = exec("pwd", []);
      const { effects } = dryRun(task);
      expect((effects[0] as { args: string[] }).args).toEqual([]);
    });

    it("handles multiple args", () => {
      const task = exec("git", [
        "commit",
        "-m",
        "feat: add feature",
        "--no-verify",
      ]);
      const { effects } = dryRun(task);
      expect((effects[0] as { args: string[] }).args).toEqual([
        "commit",
        "-m",
        "feat: add feature",
        "--no-verify",
      ]);
    });

    it("returns mock ExecResult in dry run", () => {
      const task = exec("echo", ["hello"]);
      const { value } = dryRun(task);
      expect(value).toEqual({ stdout: "", stderr: "", exitCode: 0 });
    });
  });

  describe("execSimple", () => {
    it("creates an Exec effect from a command string", () => {
      const task = execSimple("npm install");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Exec");
      expect((effects[0] as { command: string }).command).toBe("npm");
      expect((effects[0] as { args: string[] }).args).toEqual(["install"]);
    });

    it("handles single word command", () => {
      const task = execSimple("pwd");
      const { effects } = dryRun(task);
      expect((effects[0] as { command: string }).command).toBe("pwd");
      expect((effects[0] as { args: string[] }).args).toEqual([]);
    });

    it("handles command with multiple arguments", () => {
      const task = execSimple("git commit -m message");
      const { effects } = dryRun(task);
      expect((effects[0] as { command: string }).command).toBe("git");
      expect((effects[0] as { args: string[] }).args).toEqual([
        "commit",
        "-m",
        "message",
      ]);
    });

    it("works with cwd parameter", () => {
      const task = execSimple("npm install", "/project");
      const { effects } = dryRun(task);
      expect((effects[0] as { cwd?: string }).cwd).toBe("/project");
    });
  });
});

// =============================================================================
// Prompt Primitives
// =============================================================================

describe("Primitives - Prompt", () => {
  describe("prompt (generic)", () => {
    it("creates a Prompt effect with text question", () => {
      const task = prompt({
        type: "text",
        name: "username",
        message: "Enter username:",
        default: "guest",
      });
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Prompt");
      const question = (effects[0] as { question: { type: string } }).question;
      expect(question.type).toBe("text");
    });
  });

  describe("promptText", () => {
    it("creates a text Prompt effect", () => {
      const task = promptText("name", "What is your name?", "John");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Prompt");
      const question = (
        effects[0] as {
          question: {
            type: string;
            name: string;
            message: string;
            default?: string;
          };
        }
      ).question;
      expect(question.type).toBe("text");
      expect(question.name).toBe("name");
      expect(question.message).toBe("What is your name?");
      expect(question.default).toBe("John");
    });

    it("works without default value", () => {
      const task = promptText("name", "What is your name?");
      const { effects } = dryRun(task);
      const question = (effects[0] as { question: { default?: string } })
        .question;
      expect(question.default).toBeUndefined();
    });

    it("returns default value in dry run", () => {
      const task = promptText("name", "Name?", "default_name");
      const { value } = dryRun(task);
      expect(value).toBe("default_name");
    });

    it("returns empty string when no default in dry run", () => {
      const task = promptText("name", "Name?");
      const { value } = dryRun(task);
      expect(value).toBe("");
    });
  });

  describe("promptConfirm", () => {
    it("creates a confirm Prompt effect", () => {
      const task = promptConfirm("proceed", "Continue?", true);
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Prompt");
      const question = (
        effects[0] as {
          question: { type: string; name: string; default?: boolean };
        }
      ).question;
      expect(question.type).toBe("confirm");
      expect(question.name).toBe("proceed");
      expect(question.default).toBe(true);
    });

    it("defaults to false", () => {
      const task = promptConfirm("proceed", "Continue?");
      const { effects } = dryRun(task);
      const question = (effects[0] as { question: { default?: boolean } })
        .question;
      expect(question.default).toBe(false);
    });

    it("returns default value in dry run", () => {
      const task = promptConfirm("proceed", "Continue?", true);
      const { value } = dryRun(task);
      expect(value).toBe(true);
    });

    it("returns false when no default in dry run", () => {
      const task = promptConfirm("proceed", "Continue?");
      const { value } = dryRun(task);
      expect(value).toBe(false);
    });
  });

  describe("promptSelect", () => {
    it("creates a select Prompt effect", () => {
      const choices = [
        { label: "Option A", value: "a" },
        { label: "Option B", value: "b" },
        { label: "Option C", value: "c" },
      ];
      const task = promptSelect("choice", "Pick one:", choices, "b");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Prompt");
      const question = (
        effects[0] as {
          question: { type: string; choices: typeof choices; default?: string };
        }
      ).question;
      expect(question.type).toBe("select");
      expect(question.choices).toEqual(choices);
      expect(question.default).toBe("b");
    });

    it("returns default value in dry run", () => {
      const choices = [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ];
      const task = promptSelect("choice", "Pick:", choices, "b");
      const { value } = dryRun(task);
      expect(value).toBe("b");
    });

    it("returns first choice when no default in dry run", () => {
      const choices = [
        { label: "First", value: "first" },
        { label: "Second", value: "second" },
      ];
      const task = promptSelect("choice", "Pick:", choices);
      const { value } = dryRun(task);
      expect(value).toBe("first");
    });
  });

  describe("promptMultiselect", () => {
    it("creates a multiselect Prompt effect", () => {
      const choices = [
        { label: "TypeScript", value: "ts" },
        { label: "ESLint", value: "eslint" },
        { label: "Prettier", value: "prettier" },
      ];
      const task = promptMultiselect("features", "Select features:", choices, [
        "ts",
        "prettier",
      ]);
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Prompt");
      const question = (
        effects[0] as {
          question: {
            type: string;
            choices: typeof choices;
            default?: string[];
          };
        }
      ).question;
      expect(question.type).toBe("multiselect");
      expect(question.choices).toEqual(choices);
      expect(question.default).toEqual(["ts", "prettier"]);
    });

    it("returns default values in dry run", () => {
      const choices = [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ];
      const task = promptMultiselect("choices", "Pick:", choices, ["a", "b"]);
      const { value } = dryRun(task);
      expect(value).toEqual(["a", "b"]);
    });

    it("returns empty array when no default in dry run", () => {
      const choices = [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ];
      const task = promptMultiselect("choices", "Pick:", choices);
      const { value } = dryRun(task);
      expect(value).toEqual([]);
    });
  });
});

// =============================================================================
// Logging Primitives
// =============================================================================

describe("Primitives - Logging", () => {
  describe("log", () => {
    it("creates a Log effect with the given level", () => {
      const task = log("warn", "Warning message");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Log");
      expect((effects[0] as { level: string }).level).toBe("warn");
      expect((effects[0] as { message: string }).message).toBe(
        "Warning message",
      );
    });
  });

  describe("debug", () => {
    it("creates a debug level log", () => {
      const task = debug("Debug message");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect((effects[0] as { level: string }).level).toBe("debug");
      expect((effects[0] as { message: string }).message).toBe("Debug message");
    });
  });

  describe("info", () => {
    it("creates an info level log", () => {
      const task = info("Info message");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect((effects[0] as { level: string }).level).toBe("info");
      expect((effects[0] as { message: string }).message).toBe("Info message");
    });
  });

  describe("warn", () => {
    it("creates a warn level log", () => {
      const task = warn("Warning message");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect((effects[0] as { level: string }).level).toBe("warn");
      expect((effects[0] as { message: string }).message).toBe(
        "Warning message",
      );
    });
  });

  describe("error", () => {
    it("creates an error level log", () => {
      const task = error("Error message");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect((effects[0] as { level: string }).level).toBe("error");
      expect((effects[0] as { message: string }).message).toBe("Error message");
    });
  });

  describe("log message handling", () => {
    it("handles empty message", () => {
      const task = info("");
      const { effects } = dryRun(task);
      expect((effects[0] as { message: string }).message).toBe("");
    });

    it("handles multiline message", () => {
      const message = "Line 1\nLine 2\nLine 3";
      const task = info(message);
      const { effects } = dryRun(task);
      expect((effects[0] as { message: string }).message).toBe(message);
    });

    it("handles message with special characters", () => {
      const message = 'Special: @#$%^&*()[]{}|\\;"<>';
      const task = info(message);
      const { effects } = dryRun(task);
      expect((effects[0] as { message: string }).message).toBe(message);
    });

    it("handles message with unicode", () => {
      const message = "Unicode: \u{1F600} \u{1F4A5} \u{2705}";
      const task = info(message);
      const { effects } = dryRun(task);
      expect((effects[0] as { message: string }).message).toBe(message);
    });
  });
});

// =============================================================================
// Context Primitives
// =============================================================================

describe("Primitives - Context", () => {
  describe("getContext", () => {
    it("creates a ReadContext effect", () => {
      const task = getContext("myKey");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("ReadContext");
      expect((effects[0] as { key: string }).key).toBe("myKey");
    });

    it("returns undefined by default in dry run", () => {
      const task = getContext("anyKey");
      const { value } = dryRun(task);
      expect(value).toBeUndefined();
    });

    it("handles dot notation keys", () => {
      const task = getContext("user.settings.theme");
      const { effects } = dryRun(task);
      expect((effects[0] as { key: string }).key).toBe("user.settings.theme");
    });
  });

  describe("setContext", () => {
    it("creates a WriteContext effect", () => {
      const task = setContext("myKey", { data: 123 });
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("WriteContext");
      expect((effects[0] as { key: string }).key).toBe("myKey");
      expect((effects[0] as { value: unknown }).value).toEqual({ data: 123 });
    });

    it("handles various value types", () => {
      const tests = [
        { key: "string", value: "hello" },
        { key: "number", value: 42 },
        { key: "boolean", value: true },
        { key: "null", value: null },
        { key: "array", value: [1, 2, 3] },
        { key: "object", value: { nested: { deep: true } } },
      ];

      for (const test of tests) {
        const task = setContext(test.key, test.value);
        const { effects } = dryRun(task);
        expect((effects[0] as { value: unknown }).value).toEqual(test.value);
      }
    });
  });

  describe("withContext", () => {
    it("creates a WriteContext effect with continuation", () => {
      const innerTask = readFile("/file.txt");
      const task = withContext("tempKey", "tempValue", innerTask);
      const { effects } = dryRun(task);

      expect(effects.length).toBe(2);
      expect(effects[0]._tag).toBe("WriteContext");
      expect((effects[0] as { key: string }).key).toBe("tempKey");
      expect((effects[0] as { value: unknown }).value).toBe("tempValue");
      expect(effects[1]._tag).toBe("ReadFile");
    });
  });
});

// =============================================================================
// Pure Primitives
// =============================================================================

describe("Primitives - Pure", () => {
  describe("noop", () => {
    it("creates no effects and returns undefined", () => {
      const { effects, value } = dryRun(noop);

      expect(effects.length).toBe(0);
      expect(value).toBeUndefined();
    });

    it("can be used in sequences", () => {
      // noop is useful as a placeholder in conditional logic
      expect(noop._tag).toBe("Pure");
    });
  });

  describe("succeed", () => {
    it("creates no effects and returns the given value", () => {
      const { effects, value } = dryRun(succeed(42));

      expect(effects.length).toBe(0);
      expect(value).toBe(42);
    });

    it("works with various types", () => {
      expect(dryRun(succeed("hello")).value).toBe("hello");
      expect(dryRun(succeed([1, 2, 3])).value).toEqual([1, 2, 3]);
      expect(dryRun(succeed({ key: "value" })).value).toEqual({ key: "value" });
      expect(dryRun(succeed(null)).value).toBeNull();
      expect(dryRun(succeed(undefined)).value).toBeUndefined();
    });

    it("preserves referential equality", () => {
      const obj = { a: 1 };
      const { value } = dryRun(succeed(obj));
      expect(value).toBe(obj);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Primitives - Integration", () => {
  it("can chain multiple file operations", () => {
    const task = readFile("/input.txt");
    const { effects } = dryRun(task);

    expect(effects[0]._tag).toBe("ReadFile");
  });

  it("logging primitives produce correct effect sequence", () => {
    const { effects } = dryRun(debug("step 1"));
    expect(effects.length).toBe(1);
    expect((effects[0] as { level: string }).level).toBe("debug");
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Primitives - Edge Cases", () => {
  describe("Path handling", () => {
    it("handles Windows-style paths", () => {
      const task = readFile("C:\\Users\\name\\file.txt");
      const { effects } = dryRun(task);
      expect((effects[0] as { path: string }).path).toBe(
        "C:\\Users\\name\\file.txt",
      );
    });

    it("handles paths with trailing slash", () => {
      const task = mkdir("/path/to/dir/");
      const { effects } = dryRun(task);
      expect((effects[0] as { path: string }).path).toBe("/path/to/dir/");
    });

    it("handles empty path", () => {
      const task = readFile("");
      const { effects } = dryRun(task);
      expect((effects[0] as { path: string }).path).toBe("");
    });
  });

  describe("Content handling", () => {
    it("handles very large content", () => {
      const largeContent = "x".repeat(1_000_000);
      const task = writeFile("/large.txt", largeContent);
      const { effects } = dryRun(task);
      expect((effects[0] as { content: string }).content.length).toBe(
        1_000_000,
      );
    });

    it("handles content with null characters", () => {
      const content = "before\x00after";
      const task = writeFile("/binary.dat", content);
      const { effects } = dryRun(task);
      expect((effects[0] as { content: string }).content).toBe(content);
    });
  });

  describe("Command handling", () => {
    it("handles command with absolute path", () => {
      const task = exec("/usr/bin/node", ["--version"]);
      const { effects } = dryRun(task);
      expect((effects[0] as { command: string }).command).toBe("/usr/bin/node");
    });

    it("handles arguments with spaces", () => {
      const task = exec("echo", ["hello world", "foo bar"]);
      const { effects } = dryRun(task);
      expect((effects[0] as { args: string[] }).args).toEqual([
        "hello world",
        "foo bar",
      ]);
    });

    it("handles empty command in execSimple", () => {
      const task = execSimple("");
      const { effects } = dryRun(task);
      expect((effects[0] as { command: string }).command).toBe("");
    });
  });
});

// =============================================================================
// File Transformation Primitives
// =============================================================================

describe("Primitives - File Transformation", () => {
  describe("sortFileLines", () => {
    const createMocks = (content: string) =>
      new Map([["ReadFile", () => content]]);

    it("sorts lines alphabetically by default", () => {
      const mockContent = "zebra\napple\nmango\nbanana";
      const task = sortFileLines("/exports.ts");

      const { effects } = dryRunWith(task, createMocks(mockContent));

      expect(effects.length).toBe(2);
      expect(effects[0]._tag).toBe("ReadFile");
      expect(effects[1]._tag).toBe("WriteFile");

      const writeEffect = effects[1] as { content: string };
      expect(writeEffect.content).toBe("apple\nbanana\nmango\nzebra");
    });

    it("removes duplicates when unique option is true", () => {
      const mockContent = "apple\nbanana\napple\nmango\nbanana";
      const task = sortFileLines("/exports.ts", { unique: true });

      const { effects } = dryRunWith(task, createMocks(mockContent));

      const writeEffect = effects[1] as { content: string };
      expect(writeEffect.content).toBe("apple\nbanana\nmango");
    });

    it("preserves header lines matching pattern", () => {
      const mockContent =
        "// Header comment\n// Another header\nexport { z } from './z';\nexport { a } from './a';\nexport { m } from './m';";
      const task = sortFileLines("/exports.ts", {
        headerPattern: /^\/\//,
      });

      const { effects } = dryRunWith(task, createMocks(mockContent));

      const writeEffect = effects[1] as { content: string };
      const lines = writeEffect.content.split("\n");

      // Header lines should be preserved at top
      expect(lines[0]).toBe("// Header comment");
      expect(lines[1]).toBe("// Another header");
      // Body should be sorted
      expect(lines[2]).toBe("export { a } from './a';");
      expect(lines[3]).toBe("export { m } from './m';");
      expect(lines[4]).toBe("export { z } from './z';");
    });

    it("preserves footer lines matching pattern", () => {
      const mockContent =
        "export { z } from './z';\nexport { a } from './a';\n// Footer\n// End";
      const task = sortFileLines("/exports.ts", {
        footerPattern: /^\/\//,
      });

      const { effects } = dryRunWith(task, createMocks(mockContent));

      const writeEffect = effects[1] as { content: string };
      const lines = writeEffect.content.split("\n");

      // Body should be sorted
      expect(lines[0]).toBe("export { a } from './a';");
      expect(lines[1]).toBe("export { z } from './z';");
      // Footer lines should be preserved at bottom
      expect(lines[2]).toBe("// Footer");
      expect(lines[3]).toBe("// End");
    });

    it("accepts custom comparator", () => {
      const mockContent = "Apple\nbanana\nCherry";
      const task = sortFileLines("/exports.ts", {
        compare: (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()),
      });

      const { effects } = dryRunWith(task, createMocks(mockContent));

      const writeEffect = effects[1] as { content: string };
      expect(writeEffect.content).toBe("Apple\nbanana\nCherry");
    });

    it("handles empty file", () => {
      const task = sortFileLines("/empty.ts");

      const { effects } = dryRunWith(task, createMocks(""));

      const writeEffect = effects[1] as { content: string };
      expect(writeEffect.content).toBe("");
    });

    it("handles single line file", () => {
      const task = sortFileLines("/single.ts");

      const { effects } = dryRunWith(task, createMocks("only line"));

      const writeEffect = effects[1] as { content: string };
      expect(writeEffect.content).toBe("only line");
    });

    it("handles barrel file with exports", () => {
      const mockContent = `// Auto-generated barrel
export { zebra } from "./zebra.js";
export { apple } from "./apple.js";
export { mango } from "./mango.js";`;

      const task = sortFileLines("/index.ts", {
        headerPattern: /^\/\//,
      });

      const { effects } = dryRunWith(task, createMocks(mockContent));

      const writeEffect = effects[1] as { content: string };
      const lines = writeEffect.content.split("\n");

      expect(lines[0]).toBe("// Auto-generated barrel");
      expect(lines[1]).toBe('export { apple } from "./apple.js";');
      expect(lines[2]).toBe('export { mango } from "./mango.js";');
      expect(lines[3]).toBe('export { zebra } from "./zebra.js";');
    });

    it("combines header, unique, and custom comparator", () => {
      const mockContent = `// Header
B
a
B
A
c`;

      const task = sortFileLines("/test.ts", {
        headerPattern: /^\/\//,
        unique: true,
        compare: (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()),
      });

      const { effects } = dryRunWith(task, createMocks(mockContent));

      const writeEffect = effects[1] as { content: string };
      expect(writeEffect.content).toBe("// Header\na\nA\nB\nc");
    });
  });
});
