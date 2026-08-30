/**
 * The prompt→param adapter, pinned cell by cell with LITERAL expectations —
 * the direct coverage the replaced adapter-parity describe dropped. The
 * projection-fidelity test holds `CREATE_SURFACE` to the live generators;
 * `create.verb.ts` builds its params FROM this adapter — so the adapter
 * itself must be pinned against literals, not against its own output.
 * Includes the appPath `my-app` default the MCP schema serves.
 */

import { describe, expect, it } from "vitest";
import { createVerbs } from "./create.verb.js";
import { CREATE_SURFACE } from "./createSurface.generated.js";
import {
  declarativeDoc,
  generatorToParams,
  promptToParam,
} from "./generatorToVerbSpec.js";

describe("declarativeDoc — wizard question to help sentence", () => {
  it("strips the trailing ?/: and ends with a period", () => {
    expect(declarativeDoc("Include styles?")).toBe("Include styles.");
    expect(declarativeDoc("Package name:")).toBe("Package name.");
  });

  it("keeps an existing terminal, and passes empty through", () => {
    expect(declarativeDoc("Already a sentence.")).toBe("Already a sentence.");
    expect(declarativeDoc("Watch out!")).toBe("Watch out!");
    expect(declarativeDoc("  ")).toBe("");
  });
});

describe("promptToParam — the type × default × positional × conditional matrix", () => {
  it("text + default + positional + path-name → optional positional string with files completion", () => {
    expect(
      promptToParam({
        name: "appPath",
        type: "text",
        message: "Application directory name:",
        default: "my-app",
        positional: true,
      }),
    ).toEqual({
      kind: "string",
      name: "appPath",
      doc: "Application directory name.",
      required: false,
      positional: true,
      default: "my-app",
      complete: { kind: "files" },
    });
  });

  it("text without default or condition → required flag string, no completion", () => {
    expect(
      promptToParam({ name: "title", type: "text", message: "Title:" }),
    ).toEqual({
      kind: "string",
      name: "title",
      doc: "Title.",
      required: true,
      positional: false,
    });
  });

  it("a conditional prompt is never required — projected and live `when` alike", () => {
    expect(
      promptToParam({
        name: "useTsStories",
        type: "confirm",
        message: "Use TS stories?",
        conditional: true,
      }).required,
    ).toBe(false);
    expect(
      promptToParam({
        name: "useTsStories",
        type: "confirm",
        message: "Use TS stories?",
        when: () => true,
      }).required,
    ).toBe(false);
  });

  it("confirm carries its boolean default in both polarities", () => {
    expect(
      promptToParam({
        name: "withStyles",
        type: "confirm",
        message: "Include styles?",
        default: true,
      }),
    ).toEqual({
      kind: "boolean",
      name: "withStyles",
      doc: "Include styles.",
      required: false,
      positional: false,
      default: true,
    });
    expect(
      promptToParam({
        name: "relay",
        type: "confirm",
        message: "Include Relay?",
        default: false,
      }),
    ).toMatchObject({ kind: "boolean", default: false });
  });

  it("select → enum over the choice values, default stringified", () => {
    expect(
      promptToParam({
        name: "type",
        type: "select",
        message: "Package type:",
        choices: [
          { label: "Tool", value: "tool-ts" },
          { label: "Library", value: "library" },
        ],
        default: "tool-ts",
      }),
    ).toEqual({
      kind: "enum",
      name: "type",
      doc: "Package type.",
      values: ["tool-ts", "library"],
      required: false,
      positional: false,
      default: "tool-ts",
    });
  });

  it("multiselect → string[] with values completion and NO default slot", () => {
    const param = promptToParam({
      name: "features",
      type: "multiselect",
      message: "Features:",
      choices: [{ label: "X", value: "x" }],
      default: ["x"],
    });
    expect(param).toEqual({
      kind: "string[]",
      name: "features",
      doc: "Features.",
      required: false,
      positional: false,
      complete: { kind: "values" },
    });
    expect("default" in param).toBe(false);
  });
});

describe("generatorToParams — order and the live appPath default", () => {
  it("maps in declared prompt order", () => {
    const params = generatorToParams([
      { name: "b", type: "text", message: "B:" },
      { name: "a", type: "text", message: "A:" },
    ]);
    expect(params.map((param) => param.name)).toEqual(["b", "a"]);
  });

  it("the live create_application schema carries appPath default my-app (LITERAL)", () => {
    // End-to-end through the committed surface: the generator's positional
    // prompt default must survive into the binding param the MCP schema and
    // reference serve. A literal, so promptToParam dropping `default` for
    // positional prompts goes red here even while surface fidelity is green.
    const appPath = createVerbs.application.params.find(
      (param) => param.name === "appPath",
    );
    expect(appPath).toEqual({
      kind: "string",
      name: "appPath",
      doc: "Application directory name.",
      required: false,
      positional: true,
      default: "my-app",
      complete: { kind: "files" },
    });
    // The projected surface it derives from says the same thing.
    expect(
      CREATE_SURFACE["application/react"]?.prompts.find(
        (prompt) => prompt.name === "appPath",
      )?.default,
    ).toBe("my-app");
  });
});
