import { describe, expect, it } from "bun:test";
import { dryRun } from "../dry-run.js";
import {
  copyFile,
  debug,
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
  promptConfirm,
  promptSelect,
  promptText,
  readFile,
  setContext,
  succeed,
  warn,
  writeFile,
} from "../primitives.js";

describe("File System Primitives", () => {
  describe("readFile", () => {
    it("creates a ReadFile effect", () => {
      const task = readFile("/path/to/file.txt");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("ReadFile");
      expect((effects[0] as { path: string }).path).toBe("/path/to/file.txt");
    });
  });

  describe("writeFile", () => {
    it("creates a WriteFile effect", () => {
      const task = writeFile("/path/to/file.txt", "content");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("WriteFile");
      expect((effects[0] as { path: string }).path).toBe("/path/to/file.txt");
      expect((effects[0] as { content: string }).content).toBe("content");
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
  });

  describe("exists", () => {
    it("creates an Exists effect", () => {
      const task = exists("/path/to/file");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Exists");
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
  });
});

describe("Process Primitives", () => {
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
  });
});

describe("Prompt Primitives", () => {
  describe("promptText", () => {
    it("creates a text Prompt effect", () => {
      const task = promptText("name", "What is your name?", "default");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Prompt");
      const question = (effects[0] as { question: { type: string } }).question;
      expect(question.type).toBe("text");
    });
  });

  describe("promptConfirm", () => {
    it("creates a confirm Prompt effect", () => {
      const task = promptConfirm("proceed", "Continue?", true);
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Prompt");
      const question = (effects[0] as { question: { type: string } }).question;
      expect(question.type).toBe("confirm");
    });
  });

  describe("promptSelect", () => {
    it("creates a select Prompt effect", () => {
      const task = promptSelect("choice", "Pick one:", [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ]);
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Prompt");
      const question = (effects[0] as { question: { type: string } }).question;
      expect(question.type).toBe("select");
    });
  });
});

describe("Logging Primitives", () => {
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

  describe("convenience log functions", () => {
    it("debug creates debug level log", () => {
      const { effects } = dryRun(debug("Debug message"));
      expect((effects[0] as { level: string }).level).toBe("debug");
    });

    it("info creates info level log", () => {
      const { effects } = dryRun(info("Info message"));
      expect((effects[0] as { level: string }).level).toBe("info");
    });

    it("warn creates warn level log", () => {
      const { effects } = dryRun(warn("Warn message"));
      expect((effects[0] as { level: string }).level).toBe("warn");
    });

    it("error creates error level log", () => {
      const { effects } = dryRun(error("Error message"));
      expect((effects[0] as { level: string }).level).toBe("error");
    });
  });
});

describe("Context Primitives", () => {
  describe("getContext", () => {
    it("creates a ReadContext effect", () => {
      const task = getContext("myKey");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("ReadContext");
      expect((effects[0] as { key: string }).key).toBe("myKey");
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
  });
});

describe("Pure Primitives", () => {
  describe("noop", () => {
    it("creates no effects and returns undefined", () => {
      const { effects, value } = dryRun(noop);
      expect(effects.length).toBe(0);
      expect(value).toBe(undefined);
    });
  });

  describe("succeed", () => {
    it("creates no effects and returns the given value", () => {
      const { effects, value } = dryRun(succeed(42));
      expect(effects.length).toBe(0);
      expect(value).toBe(42);
    });
  });
});
