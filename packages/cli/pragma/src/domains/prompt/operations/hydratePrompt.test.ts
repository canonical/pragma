import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_ORIGINS } from "#config";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import type { PragmaRuntime } from "../../shared/types/index.js";
import type { PromptDefinition } from "../types.js";
import hydratePrompt from "./hydratePrompt.js";

const ROWS = [
  { name: "Alpha", kind: "one" },
  { name: "Beta", kind: "two" },
];

function makeSpecs(): ToolSpec[] {
  return [
    {
      name: "thing_list",
      description: "List things.",
      params: {
        category: { type: "string", description: "Filter", optional: true },
        names: { type: "string[]", description: "Names", optional: true },
        detail: {
          type: "string",
          description: "Level",
          optional: true,
          enum: ["summary", "detailed"],
        },
      },
      readOnly: true,
      execute: async (_rt, params) => ({ data: { params, rows: ROWS } }),
    },
    {
      name: "boom_list",
      description: "Always fails.",
      readOnly: true,
      execute: async () => {
        throw new Error("kaput");
      },
    },
  ];
}

function makeRuntime(cwd: string): PragmaRuntime {
  return {
    store: {} as PragmaRuntime["store"],
    config: { tier: undefined, channel: "normal" },
    origins: DEFAULT_ORIGINS,
    cwd,
    packages: [],
    graphql: () => Promise.reject(new Error("no graphql in this test")),
    dispose: () => {},
  };
}

function text(result: { messages: { content: { text: string } }[] }): string {
  return result.messages[0]?.content.text ?? "";
}

