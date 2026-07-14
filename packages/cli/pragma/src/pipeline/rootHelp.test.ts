import type { CommandDefinition } from "@canonical/cli-core";
import { describe, expect, it } from "vitest";
import formatRootHelp from "./rootHelp.js";

/** Minimal command stub — only the fields the help renderer reads. */
function cmd(
  path: string[],
  extra: Partial<CommandDefinition> = {},
): CommandDefinition {
  return {
    path,
    description: `${path.join(" ")} description`,
    parameters: [],
    execute: async () => ({ tag: "output" }) as never,
    ...extra,
  };
}

const commands: CommandDefinition[] = [
  cmd(["block", "list"]),
  cmd(["token", "list"]),
  cmd(["create", "component"], {
    parameters: [
      {
        name: "framework",
        description: "Component framework",
        type: "select",
        positional: true,
        required: true,
        choices: [
          { label: "react", value: "react" },
          { label: "svelte", value: "svelte" },
          { label: "lit", value: "lit" },
        ],
      },
    ],
  }),
  cmd(["create", "package"]),
  cmd(["doctor"]),
  cmd(["mystery", "verb"], { description: "an uncatalogued thing" }),
];

describe("formatRootHelp", () => {
  const out = formatRootHelp("pragma", "Design system CLI", commands);

  it("groups nouns under task-oriented headings instead of a flat list", () => {
    expect(out).toContain("Explore the design system");
    expect(out).toContain("Generate code");
    expect(out).toContain("Set up & maintain");
  });

  it("gives real summaries, never the `<noun> commands` placeholder", () => {
    expect(out).toContain("Look up design tokens and their values");
    expect(out).not.toContain("block commands");
    expect(out).not.toContain("token commands");
  });

  it("expands create with its subtypes and derived frameworks", () => {
    expect(out).toContain("component");
    expect(out).toContain("react · svelte · lit");
    expect(out).toContain("package");
  });

  it("surfaces uncatalogued nouns under Other instead of dropping them", () => {
    expect(out).toContain("Other");
    expect(out).toContain("mystery");
    expect(out).toContain("an uncatalogued thing");
  });

  it("always lists the mcp server command even without a definition", () => {
    const withoutMcp = commands.filter((c) => c.path[0] !== "mcp");
    const rendered = formatRootHelp("pragma", "d", withoutMcp);
    expect(rendered).toContain("mcp");
    expect(rendered).toContain("Start the MCP server over stdio");
  });

  it("hides nouns that are catalogued but not registered", () => {
    // `standard` is catalogued but absent from this command set.
    expect(out).not.toContain("Browse code standards");
  });

  it("lists the global flags and an orientation hint", () => {
    expect(out).toContain("Global flags");
    expect(out).toContain("--format json");
    expect(out).toContain("pragma capabilities");
  });
});
