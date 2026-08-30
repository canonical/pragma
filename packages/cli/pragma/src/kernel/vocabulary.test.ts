import { describe, expect, it } from "vitest";
import { dataNq } from "./runtime/graphpack/embedded/pack.generated.js";
import { embeddedManifest } from "./runtime/graphpack/embedded.js";
import type { DeclaredVocabulary } from "./vocabulary.js";
import { parseVocabulary, VOCABULARY } from "./vocabulary.js";

/** A valid declaration, cloned per case so one field can be made hostile. */
const createValidDeclaration = (): DeclaredVocabulary => ({
  altName: "ex:name",
  prompt: {
    type: "ex:Prompt",
    body: "ex:body",
    argument: "ex:argument",
    argName: "ex:argName",
    argRequired: "ex:argRequired",
  },
});

/** The bindings `createValidDeclaration`'s terms resolve against. */
const BOUND = { ex: "https://ex.test/" };

describe("parseVocabulary", () => {
  it("returns the same declaration when every term is readable", () => {
    const declaration = createValidDeclaration();
    expect(parseVocabulary(declaration, BOUND, "x.conf.ts")).toBe(declaration);
  });

  it("rejects an absolute IRI, naming the field and the file", () => {
    // The defect this validator exists for. An absolute IRI written bare is a
    // SPARQL parse error; caught at the read site it becomes "this graph has no
    // prompts", indistinguishable from an empty graph. Here it is a startup
    // CONFIG_ERROR that says which term is wrong and where.
    let caught: unknown;
    try {
      parseVocabulary(
        { ...createValidDeclaration(), altName: "https://ex.test/name" },
        BOUND,
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

  it("rejects a term whose prefix nothing binds, naming that prefix", () => {
    // The likelier malformation, and the one the shape check alone lets past.
    // A one-character typo passes `prefix:local` and then makes every read of
    // that term fail — the index silently loses `altNames`, and the prompt
    // SELECT fails in a way a caller cannot tell from an empty graph. So the
    // binding is checked here, where the file that declares both is one place.
    let caught: unknown;
    try {
      parseVocabulary(
        { ...createValidDeclaration(), altName: "exx:name" },
        BOUND,
        "x.conf.ts",
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "CONFIG_ERROR" });
    const { message, recovery } = caught as {
      message: string;
      recovery?: { message: string };
    };
    expect(message).toContain("altName");
    expect(message).toContain("exx:");
    expect(recovery?.message).toContain("exx");
  });

  it("rejects a nested prompt term whose prefix nothing binds", () => {
    const declaration = createValidDeclaration();
    expect(() =>
      parseVocabulary(
        {
          ...declaration,
          prompt: { ...declaration.prompt, type: "other:Prompt" },
        },
        BOUND,
        "x.conf.ts",
      ),
    ).toThrow(/prompt\.type/);
  });

  it("rejects a term naming an inherited Object property as its prefix", () => {
    // `prefixes` is a plain record, so an unbound prefix must be UNBOUND, not
    // whatever the prototype chain answers. Without an own-key check
    // `constructor:name` passes and expands to a stringified function.
    expect(() =>
      parseVocabulary(
        { ...createValidDeclaration(), altName: "constructor:name" },
        BOUND,
        "x.conf.ts",
      ),
    ).toThrow(/constructor:/);
  });

  it("rejects a nested prompt term, naming its path", () => {
    const declaration = createValidDeclaration();
    expect(() =>
      parseVocabulary(
        {
          ...declaration,
          prompt: { ...declaration.prompt, body: "<ex:body>" },
        },
        BOUND,
        "x.conf.ts",
      ),
    ).toThrow(/prompt\.body/);
  });

  it("rejects an empty, unprefixed, whitespace-bearing or malformed term", () => {
    for (const term of ["", "name", "ex:", ":name", "ex: name", "ex:na me"]) {
      expect(() =>
        parseVocabulary(
          { ...createValidDeclaration(), altName: term },
          BOUND,
          "x.conf.ts",
        ),
      ).toThrow(/altName/);
    }
  });
});

describe("the shipped declaration", () => {
  it("declares the name property entities are addressed by", () => {
    expect(VOCABULARY.altName).toBe("ds:name");
  });

  it("names a property the shipped pack actually carries", () => {
    // The declaration and the committed pack are produced independently, and
    // NOTHING makes the pack follow the declaration: `contentHash` covers pack
    // sources only, and `buildPack` reuses any complete cache directory, so
    // editing `altName` here re-mints no index and `sources update` cannot
    // repair the mismatch. Left silent, the CLI would offer the old property's
    // tokens from the index and match the new one in every lookup.
    //
    // So expand the declared term through the pack's OWN manifest and look for
    // it as a predicate in the pack's data. The prompt terms get no such check
    // — they are a read contract, and this graph carries no prompt entities.
    const [prefix, local] = VOCABULARY.altName.split(":");
    const namespace = embeddedManifest().prefixes[prefix ?? ""];
    expect(namespace, `pack binding for \`${prefix}:\``).toBeDefined();
    expect(
      dataNq.includes(` <${namespace}${local}> `),
      `\`${VOCABULARY.altName}\` used as a predicate in the shipped pack`,
    ).toBe(true);
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