describe("hydratePrompt", () => {
  let dir: string;
  let xdgDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-hydrate-"));
    mkdirSync(join(dir, ".git"));
    writeFileSync(join(dir, "pragma.config.json"), '{"tier":"apps"}');
    originalXdg = process.env.XDG_CONFIG_HOME;
    xdgDir = mkdtempSync(join(tmpdir(), "pragma-hydrate-xdg-"));
    process.env.XDG_CONFIG_HOME = xdgDir;
  });

  afterEach(() => {
    process.env.XDG_CONFIG_HOME = originalXdg;
    rmSync(dir, { recursive: true, force: true });
    rmSync(xdgDir, { recursive: true, force: true });
  });

  it("splices args and renders embeds as fenced JSON sections", async () => {
    const definition: PromptDefinition = {
      name: "demo",
      description: "Demo prompt.",
      arguments: { focus: { description: "Focus", required: true } },
      template: "Work on {{focus}}.",
      embed: [
        {
          tool: "thing_list",
          args: { category: "{{focus}}" },
          heading: "Things",
        },
      ],
    };

    const result = await hydratePrompt(
      makeRuntime(dir),
      definition,
      { focus: "alpha" },
      makeSpecs(),
    );

    expect(result.description).toBe("Demo prompt.");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.role).toBe("user");
    const body = text(result);
    expect(body).toContain("Work on alpha.");
    expect(body).toContain("## Things");
    expect(body).toContain('"category": "alpha"');
    expect(body).toContain("```json");
  });

  it("coerces embed args to the tool's declared types", async () => {
    const definition: PromptDefinition = {
      name: "demo",
      description: "Demo.",
      arguments: { focus: { description: "Focus", required: true } },
      template: "{{focus}}",
      embed: [
        {
          tool: "thing_list",
          args: { names: "{{focus}}", detail: "detailed" },
          heading: "Things",
        },
      ],
    };

    const result = await hydratePrompt(
      makeRuntime(dir),
      definition,
      { focus: "Alpha" },
      makeSpecs(),
    );

    // string[] param got a one-element array; enum param passed through.
    const body = text(result);
    const params = JSON.parse(
      body.slice(body.indexOf("```json") + 7, body.lastIndexOf("```")),
    ) as { params: Record<string, unknown> };
    expect(params.params).toEqual({ names: ["Alpha"], detail: "detailed" });
  });

  it("drops embed args whose placeholder spliced to empty", async () => {
    const definition: PromptDefinition = {
      name: "demo",
      description: "Demo.",
      arguments: { focus: { description: "Focus" } },
      template: "Focus: {{focus}}",
      embed: [
        {
          tool: "thing_list",
          args: { category: "{{focus}}" },
          heading: "Things",
        },
      ],
    };

    const result = await hydratePrompt(
      makeRuntime(dir),
      definition,
      {},
      makeSpecs(),
    );

    expect(text(result)).toContain('"params": {}');
  });

  it("rejects unknown args with the declared names", async () => {
    const definition: PromptDefinition = {
      name: "demo",
      description: "Demo.",
      arguments: { focus: { description: "Focus" } },
      template: "{{focus}}",
    };

    await expect(
      hydratePrompt(makeRuntime(dir), definition, { bogus: "x" }, makeSpecs()),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      validOptions: ["focus"],
    });
  });

  it("rejects a missing required arg with its description", async () => {
    const definition: PromptDefinition = {
      name: "demo",
      description: "Demo.",
      arguments: {
        focus: { description: "The focus area", required: true },
      },
      template: "{{focus}}",
    };

    await expect(
      hydratePrompt(makeRuntime(dir), definition, {}, makeSpecs()),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      recovery: { message: 'Required argument "focus": The focus area' },
    });
  });

  it("embeds pragma://state as the live state payload", async () => {
    const definition: PromptDefinition = {
      name: "demo",
      description: "Demo.",
      template: "Check the scope.",
      embed: [{ resource: "pragma://state", heading: "Active scope" }],
    };

    const result = await hydratePrompt(
      makeRuntime(dir),
      definition,
      {},
      makeSpecs(),
    );

    expect(text(result)).toContain("## Active scope");
    expect(text(result)).toContain('"value": "apps"');
  });

  it("truncates over-budget embeds with a pointer line", async () => {
    const definition: PromptDefinition = {
      name: "demo",
      description: "Demo.",
      template: "Tiny.",
      // 40 tokens = 160 chars — the rows JSON exceeds the remainder.
      budget: 40,
      embed: [
        { tool: "thing_list", heading: "Things" },
        { tool: "thing_list", heading: "More things" },
      ],
    };

    const result = await hydratePrompt(
      makeRuntime(dir),
      definition,
      {},
      makeSpecs(),
    );

    const body = text(result);
    expect(body).toContain("… truncated — run thing_list for the rest.");
    expect(body.length).toBeLessThan(1000);
  });

  it("degrades a failed embed to a warning line and keeps going", async () => {
    const warnings: string[] = [];
    const definition: PromptDefinition = {
      name: "demo",
      description: "Demo.",
      template: "Base template.",
      embed: [
        { tool: "boom_list", heading: "Broken" },
        { tool: "thing_list", heading: "Things" },
      ],
    };

    // The failing embed throws a plain Error, which propagates as ERROR;
    // hydration must not write to stdout on any path.
    const stdoutWrites: unknown[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown) => {
      stdoutWrites.push(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      const result = await hydratePrompt(
        makeRuntime(dir),
        definition,
        {},
        makeSpecs(),
        { onWarn: (line) => warnings.push(line) },
      );

      const body = text(result);
      expect(body).toContain("Base template.");
      expect(body).toContain(
        "⚠ could not hydrate Broken (ERROR) — run boom_list yourself.",
      );
      expect(body).toContain("## Things");
      expect(warnings).toHaveLength(1);
      expect(stdoutWrites).toHaveLength(0);
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  it("fails the embed (not the prompt) on an unknown tool param", async () => {
    const definition: PromptDefinition = {
      name: "demo",
      description: "Demo.",
      template: "Base.",
      embed: [{ tool: "thing_list", args: { nope: "x" }, heading: "Things" }],
    };

    const result = await hydratePrompt(
      makeRuntime(dir),
      definition,
      {},
      makeSpecs(),
    );

    expect(text(result)).toContain(
      "⚠ could not hydrate Things (INVALID_INPUT)",
    );
  });
});
