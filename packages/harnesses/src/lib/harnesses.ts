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
  {
    id: "opencode",
    name: "OpenCode",
    detect: [{ type: "file", path: ".opencode.json" }],
    configPath: (root) => `${root}/.opencode.json`,
    configFormat: "json",
    mcpKey: "mcp",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    detect: [{ type: "file", path: ".gemini/settings.json" }],
    configPath: (root) => `${root}/.gemini/settings.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "codex",
    name: "Codex",
    detect: [{ type: "file", path: ".codex/config.json" }],
    configPath: (root) => `${root}/.codex/config.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "vscode",
    name: "VS Code",
    detect: [{ type: "directory", path: ".vscode" }],
    configPath: (root) => `${root}/.vscode/mcp.json`,
    configFormat: "json",
    mcpKey: "servers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
];

export default harnesses;
