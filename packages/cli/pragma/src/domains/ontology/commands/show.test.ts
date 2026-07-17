import type { CommandDefinition } from "@canonical/cli-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import createTestRuntime from "../../../testing/helpers/createTestRuntime.js";
import type { PragmaContext } from "../../shared/context.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type { OntologyShowInput } from "../formatters/index.js";
import buildShowCommand from "./show.js";

let runtime: PragmaRuntime;

beforeAll(async () => {
  runtime = await createTestRuntime();
});

afterAll(() => {
  runtime.dispose();
});

function makeCtx(overrides: Partial<PragmaContext> = {}): PragmaContext {
  return {
    ...runtime,
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    ...overrides,
  };
}

async function executeOutput(
  cmd: CommandDefinition,
  params: Record<string, unknown>,
  ctx: PragmaContext,
): Promise<{ value: unknown; text: string }> {
  const result = await cmd.execute(params, ctx);
  expect(result.tag).toBe("output");
  if (result.tag !== "output") throw new Error("Expected output result");
  return { value: result.value, text: result.render.plain(result.value) };
}

describe("ontology show command", () => {
  it("returns ontology details", async () => {
    const ctx = makeCtx();
    const cmd = buildShowCommand(ctx);
    const { value } = await executeOutput(cmd, { prefix: "ds" }, ctx);

    const { ontology } = value as OntologyShowInput;
    expect(ontology.prefix).toBe("ds");
    expect(ontology.classes.length).toBeGreaterThan(0);
    const propertyCount =
      ontology.classes.reduce((n, c) => n + c.properties.length, 0) +
      ontology.unattached.length;
    expect(propertyCount).toBeGreaterThan(0);
  });

  it("deep-dives into a class via the class param", async () => {
    const ctx = makeCtx();
    const cmd = buildShowCommand(ctx);
    const { value, text } = await executeOutput(
      cmd,
      { prefix: "ds", class: "Component" },
      ctx,
    );

    const { ontology } = value as OntologyShowInput;
    expect(ontology.focus?.iri).toBe("ds:Component");
    expect(text).toContain("Component");
    expect(text).toContain("extends:");
    // Follow-up querying: the deep dive hands over runnable SPARQL.
    expect(text).toContain(
      "SELECT ?instance WHERE { ?instance a ds:Component }",
    );
  });

  it("hides attributes by default and shows them with --properties", async () => {
    const ctx = makeCtx();
    const cmd = buildShowCommand(ctx);

    const bare = await executeOutput(cmd, { prefix: "ds" }, ctx);
    // Attributes render as `label: range` — absent by default.
    expect(bare.text).not.toContain(": xsd:");
    // hasModifierFamily is an object property (relation) — always shown.
    expect(bare.text).toContain("hasModifierFamily");

    const withProps = await executeOutput(
      cmd,
      { prefix: "ds", properties: true },
      ctx,
    );
    expect(withProps.text).toContain(": xsd:");
  });

  it("expands IRIs with --full-uris", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildShowCommand(ctx);
    const { value, text } = await executeOutput(
      cmd,
      { prefix: "ds", fullUris: true },
      ctx,
    );

    const { ontology } = value as OntologyShowInput;
    const component = ontology.classes.find((c) => c.label === "Component");
    expect(component?.iri).toBe("https://ds.canonical.com/Component");
    expect(text).toContain("https://ds.canonical.com/Component");
    // The seeded footer query must stay valid SPARQL: full URIs need <...>.
    expect(text).toMatch(/\?s a <https:\/\/ds\.canonical\.com\//);
  });

  it("completes ontology prefixes", async () => {
    const ctx = makeCtx();
    const cmd = buildShowCommand(ctx);
    const complete = cmd.parameters[0]?.complete;

    expect(complete).toBeTypeOf("function");
    const matches = await complete?.("d", ctx);
    expect(matches).toContain("ds");
  });

  it("completes class names for --class", async () => {
    const ctx = makeCtx();
    const cmd = buildShowCommand(ctx);
    const classParam = cmd.parameters.find((p) => p.name === "class");
    const complete = classParam?.complete;

    expect(complete).toBeTypeOf("function");
    const matches = await complete?.("comp", ctx);
    expect(matches).toContain("Component");
    // Case-insensitive prefix match, sorted, no non-matches.
    expect(matches?.every((m) => m.toLowerCase().startsWith("comp"))).toBe(
      true,
    );
  });

  it("renders plain output", async () => {
    const ctx = makeCtx();
    const cmd = buildShowCommand(ctx);
    const { text } = await executeOutput(cmd, { prefix: "ds" }, ctx);

    expect(text).toContain("Ontology ds:");
    expect(text).toContain("classes");
    // Hierarchy: children render beneath their parent with tree branches.
    expect(text).toContain("└─");
  });

  it("renders llm output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildShowCommand(ctx);
    const { text } = await executeOutput(cmd, { prefix: "ds" }, ctx);

    expect(text).toContain("## Ontology ds:");
    expect(text).toContain("### Classes");
  });

  it("renders json output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildShowCommand(ctx);
    const { text } = await executeOutput(cmd, { prefix: "ds" }, ctx);

    const parsed = JSON.parse(text) as { prefix: string };
    expect(parsed.prefix).toBe("ds");
  });

  it("throws structured error when prefix is missing", async () => {
    const ctx = makeCtx();
    const cmd = buildShowCommand(ctx);

    await expect(cmd.execute({}, ctx)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      recovery: {
        cli: "pragma ontology list",
        mcp: { tool: "ontology_list" },
      },
    });
  });
});
