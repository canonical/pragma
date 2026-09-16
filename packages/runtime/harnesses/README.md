# Harnesses

Detects AI harnesses (Claude Code, Cursor, Windsurf, Cline, Roo Code, the VS Code family) and reads/writes their MCP server configuration. All operations are `@canonical/task` Tasks — dry-runnable, testable, composable.

```typescript
import { detectHarnesses, writeMcpConfig } from "@canonical/harnesses";
import { runTask } from "@canonical/task/node";

const detected = await runTask(detectHarnesses("/my/project"));
// [{ harness: { id: "claude-code", ... }, confidence: "high", configPath: "/my/project/.mcp.json" }]
```

## Installation

```bash
bun add @canonical/harnesses
```

Requires `@canonical/task` as a peer dependency.

## Detection

`detectHarnesses()` checks the filesystem for known harness signals and returns matches sorted by confidence.

```typescript
import { detectHarnesses } from "@canonical/harnesses";
import { runTask } from "@canonical/task/node";

const detected = await runTask(detectHarnesses("/my/project"));

for (const d of detected) {
  console.log(`${d.harness.name}: ${d.confidence}, config exists: ${d.configExists}`);
}
```

Each harness defines detection signals:

| Signal type | Confidence | Example |
|-------------|------------|---------|
| `directory` | high | `~/.vscode/extensions` exists |
| `file` | high | `.mcp.json` exists |
| `extension` | medium | VS Code extension installed |
| `process` | medium | `code` resolves on `PATH` |
| `env` | low | Environment variable hint |

A `directory`/`file` path is resolved by prefix: `$XDG_CONFIG_HOME/…` against the XDG config base, `%APPDATA%/…` against the platform config base (on win32, `%APPDATA%` falling back to `~/AppData/Roaming`), `~/…` against the platform home, **anything else against the project root**. The XDG form is spelled out rather than written `~/.config/…` — a user who sets `$XDG_CONFIG_HOME` keeps nothing under `~/.config` — and `%APPDATA%/…` exists for the same reason: a `~/AppData/Roaming/…` literal silently misses a relocated `%APPDATA%`, and a silent miss is a clean skip on a machine that has the tool.

A `process` signal is a `PATH` resolution, not a process-table scan: the named binary is tested for existence under every `PATH` directory (and, on win32, every `PATHEXT` suffix — `code.cmd`, not `code.exe`). For a VS Code-family CLI it is also tested inside that editor's macOS application bundle (`/Applications/<bundle>/Contents/Resources/app/bin/<cli>`, and the same under `~/Applications`), because a stock macOS install puts nothing on `PATH` until the user runs the palette's "Shell Command: Install '<cli>' command in PATH". It never launches anything unless the signal declares a `verify`.

A location that differs by platform is declared as one signal per platform, since any single match detects the harness: VS Code's user directory is `$XDG_CONFIG_HOME/Code/User` on Linux, `~/Library/Application Support/Code/User` on macOS and `%APPDATA%/Code/User` on Windows, and the row carries all three. (`$XDG_CONFIG_HOME` resolves under `~/.config` on macOS too, by design, so it does *not* cover the second.) The three must agree with `vscodeUserDir`, the helper the row's `homeConfigPath` resolves through — a row that detects a directory it then declines to write into reports the harness and configures nothing.

A row should carry both project-relative *and* user-level signals where the harness has them. Project-relative signals alone answer only "does this repo carry a committed config", which misses the common case of an installed editor with the config directory gitignored.

The distinction also decides the GLOBAL band. `listHarnessesForBand` admits a `both`-scoped row into the global band only when one of its own user-level signals matched: a committed `.vscode/` travels with the repository, so on its own it must not create a per-user config for every contributor who clones. A row whose every declared signal is project-relative (`cursor`) has nothing to earn the band with, so the rule leaves it alone. `DetectedHarness.matched` is what detection records for this — a tier cannot tell a project directory from one in the user's home, since both score `high`.

`homeConfigPath` may return `undefined`, which means "this harness has no per-user location ON THIS HOST" — not the same as a row that declares none, which is a registry error. The VS Code rows return it under WSL: the editor a WSL user drives is the Windows one, reading `%APPDATA%\Code\User\mcp.json` on the Windows side, so the Linux-side file is read by nothing. `resolveConfigTarget` reports that as no target and `groupConfigTargets` drops it, leaving the project file as the row's only band.

