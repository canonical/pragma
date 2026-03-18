import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import { pure } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generatorToCommand, promptToParameter } from "./convertGenerator.js";

// =============================================================================
// promptToParameter
// =============================================================================

describe("promptToParameter", () => {
  it("maps text → string", () => {
    const prompt: PromptDefinition = {
      name: "name",
      message: "Name",
      type: "text",
    };
    const param = promptToParameter(prompt);
    expect(param.type).toBe("string");
    expect(param.name).toBe("name");
    expect(param.description).toBe("Name");
    expect(param.required).toBe(true);
  });

  it("maps confirm → boolean", () => {
    const prompt: PromptDefinition = {
      name: "withTests",
      message: "Tests?",
      type: "confirm",
      default: true,
    };
    const param = promptToParameter(prompt);
    expect(param.type).toBe("boolean");
    expect(param.default).toBe(true);
    expect(param.required).toBe(false);
  });

  it("maps select → select with choices", () => {
    const choices = [
      { label: "CSS", value: "css" },
      { label: "SCSS", value: "scss" },
    ];
    const prompt: PromptDefinition = {
      name: "style",
      message: "Style",
      type: "select",
      choices,
    };
    const param = promptToParameter(prompt);
    expect(param.type).toBe("select");
    expect(param.choices).toEqual(choices);
  });

  it("maps multiselect → multiselect", () => {
    const prompt: PromptDefinition = {
      name: "features",
      message: "Features",
      type: "multiselect",
      choices: [{ label: "A", value: "a" }],
    };
    const param = promptToParameter(prompt);
    expect(param.type).toBe("multiselect");
  });

  it("passes through positional flag", () => {
    const prompt: PromptDefinition = {
      name: "name",
      message: "Name",
      type: "text",
      positional: true,
    };
    const param = promptToParameter(prompt);
    expect(param.positional).toBe(true);
  });

  it("derives required=true when no default and no when", () => {
    const prompt: PromptDefinition = {
      name: "name",
      message: "Name",
      type: "text",
    };
    expect(promptToParameter(prompt).required).toBe(true);
  });

  it("derives required=false when default is present", () => {
    const prompt: PromptDefinition = {
      name: "name",
      message: "Name",
      type: "text",
      default: "hello",
    };
    expect(promptToParameter(prompt).required).toBe(false);
  });

  it("derives required=false when when condition is present", () => {
    const prompt: PromptDefinition = {
      name: "name",
      message: "Name",
      type: "text",
      when: () => true,
    };
    expect(promptToParameter(prompt).required).toBe(false);
  });
});

// =============================================================================
// generatorToCommand
// =============================================================================

describe("generatorToCommand", () => {
  const gen: GeneratorDefinition = {
    meta: {
      name: "component/react",
      description: "Create a React component",
      version: "2.0.0",
      author: "@canonical/summon-component",
      help: "Extended help text",
      examples: ["summon component react --name Button"],
    },
    prompts: [
      {
        name: "name",
        message: "Component name",
        type: "text",
        positional: true,
      },
      {
        name: "withTests",
        message: "Include tests?",
        type: "confirm",
        default: true,
        group: "Testing",
      },
      {
        name: "style",
        message: "Style engine",
        type: "select",
        choices: [{ label: "CSS", value: "css" }],
        group: "Styling",
      },
    ],
    generate: () => pure(undefined),
  };

  it("passes through path", () => {
    const cmd = generatorToCommand(["component", "react"], gen);
    expect(cmd.path).toEqual(["component", "react"]);
  });

  it("maps all prompt params plus 5 exec params", () => {
    const cmd = generatorToCommand(["component", "react"], gen);
    // 3 prompts + 5 exec params = 8
    expect(cmd.parameters).toHaveLength(8);
    expect(cmd.parameters.map((p) => p.name)).toContain("dryRun");
    expect(cmd.parameters.map((p) => p.name)).toContain("yes");
    expect(cmd.parameters.map((p) => p.name)).toContain("showFiles");
    expect(cmd.parameters.map((p) => p.name)).toContain("preview");
    expect(cmd.parameters.map((p) => p.name)).toContain("generatedStamp");
  });

  it("builds parameterGroups from prompt groups", () => {
    const cmd = generatorToCommand(["component", "react"], gen);
    expect(cmd.parameterGroups).toEqual({
      Testing: ["withTests"],
      Styling: ["style"],
    });
  });

  it("maps meta fields", () => {
    const cmd = generatorToCommand(["component", "react"], gen);
    expect(cmd.meta).toEqual({
      version: "2.0.0",
      examples: ["summon component react --name Button"],
      extendedHelp: "Extended help text",
      origin: "@canonical/summon-component",
    });
  });

  it("execute returns a Promise<CommandResult>", async () => {
    const cmd = generatorToCommand(["component", "react"], gen);
    const result = await cmd.execute(
      { name: "Button", dryRun: true, yes: true },
      {
        cwd: "/tmp",
        globalFlags: { llm: false, format: "text", verbose: false },
      },
    );
    expect(result.tag).toBeDefined();
  });

  it("omits parameterGroups when no groups present", () => {
    const simpleGen: GeneratorDefinition = {
      meta: { name: "simple", description: "Simple gen", version: "1.0.0" },
      prompts: [{ name: "name", message: "Name", type: "text" }],
      generate: () => pure(undefined),
    };
    const cmd = generatorToCommand(["simple"], simpleGen);
    expect(cmd.parameterGroups).toBeUndefined();
  });
});
