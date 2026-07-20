/**
 * Registry of known AI harnesses with their detection signals and config paths.
 * Pure data — adding a new harness is adding an entry, not writing new code.
 *
 * Multiple entries may exist for the same harness ID with different version
 * ranges to handle config format changes across versions.
 */

import { userHome } from "./platformPaths.js";
import type { HarnessDefinition } from "./types.js";

const harnesses: readonly HarnessDefinition[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    version: "*",
    scope: "both",
    detect: [
      { type: "directory", path: "~/.claude" },
      { type: "file", path: ".mcp.json" },
      { type: "process", name: "claude" },
    ],
    configPath: (root) => `${root}/.mcp.json`,
    // VERIFY(7b): claude-code reads the user MCP config from ~/.claude.json.
    homeConfigPath: (p) => `${userHome(p)}/.claude.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.claude/skills`,
  },
  {
    id: "cursor",
    name: "Cursor",
    version: "*",
    scope: "project",
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
    scope: "global",
    detect: [
      { type: "directory", path: ".windsurf" },
      { type: "file", path: "~/.codeium/windsurf/mcp_config.json" },
    ],
    // Windsurf is global-only; this project path is never resolved (its band is
    // always global) but the type requires one.
    configPath: (root) => `${root}/.windsurf/mcp_config.json`,
    homeConfigPath: (p) => `${userHome(p)}/.codeium/windsurf/mcp_config.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.windsurf/skills`,
  },
  {
    id: "cline",
    name: "Cline",
    version: "*",
    scope: "project",
    // Cline is a VS Code EXTENSION, not a directory owner — a bare `.vscode`
    // directory belongs to VS Code itself, so keying off it would false-detect
    // Cline in every VS Code project (and write an inert `mcpServers` block
    // there). Detect Cline ONLY by its installed extension.
    detect: [{ type: "extension", id: "saoudrizwan.claude-dev" }],
    configPath: (root) => `${root}/.vscode/mcp.json`,
    // VERIFY(7a): if Cline reads 'servers' (like VS Code) rather than
    // 'mcpServers', collapse this to a single shared write with VS Code. Today
    // Cline uses `mcpServers` and VS Code uses `servers`, so the two-level dedup
    // writes both keys into .vscode/mcp.json, each preserving the other.
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "roo-code",
    name: "Roo Code",
    version: "*",
    scope: "project",
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
    scope: "project",
    detect: [
      { type: "file", path: "opencode.json" },
      { type: "process", name: "opencode" },
    ],
    configPath: (root) => `${root}/opencode.json`,
    configFormat: "json",
    mcpKey: "mcp",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    version: "*",
    scope: "project",
    detect: [
      { type: "directory", path: ".gemini" },
      { type: "process", name: "gemini" },
    ],
    configPath: (root) => `${root}/.gemini/settings.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "codex",
    name: "Codex",
    version: "*",
    scope: "project",
    detect: [
      { type: "directory", path: ".codex" },
      { type: "process", name: "codex" },
    ],
    configPath: (root) => `${root}/.codex/config.toml`,
    configFormat: "toml",
    mcpKey: "mcp_servers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "vscode",
    name: "VS Code",
    version: "*",
    scope: "project",
    detect: [
      { type: "directory", path: ".vscode" },
      { type: "file", path: ".vscode/mcp.json" },
    ],
    configPath: (root) => `${root}/.vscode/mcp.json`,
    configFormat: "json",
    mcpKey: "servers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "opendesign",
    name: "OpenDesign",
    version: "*",
    scope: "both",
    // VERIFY(7g): OpenDesign requires the MCP server `env` to be a JSON map.
    normalizeEnv: true,
    detect: [
      { type: "directory", path: ".od" },
      {
        type: "process",
        name: "od",
        // VERIFY(7g): guard the Unix `od` (octal dump) false-positive — only a
        // binary whose --version identifies OpenDesign counts.
        verify: { args: ["--version"], match: /open-?design/i },
      },
    ],
    // VERIFY(7g): OpenDesign project + home MCP config paths and skills dir.
    configPath: (root) => `${root}/.od/mcp-config.json`,
    homeConfigPath: (p) => `${userHome(p)}/.od/mcp-config.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.od/skills`,
  },
];

export default harnesses;
