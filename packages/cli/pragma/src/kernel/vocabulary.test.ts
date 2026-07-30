import { describe, expect, it } from "vitest";
import type { DeclaredVocabulary } from "./vocabulary.js";
import { parseVocabulary, VOCABULARY } from "./vocabulary.js";

/** A valid declaration, cloned per case so one field can be made hostile. */
const valid = (): DeclaredVocabulary => ({
  altName: "ex:name",
  prompt: {
    type: "ex:Prompt",
    body: "ex:body",
    argument: "ex:argument",
    argName: "ex:argName",
    argRequired: "ex:argRequired",
  },
});

describe("parseVocabulary", () => {
  it("returns a declaration whose every term is a prefixed name", () => {
    const declaration = valid();
    expect(parseVocabulary(declaration, "x.conf.ts")).toBe(declaration);
  });

  it("rejects an absolute IRI, naming the field and the file", () => {
    // The defect this validator exists for. An absolute IRI written bare is a
    // SPARQL parse error; caught at the read site it becomes "this graph has no
    // prompts", indistinguishable from an empty graph. Here it is a startup
    // CONFIG_ERROR that says which term is wrong and where.
    let caught: unknown;
    try {
      parseVocabulary(
        { ...valid(), altName: "https://ex.test/name" },
        "x.conf.ts",
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "CONFIG_ERROR" });
    const { message } = caught as { message: string };
    expect(message).toContain("altName");
    expect(message).toContain("x.conf.ts");
    expect(message).toContain("https://ex.test/name");
  });

  it("rejects a nested prompt term, naming its path", () => {
    const declaration = valid();
    expect(() =>
      parseVocabulary(
        {
          ...declaration,
          prompt: { ...declaration.prompt, body: "<ex:body>" },
        },
        "x.conf.ts",
      ),
    ).toThrow(/prompt\.body/);
  });

  it("rejects an empty, unprefixed, or whitespace-bearing term", () => {
    for (const term of ["", "name", "ex:", ":name", "ex: name", "ex:na me"]) {
      expect(() =>
        parseVocabulary({ ...valid(), altName: term }, "x.conf.ts"),
      ).toThrow(/altName/);
    }
  });
});

describe("the shipped declaration", () => {
  it("declares the name property entities are addressed by", () => {
    expect(VOCABULARY.altName).toBe("ds:name");
  });

  it("declares the prompt entity shape, value for value", () => {
    expect(VOCABULARY.prompt).toEqual({
      type: "ds:Prompt",
      body: "ds:promptBody",
      argument: "ds:promptArgument",
      argName: "ds:argName",
      argRequired: "ds:argRequired",
    });
  });
});
