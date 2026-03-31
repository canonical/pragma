/**
 * Registry of known AI harnesses with their detection signals and config paths.
 * Pure data — adding a new harness is adding an entry, not writing new code.
 *
 * Multiple entries may exist for the same harness ID with different version
 * ranges to handle config format changes across versions.
 */

import type { HarnessDefinition } from "./types.js";

const harnesses: readonly HarnessDefinition[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    version: "*",
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
    version: "*",
    detect: [{ type: "directory", path: ".cursor" }],
    configPath: (root) => `${root}/.cursor/mcp.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.cursor/skills`,
  },
  {
    id: "windsurf",
    name: "Windsurf",
    version: "*",
    detect: [
      { type: "directory", path: ".windsurf" },
      { type: "file", path: "~/.codeium/windsurf/mcp_config.json" },
    ],
    configPath: () =>
      `${process.env.HOME ?? ""}/.codeium/windsurf/mcp_config.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.windsurf/skills`,
  },
  // Cline is disabled: it shares .vscode/mcp.json with VS Code, causing
  // duplicate prompts and double-writes during `pragma setup mcp`.
  // {
  //   id: "cline",
  //   name: "Cline",
  //   version: "*",
  //   detect: [
  //     { type: "directory", path: ".vscode" },
  //     { type: "extension", id: "saoudrizwan.claude-dev" },
  //   ],
  //   configPath: (root) => `${root}/.vscode/mcp.json`,
  //   configFormat: "json",
  //   mcpKey: "mcpServers",
  //   skillsPath: (root) => `${root}/.agents/skills`,
  // },
  {
    id: "roo-code",
    name: "Roo Code",
    version: "*",
    detect: [
      { type: "directory", path: ".roo" },
      { type: "extension", id: "rooveterinaryinc.roo-cline" },
    ],
    configPath: (root) => `${root}/.roo/mcp.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.roo/skills`,
  },
  {
    id: "opencode",
    name: "OpenCode",
    version: "*",
    detect: [{ type: "file", path: "opencode.json" }],
    configPath: (root) => `${root}/opencode.json`,
    configFormat: "json",
    mcpKey: "mcp",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    version: "*",
    detect: [{ type: "directory", path: ".gemini" }],
    configPath: (root) => `${root}/.gemini/settings.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "codex",
    name: "Codex",
    version: "*",
    detect: [{ type: "directory", path: ".codex" }],
    configPath: (root) => `${root}/.codex/config.toml`,
    configFormat: "toml",
    mcpKey: "mcp_servers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "vscode",
    name: "VS Code",
    version: "*",
    detect: [
      { type: "directory", path: ".vscode" },
      { type: "file", path: ".vscode/mcp.json" },
    ],
    configPath: (root) => `${root}/.vscode/mcp.json`,
    configFormat: "json",
    mcpKey: "servers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
];

export default harnesses;
