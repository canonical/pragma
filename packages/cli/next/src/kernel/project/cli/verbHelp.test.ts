import { describe, expect, it } from "vitest";
import type { VerbSpec } from "../../spec/types.js";
import { formatNounHelp, formatVerbHelp } from "./verbHelp.js";

const passthrough = {
  plain: (d: unknown) => String(d),
  llm: (d: unknown) => String(d),
  json: (d: unknown) => JSON.stringify(d),
};

const get: VerbSpec = {
  path: ["block", "get"],
  summary: "Get a block by name.",
  doc: "Resolves the block and prints its anatomy.",
  params: [
    {
      kind: "string",
      name: "name",
      doc: "Block name.",
      positional: true,
      required: true,
    },
    { kind: "boolean", name: "withAnatomy", doc: "Include the anatomy tree." },
  ],
  output: { formatters: passthrough },
  examples: [{ cmd: "pragma block get Button", note: "the primary button" }],
  capability: { needsStore: true, mutates: false, mcp: { expose: true } },
  run: async () => null,
};

const list: VerbSpec = {
  path: ["block", "list"],
  summary: "List blocks.",
  params: [],
  output: { formatters: passthrough },
  capability: { needsStore: true, mutates: false, mcp: { expose: true } },
  run: async () => null,
};

/** A self-verb (`path.length === 1`) to exercise the root-pointing footer. */
const selfVerb: VerbSpec = {
  path: ["doctor"],
  summary: "Check environment health.",
  params: [],
  output: { formatters: passthrough },
  capability: { needsStore: false, mutates: false, mcp: { expose: true } },
  run: async () => null,
};

describe("formatVerbHelp", () => {
  const help = formatVerbHelp("pragma", get);

  it("renders the usage line with the positional", () => {
    expect(help).toContain("Usage: pragma block get <name> [flags]");
  });

  it("renders summary, extended doc, the kebab flag, and examples", () => {
    expect(help).toContain("Get a block by name.");
    expect(help).toContain("Resolves the block and prints its anatomy.");
    expect(help).toContain("--with-anatomy");
    expect(help).toContain("pragma block get Button");
    expect(help).toContain("the primary button");
  });

  it("closes a sub-verb page with a footer pointing at the noun page", () => {
    expect(help).toContain(
      "Run `pragma block --help` to see all block commands.",
    );
  });

  it("closes a self-verb page with a footer pointing at the root", () => {
    expect(formatVerbHelp("pragma", selfVerb)).toContain(
      "Run `pragma --help` to see all commands.",
    );
  });

  it("renders the unified verb page (restyle golden)", () => {
    expect(help).toMatchInlineSnapshot(`
      "Usage: pragma block get <name> [flags]

      Get a block by name.

      Resolves the block and prints its anatomy.

      Flags
        --with-anatomy  Include the anatomy tree.

      Examples
        pragma block get Button
          the primary button

      Run \`pragma block --help\` to see all block commands."
    `);
  });
});

describe("formatNounHelp", () => {
  it("lists the noun's verbs with summaries", () => {
    const help = formatNounHelp("pragma", "block", [get, list]);
    expect(help).toContain("Usage: pragma block <verb> [flags]");
    expect(help).toContain("get");
    expect(help).toContain("list");
    expect(help).toContain("Get a block by name.");
  });

  it("renders the unified noun page (restyle golden)", () => {
    expect(
      formatNounHelp("pragma", "block", [get, list]),
    ).toMatchInlineSnapshot(`
      "Usage: pragma block <verb> [flags]

      Verbs
        get   Get a block by name.
        list  List blocks.

      Run \`pragma block <verb> --help\` for details on a verb."
    `);
  });

  it("handles a noun with no verbs", () => {
    expect(formatNounHelp("pragma", "ghost", [])).toBe(
      'No commands found for "ghost".',
    );
  });
});
