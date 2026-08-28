/**
 * Registry of known AI harnesses with their detection signals and config paths.
 * Pure data — adding a new harness is adding an entry, not writing new code.
 *
 * Multiple entries may exist for the same harness ID with different version
 * ranges to handle config format changes across versions.
 */

import {
  copilotMcpEntry,
  cursorMcpEntry,
  opencodeMcpEntry,
  opendesignMcpEntry,
} from "./mcpEntries.js";
import { userHome, xdgConfigHome } from "./platformPaths.js";
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
    // Confirmed (was VERIFY(7b)): "User-scoped servers are stored in
    // ~/.claude.json" — https://code.claude.com/docs/en/mcp (2026-08-27).
    homeConfigPath: (p) => `${userHome(p)}/.claude.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.claude/skills`,
  },
  {
    id: "cursor",
    name: "Cursor",
    version: "*",
    scope: "both",
    detect: [{ type: "directory", path: ".cursor" }],
    configPath: (root) => `${root}/.cursor/mcp.json`,
    // Cursor documents a global band: "~/.cursor/mcp.json" alongside the
    // project ".cursor/mcp.json" — https://cursor.com/docs/context/mcp
    // (2026-08-27).
    homeConfigPath: (p) => `${userHome(p)}/.cursor/mcp.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    // Cursor's MCP docs (https://cursor.com/docs/context/mcp) type stdio
    // entries with `type: "stdio"`.
    mcpEntry: cursorMcpEntry,
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
    // VERIFY(7h): OpenCode reads a GLOBAL config as well as a project one, and
    // merges them — https://opencode.ai/docs/config/ lists
    // `~/.config/opencode/opencode.json` above the project file in its
    // precedence order, with later sources overriding earlier ones "only for
    // conflicting keys". Declaring project-only meant the global band — the
    // default, and the band this product focuses on — installed every other
    // harness and silently skipped this one.
    scope: "both",
    detect: [
      { type: "file", path: "opencode.json" },
      { type: "directory", path: "$XDG_CONFIG_HOME/opencode" },
      { type: "process", name: "opencode" },
    ],
    configPath: (root) => `${root}/opencode.json`,
    // VERIFY(7h): the global config path, per the docs above. Through
    // `xdgConfigHome`, not `userHome`: `~/.config/<tool>` is the XDG
    // convention, so a user with `$XDG_CONFIG_HOME` set keeps it elsewhere and
    // writing under home would install into a file OpenCode never reads.
    homeConfigPath: (p) => `${xdgConfigHome(p)}/opencode/opencode.json`,
    configFormat: "json",
    mcpKey: "mcp",
    // OpenCode's schema (https://opencode.ai/config.json, $defs.McpLocalConfig)
    // requires `type: "local"` + `command` as a string array and rejects
    // unknown keys — the default `{command, args, cwd}` shape fails its
    // validation three ways (S1-3).
    mcpEntry: opencodeMcpEntry,
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    version: "*",
    scope: "both",
    detect: [
      { type: "directory", path: ".gemini" },
      { type: "process", name: "gemini" },
    ],
    configPath: (root) => `${root}/.gemini/settings.json`,
    // Gemini CLI documents a global band: "~/.gemini/settings.json" alongside
    // the project ".gemini/settings.json" —
    // https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md
    // (2026-08-27; `cwd` is an explicitly documented stdio field there too).
    homeConfigPath: (p) => `${userHome(p)}/.gemini/settings.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "codex",
    name: "Codex",
    version: "*",
    scope: "both",
    detect: [
      { type: "directory", path: ".codex" },
      { type: "process", name: "codex" },
    ],
    // Codex reads project-scoped overrides from ".codex/config.toml" (loaded
    // only for trusted projects) and its user config from
    // "$CODEX_HOME/config.toml" (default ~/.codex) —
    // https://developers.openai.com/codex/config-reference (2026-08-27).
    configPath: (root) => `${root}/.codex/config.toml`,
    homeConfigPath: (p) =>
      `${p.env.CODEX_HOME ?? `${userHome(p)}/.codex`}/config.toml`,
    configFormat: "toml",
    mcpKey: "mcp_servers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "copilot",
    name: "GitHub Copilot CLI",
    version: "*",
    // Global-only ON PURPOSE, although Copilot CLI also reads project files:
    // its project bands are ".mcp.json" (shared with Claude Code's row, same
    // `mcpServers` key — one write covers both) and ".github/mcp.json". A
    // project row here would put a SECOND serializer on the same
    // (path, mcpKey) write the Claude Code row owns; the home config is the
    // only location nothing else covers.
    scope: "global",
    detect: [
      { type: "directory", path: "~/.copilot" },
      { type: "process", name: "copilot" },
    ],
    // Never resolved (global-only band), but the type requires one; kept at
    // the documented project fallback shape for legibility.
    configPath: (root) => `${root}/.mcp.json`,
    // "~/.copilot/mcp-config.json", relocatable via COPILOT_HOME —
    // https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
    // (2026-08-27).
    homeConfigPath: (p) =>
      `${p.env.COPILOT_HOME ?? `${userHome(p)}/.copilot`}/mcp-config.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    // Its documented local-entry shape carries `type: "local"` and a `tools`
    // grant — see `copilotMcpEntry`.
    mcpEntry: copilotMcpEntry,
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "antigravity",
    name: "Antigravity",
    version: "*",
    scope: "both",
    detect: [
      { type: "file", path: ".agents/mcp_config.json" },
      { type: "file", path: "~/.gemini/config/mcp_config.json" },
      { type: "process", name: "antigravity" },
    ],
    // Antigravity documents a workspace band at ".agents/mcp_config.json" and
    // a global band at "~/.gemini/config/mcp_config.json", both under
    // `mcpServers` — https://antigravity.google/docs/ide/mcp/ (2026-08-27).
    // (The Nov-2025 launch path "~/.gemini/antigravity/mcp_config.json" is
    // legacy; the docs' current path is the one written here.)
    configPath: (root) => `${root}/.agents/mcp_config.json`,
    homeConfigPath: (p) => `${userHome(p)}/.gemini/config/mcp_config.json`,
    configFormat: "json",
    mcpKey: "mcpServers",
    skillsPath: (root) => `${root}/.agents/skills`,
  },
  {
    id: "vscode",
    name: "VS Code",
    version: "*",
    scope: "project",
    // The first two signals are PROJECT-relative (`resolveFsPath` resolves an
    // unprefixed path against `ctx.projectRoot`), so on their own this row can
    // only see "this repo carries a committed `.vscode/`" — a developer with
    // VS Code installed and `.vscode/` gitignored, the common case, was
    // invisible. The three that follow are the user-level and binary probes
    // every sibling GUI-editor row already has:
    // - `$XDG_CONFIG_HOME/Code/User` is VS Code's user config dir on Linux. It
    //   is spelled in XDG form deliberately (see `resolveFsPath`'s docblock): a
    //   user who sets `$XDG_CONFIG_HOME` keeps nothing under `~/.config`, so a
    //   `~/.config/Code/User` literal would report the editor absent.
    // - `~/.vscode/extensions` is present on any install with ≥1 extension, and
    //   is the same directory `checkExtension` already globs on behalf of Cline
    //   and Roo Code.
    // - `code` on PATH covers `/usr/bin/code` (deb), `/snap/bin/code` (the snap
    //   is CLASSIC confinement, so its home and PATH are the real ones) and
    //   `code.cmd` on win32 — `executableCandidates` owns those rules.
    // Tiers fall out of `toSignalTier` correctly: the dirs score `high`, the
    // process `medium` — right, since `code` on PATH means "installed", not
    // "this project uses it".
    detect: [
      { type: "directory", path: ".vscode" },
      { type: "file", path: ".vscode/mcp.json" },
      { type: "directory", path: "$XDG_CONFIG_HOME/Code/User" },
      { type: "directory", path: "~/.vscode/extensions" },
      { type: "process", name: "code" },
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
    mcpEntry: opendesignMcpEntry,
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

// Deliberately ABSENT from the registry (product calls, not oversights):
//
// - `pi` (github.com/earendil-works/pi): no first-party MCP client exists —
//   the README states "No MCP" outright; MCP reaches pi only through the
//   third-party pi-mcp-adapter extension a user installs themselves. A row
//   here would write config pi itself never reads. pi IS served on the skills
//   side without a row: it reads `.agents/skills`, the cross-client directory
//   `setup skills` always links into.
//
// - `vscodium` as an MCP CLIENT: VSCodium has no first-party MCP surface (no
//   Copilot agent mode), so there is nothing to configure. As an extension
//   HOST it is fully supported via the editor-CLI registry (`editors.ts`).

export default harnesses;