Multiple harnesses can be detected simultaneously — a developer may use both Claude Code and Cursor, and a VS Code install with a Cline extension detects **both** `vscode` and `cline` (they share `.vscode/mcp.json` under two different `mcpKey`s).

## MCP Configuration

Read, write, and remove MCP server entries from harness config files:

```typescript
import { findHarnessById, readMcpConfig, writeMcpConfig, removeMcpConfig } from "@canonical/harnesses";
import { runTask } from "@canonical/task/node";

const claude = findHarnessById("claude-code")!;

// Read existing servers
const servers = await runTask(readMcpConfig(claude, "/my/project"));

// Add or update a server entry (merges with existing config)
await runTask(writeMcpConfig(claude, "/my/project", "pragma", {
  command: "pragma",
  args: ["mcp"],
}));

// Remove a server entry
await runTask(removeMcpConfig(claude, "/my/project", "pragma"));
```

Config merge behaviour:
- If the config file doesn't exist, it is created (parent directory included)
- If the file exists, the new entry is merged into the existing `mcpServers` object
- Existing entries with the same name are overwritten
- All other entries and fields in the config file are preserved

## Harness Registry

The registry is pure data — adding a new harness is adding an entry, not writing new code.

| Harness | ID | Config path | Format | MCP key | Skills path |
|---------|-----|------------|--------|---------|-------------|
| Claude Code | `claude-code` | `.mcp.json` | JSON | `mcpServers` | `.claude/skills/` |
| Cursor | `cursor` | `.cursor/mcp.json` | JSON | `mcpServers` | `.cursor/skills/` |
| Windsurf | `windsurf` | `~/.codeium/windsurf/mcp_config.json` | JSON | `mcpServers` | `.windsurf/skills/` |
| Cline | `cline` | `.vscode/mcp.json` | JSON | `mcpServers` | `.agents/skills/` |
| Roo Code | `roo-code` | `.roo/mcp.json` | JSON | `mcpServers` | `.roo/skills/` |
| OpenCode | `opencode` | `opencode.json` | JSON | `mcp` | `.agents/skills/` |
| Gemini CLI | `gemini-cli` | `.gemini/settings.json` | JSON | `mcpServers` | `.agents/skills/` |
| Codex | `codex` | `.codex/config.toml` | TOML | `mcp_servers` | `.agents/skills/` |
| VS Code | `vscode` | `.vscode/mcp.json` · `<user dir>/Code/User/mcp.json` | JSON | `servers` | `.agents/skills/` |
| VS Code Insiders | `vscode-insiders` | `.vscode/mcp.json` · `<user dir>/Code - Insiders/User/mcp.json` | JSON | `servers` | `.agents/skills/` |
| VSCodium | `vscodium` | `.vscode/mcp.json` · `<user dir>/VSCodium/User/mcp.json` | JSON | `servers` | `.agents/skills/` |

The three VS Code products share the project file under one `servers` key, so the `(path, mcpKey)` write-dedup writes it once however many of them are detected; per user they are three separate directories. `<user dir>` is `vscodeUserDir`'s platform base: `$XDG_CONFIG_HOME` on Linux, `~/Library/Application Support` on macOS, `%APPDATA%` on Windows. Only the `vscode` row keys on `.vscode/` — the directory and the `mcp.json` in it belong to VS Code itself and name no product, so keying the forks on either would detect three editors on a machine with one.

Each entry includes a `version` field (semver range) to support config format changes across harness versions. Multiple entries can exist for the same harness ID with different version ranges.

Codex uses TOML config — config read/write operations are not yet supported for TOML-based harnesses.

```typescript
import { harnesses, findHarnessById } from "@canonical/harnesses";

// All known harnesses
console.log(harnesses.map(h => h.name));

// Lookup by ID
const cursor = findHarnessById("cursor");
console.log(cursor?.configPath("/project")); // "/project/.cursor/mcp.json"
console.log(cursor?.skillsPath("/project")); // "/project/.cursor/skills"
```

## Testing

Because every function returns a `Task`, tests never touch the filesystem:

```typescript
import { dryRunWith, collectEffects, type Effect } from "@canonical/task";
import { detectHarnesses } from "@canonical/harnesses";

test("detects Claude Code from ~/.claude directory", () => {
  const mocks = new Map([
    ["Exists", (effect: Effect) =>
      (effect as Effect & { _tag: "Exists" }).path.includes(".claude")],
  ]);

  const result = dryRunWith(detectHarnesses("/project"), mocks);
  expect(result.value[0].harness.id).toBe("claude-code");
});
```

## License

LGPL-3.0
