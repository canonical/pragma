import { Command } from "commander";
import { describe, expect, it } from "vitest";
import type PromptDefinition from "../types/PromptDefinition.js";
import {
  buildOptionGroups,
  configureGroupedHelp,
  formatGroupedHelp,
} from "./groupedHelp.js";
import type { HostFlags } from "./types.js";

const HOST_FLAGS: HostFlags = [
  { flags: "-d, --dry-run", description: "Preview without writing files" },
  { flags: "-h, --help", description: "display help for command" },
];

const grouped: PromptDefinition[] = [
  {
    name: "componentPath",
    type: "text",
    message: "Component path:",
    group: "Component",
  },
  {
    name: "withStyles",
    type: "confirm",
    message: "Include styles?",
    default: true,
    group: "Options",
  },
  { name: "bare", type: "text", message: "Ungrouped:" },
];

describe("buildOptionGroups", () => {
  it("buckets options by group, defaulting to Generator Options", () => {
    const groups = buildOptionGroups(grouped);
    expect([...groups.keys()]).toEqual([
      "Component",
      "Options",
      "Generator Options",
    ]);
    expect(groups.get("Options")?.[0]?.flags).toBe("--no-with-styles");
  });
});

describe("configureGroupedHelp", () => {
  it("installs grouped help when prompts declare groups", () => {
    const cmd = new Command("react").description("React component");
    configureGroupedHelp(cmd, grouped, HOST_FLAGS);
    const help = cmd.helpInformation();
    expect(help).toContain("Usage: react [options]");
    expect(help).toContain("\nReact component\n");
    expect(help).toContain("Global Options:");
    expect(help).toContain(
      "  -d, --dry-run               Preview without writing files",
    );
    expect(help).toContain("Component:");
    expect(help).toContain("  --component-path <value>    Component path:");
    expect(help).toContain("Options:");
    expect(help).toContain("Generator Options:");
  });

  it("leaves Commander's default help for ungrouped prompts", () => {
    const cmd = new Command("plain").description("No groups");
    configureGroupedHelp(
      cmd,
      [{ name: "one", type: "text", message: "One:" }],
      HOST_FLAGS,
    );
    // Commander's default help shows an Options: section, not our global block.
    expect(cmd.helpInformation()).not.toContain("Global Options:");
  });
});

describe("formatGroupedHelp", () => {
  it("omits the description block when the command has none", () => {
    const cmd = new Command("bare");
    const help = formatGroupedHelp(cmd, cmd.createHelp(), new Map(), []);
    expect(help).toBe("Usage: bare [options]\n\nGlobal Options:\n");
  });

  it("renders a declared defaultValue and a description-less row", () => {
    const groups = new Map([
      [
        "G",
        [
          {
            flags: "--x <value>",
            description: "X:",
            defaultValue: "d",
            promptName: "x",
            kebabName: "x",
          },
          {
            flags: "--marker",
            description: "",
            promptName: "marker",
            kebabName: "marker",
          },
        ],
      ],
    ]);
    const cmd = new Command("c");
    const help = formatGroupedHelp(cmd, cmd.createHelp(), groups, []);
    expect(help).toContain('  --x <value>                 X: (default: "d")');
    expect(help).toContain("\n  --marker\n");
  });

  it("pads short terms to the column and long terms by two spaces", () => {
    const groups = new Map([
      [
        "G",
        [
          {
            flags: "--a-very-long-flag-name-over-width <value>",
            description: "Long.",
            promptName: "x",
            kebabName: "x",
          },
        ],
      ],
    ]);
    const cmd = new Command("c");
    const help = formatGroupedHelp(cmd, cmd.createHelp(), groups, []);
    expect(help).toContain(
      "  --a-very-long-flag-name-over-width <value>  Long.",
    );
  });
});
