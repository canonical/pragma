import { pure, task } from "@canonical/task";
import { describe, expect, it } from "vitest";
import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import projectGenerator from "./projectGenerator.js";

const generator: GeneratorDefinition = {
  meta: {
    name: "component/react",
    displayName: "x:react",
    description: "Generate a React component",
    version: "0.1.0",
  },
  prompts: [
    {
      name: "componentPath",
      type: "text",
      message: "Component path:",
      default: "src/components/MyComponent",
      validate: (v) => v !== "" || "path required",
      group: "Component",
      positional: true,
    },
    {
      name: "withStories",
      type: "confirm",
      message: "Include stories?",
      default: true,
      group: "Options",
    },
    {
      name: "useTsStories",
      type: "confirm",
      message: "Use TS stories?",
      default: false,
      when: (answers) => answers.withStories === true,
    },
    {
      name: "kind",
      type: "select",
      message: "Kind:",
      choices: [{ label: "A", value: "a" }],
    },
    { name: "bare", type: "text", message: "Bare:" },
  ],
  generate: () => task(pure(undefined)).unwrap(),
};

describe("projectGenerator", () => {
  const projected = projectGenerator(["component", "react"], generator);

  it("carries the path and the generator description", () => {
    expect(projected.path).toEqual(["component", "react"]);
    expect(projected.description).toBe("Generate a React component");
  });

  it("is fully serializable — no functions survive", () => {
    expect(JSON.parse(JSON.stringify(projected))).toEqual(projected);
  });

  it("keeps name/type/message/default/choices/positional/group", () => {
    expect(projected.prompts[0]).toEqual({
      name: "componentPath",
      type: "text",
      message: "Component path:",
      default: "src/components/MyComponent",
      positional: true,
      group: "Component",
    });
    expect(projected.prompts[3]).toEqual({
      name: "kind",
      type: "select",
      message: "Kind:",
      choices: [{ label: "A", value: "a" }],
    });
  });

  it("collapses `when` to `conditional: true` and drops `validate`", () => {
    expect(projected.prompts[2]).toEqual({
      name: "useTsStories",
      type: "confirm",
      message: "Use TS stories?",
      default: false,
      conditional: true,
    });
    expect(projected.prompts[0]).not.toHaveProperty("validate");
  });

  it("omits every absent optional field entirely", () => {
    expect(projected.prompts[4]).toEqual({
      name: "bare",
      type: "text",
      message: "Bare:",
    });
  });
});
