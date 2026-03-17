# Harnesses

Detects AI harnesses (Claude Code, Cursor, Windsurf, Cline, Roo Code) and reads/writes their MCP server configuration. All operations are `@canonical/task` Tasks — dry-runnable, testable, composable.

```typescript
import { detectHarnesses, writeMcpConfig } from "@canonical/harnesses";
import { runTask } from "@canonical/task";

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
import { runTask } from "@canonical/task";

const detected = await runTask(detectHarnesses("/my/project"));

for (const d of detected) {
  console.log(`${d.harness.name}: ${d.confidence}, config exists: ${d.configExists}`);
}
```

Each harness defines detection signals:

| Signal type | Confidence | Example |
|-------------|------------|---------|
| `directory` | high | `~/.claude` exists |
| `file` | high | `.mcp.json` exists |
| `extension` | medium | VS Code extension installed |
| `process` | medium | Running process name |
| `env` | low | Environment variable hint |

Multiple harnesses can be detected simultaneously — a developer may use both Claude Code and Cursor.

## MCP Configuration

Read, write, and remove MCP server entries from harness config files:

```typescript
import { findHarnessById, readMcpConfig, writeMcpConfig, removeMcpConfig } from "@canonical/harnesses";
import { runTask } from "@canonical/task";

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

| Harness | ID | Config path | Skills path |
|---------|-----|------------|-------------|
| Claude Code | `claude-code` | `.mcp.json` | `.claude/skills/` |
| Cursor | `cursor` | `.cursor/mcp.json` | `.cursor/skills/` |
| Windsurf | `windsurf` | `.windsurf/mcp.json` | `.windsurf/skills/` |
| Cline | `cline` | `.vscode/mcp.json` | `.agents/skills/` |
| Roo Code | `roo-code` | `.vscode/mcp.json` | `.agents/skills/` |

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
