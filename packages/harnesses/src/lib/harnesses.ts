/**
 * Registry of known AI harnesses with their detection signals and config paths.
 * Pure data — adding a new harness is adding an entry, not writing new code.
 */

import type { HarnessDefinition } from "./types.js";

const harnesses: readonly HarnessDefinition[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    detect: [
      { type: "directory", path: "~/.claude" },
      { type: "file", path: ".mcp.json" },
    ],
    configPath: (root) => `${root}/.mcp.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.claude/skills`,
  },
  {
    id: "cursor",
    name: "Cursor",
    detect: [{ type: "directory", path: ".cursor" }],
    configPath: (root) => `${root}/.cursor/mcp.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.cursor/skills`,
  },
  {
    id: "windsurf",
    name: "Windsurf",
    detect: [{ type: "directory", path: ".windsurf" }],
    configPath: (root) => `${root}/.windsurf/mcp.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.windsurf/skills`,
  },
  {
    id: "cline",
    name: "Cline",
    detect: [
      { type: "directory", path: ".vscode" },
      { type: "extension", id: "saoudrizwan.claude-dev" },
    ],
    configPath: (root) => `${root}/.vscode/mcp.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "roo-code",
    name: "Roo Code",
    detect: [
      { type: "directory", path: ".vscode" },
      { type: "extension", id: "rooveterinaryinc.roo-cline" },
    ],
    configPath: (root) => `${root}/.vscode/mcp.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
];

export default harnesses;
