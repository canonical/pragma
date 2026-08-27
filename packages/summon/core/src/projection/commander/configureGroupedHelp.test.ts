import { Command } from "commander";
import { describe, expect, it } from "vitest";
import type PromptDefinition from "../../types/PromptDefinition.js";
import type { HostFlags } from "../types.js";
import configureGroupedHelp from "./configureGroupedHelp.js";

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

  it("a host renderer replaces the shared presentation on grouped prompts", () => {
    const cmd = new Command("react").description("React component");
    configureGroupedHelp(cmd, grouped, HOST_FLAGS, (usage, description) => {
      return `HOST HELP ${usage} — ${description}\n`;
    });
    expect(cmd.helpInformation()).toBe(
      "HOST HELP react [options] — React component\n",
    );
  });

  it("a host renderer installs unconditionally — ungrouped prompts included", () => {
    const cmd = new Command("plain").description("No groups");
    configureGroupedHelp(
      cmd,
      [{ name: "one", type: "text", message: "One:" }],
      HOST_FLAGS,
      (usage, _description, groups, hostFlags) => {
        // The structure still arrives whole: the one default group and the
        // host block are the renderer's to present.
        return `HOST HELP ${usage} groups=${groups.size} host=${hostFlags.length}\n`;
      },
    );
    // Ungrouped prompts skip installation ONLY on the default path; a host
    // with one style for every leaf gets it here too.
    expect(cmd.helpInformation()).toBe(
      "HOST HELP plain [options] groups=1 host=2\n",
    );
  });
});
