import { describe, expect, it } from "vitest";
import createExitResult from "./createExitResult.js";
import {
  formatHelp,
  formatLlmHelp,
  formatNounHelp,
  formatVerbHelp,
} from "./help.js";
import type { CommandDefinition } from "./types.js";

function findCommand(noun: string, verb: string): CommandDefinition {
  const cmd = makeCommands().find(
    (c) => c.path[0] === noun && c.path[1] === verb,
  );
  if (!cmd)
    throw new Error(`Command ${noun} ${verb} not found in test fixtures`);
  return cmd;
}

function makeCommands(): CommandDefinition[] {
  return [
    {
      path: ["component", "list"],
      description: "List components in current tier",
      parameters: [
        {
          name: "allTiers",
          description: "Include all tiers",
          type: "boolean",
        },
      ],
      execute: async () => createExitResult(0),
    },
    {
      path: ["component", "get"],
      description: "Get component details",
      parameters: [
        {
          name: "name",
          description: "Component name",
          type: "string",
          positional: true,
          required: true,
        },
        {
          name: "detailed",
          description: "Full detail (anatomy, modifiers, tokens, standards)",
          type: "boolean",
        },
        {
          name: "anatomy",
          description: "Show anatomy tree only",
          type: "boolean",
        },
      ],
      execute: async () => createExitResult(0),
      meta: {
        examples: [
          "pragma component get Button",
          "pragma component get Button --detailed --llm",
          "pragma component get Button --anatomy",
        ],
      },
      parameterGroups: {
        "Aspect flags": ["anatomy"],
      },
    },
    {
      path: ["standard", "list"],
      description: "List standards",
      parameters: [
        {
          name: "category",
          description: "Filter by category",
          type: "string",
        },
      ],
      execute: async () => createExitResult(0),
    },
    {
      path: ["info"],
      description: "Project health and versions",
      parameters: [],
      execute: async () => createExitResult(0),
    },
  ];
}

describe("help", () => {
  describe("formatNounHelp", () => {
    it("lists verbs for a noun", () => {
      const output = formatNounHelp("pragma", "component", makeCommands());

      expect(output).toContain("Usage: pragma component <verb> [options]");
      expect(output).toContain("Verbs:");
      expect(output).toContain("list");
      expect(output).toContain("List components in current tier");
      expect(output).toContain("get");
      expect(output).toContain("Get component details");
    });

    it("includes footer with help hint", () => {
      const output = formatNounHelp("pragma", "component", makeCommands());
      expect(output).toContain(
        "Run `pragma component <verb> --help` for verb-specific help.",
      );
    });

    it("returns message for unknown noun", () => {
      const output = formatNounHelp("pragma", "unknown", makeCommands());
      expect(output).toContain('No commands found for "unknown"');
    });
  });

  describe("formatVerbHelp", () => {
    it("shows usage line with positional args", () => {
      const cmd = findCommand("component", "get");
      const output = formatVerbHelp("pragma", cmd);

      expect(output).toContain("Usage: pragma component get <name> [flags]");
    });

    it("shows command description", () => {
      const cmd = findCommand("component", "get");
      const output = formatVerbHelp("pragma", cmd);

      expect(output).toContain("Get component details");
    });

    it("shows flags with descriptions", () => {
      const cmd = findCommand("component", "get");
      const output = formatVerbHelp("pragma", cmd);

      expect(output).toContain("--detailed");
      expect(output).toContain(
        "Full detail (anatomy, modifiers, tokens, standards)",
      );
    });

    it("shows examples when present", () => {
      const cmd = findCommand("component", "get");
      const output = formatVerbHelp("pragma", cmd);

      expect(output).toContain("Examples:");
      expect(output).toContain("pragma component get Button");
      expect(output).toContain("pragma component get Button --detailed --llm");
    });

    it("groups parameters when parameterGroups defined", () => {
      const cmd = findCommand("component", "get");
      const output = formatVerbHelp("pragma", cmd);

      expect(output).toContain("Aspect flags:");
      expect(output).toContain("--anatomy");
    });

    it("handles command without positional args", () => {
      const cmd = findCommand("component", "list");
      const output = formatVerbHelp("pragma", cmd);

      expect(output).toContain("Usage: pragma component list [flags]");
      expect(output).not.toContain("<");
    });
  });

  describe("formatHelp", () => {
    it("shows program name and description", () => {
      const output = formatHelp(
        "pragma",
        "semantic design system CLI",
        makeCommands(),
      );

      expect(output).toContain("pragma — semantic design system CLI");
    });

    it("shows usage line", () => {
      const output = formatHelp("pragma", "test", makeCommands());
      expect(output).toContain("Usage: pragma <command> [options]");
    });

    it("lists command nouns", () => {
      const output = formatHelp("pragma", "test", makeCommands());

      expect(output).toContain("component");
      expect(output).toContain("standard");
      expect(output).toContain("info");
    });

    it("shows global flags", () => {
      const output = formatHelp("pragma", "test", makeCommands());

      expect(output).toContain("Global flags:");
      expect(output).toContain("--llm");
      expect(output).toContain("--format json");
      expect(output).toContain("--verbose");
      expect(output).toContain("--help");
      expect(output).toContain("--version");
    });

    it("includes help footer", () => {
      const output = formatHelp("pragma", "test", makeCommands());
      expect(output).toContain(
        "Run `pragma <command> --help` for command-specific help.",
      );
    });

    it("uses semantic grouping when provided", () => {
      const output = formatHelp("pragma", "test", makeCommands(), [
        { name: "Query", nouns: ["component", "standard"] },
        { name: "Utility", nouns: ["info"] },
      ]);

      // Nouns should appear in group order
      const componentIdx = output.indexOf("component");
      const standardIdx = output.indexOf("standard");
      const infoIdx = output.indexOf("info");
      expect(componentIdx).toBeLessThan(standardIdx);
      expect(standardIdx).toBeLessThan(infoIdx);
    });
  });

  describe("formatLlmHelp", () => {
    it("produces Markdown heading with program name", () => {
      const output = formatLlmHelp("pragma", makeCommands());
      expect(output).toContain("# pragma commands");
    });

    it("groups by noun as h2 headings", () => {
      const output = formatLlmHelp("pragma", makeCommands());
      expect(output).toContain("## component");
      expect(output).toContain("## standard");
      expect(output).toContain("## info");
    });

    it("includes command paths and descriptions", () => {
      const output = formatLlmHelp("pragma", makeCommands());
      expect(output).toContain("`pragma component list`");
      expect(output).toContain("List components in current tier");
    });

    it("shows positional args in command path", () => {
      const output = formatLlmHelp("pragma", makeCommands());
      expect(output).toContain("`pragma component get <name>`");
    });

    it("shows flags for commands", () => {
      const output = formatLlmHelp("pragma", makeCommands());
      expect(output).toContain("--detailed");
      expect(output).toContain("--anatomy");
    });
  });
});
