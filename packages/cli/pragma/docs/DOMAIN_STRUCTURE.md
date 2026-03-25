# Domain Structure Conventions

Canonical structure for all command and operation domains in `@canonical/pragma-cli`.

---

## Two domain tiers

**CLI domains** have commands, operations, formatters, and optionally helpers. Six exist today: `component`, `config`, `modifier`, `standard`, `tier`, `token`.

**Operations-only domains** expose operations consumed by the MCP adapter but have no CLI commands. Two exist today: `graph`, `ontology`.

---

## CLI domain template

```
domains/{name}/
├── index.ts                    ← domain barrel
├── commands/
│   ├── index.ts                ← barrel
│   ├── list.ts                 ← single default export: CommandDefinition builder
│   ├── list.test.ts            ← co-located test
│   ├── get.ts
│   ├── get.test.ts
│   └── types.ts                ← command-specific types (if any)
├── operations/
│   ├── index.ts                ← barrel
│   ├── list.ts                 ← single default export: operation function
│   ├── list.test.ts
│   ├── get.ts
│   ├── get.test.ts
│   └── types.ts                ← operation-specific types (if any)
├── formatters/
│   ├── index.ts                ← barrel
│   ├── list.ts                 ← single default export: Formatters<T> object
│   ├── list.test.ts
│   ├── get.ts
│   ├── get.test.ts
│   └── types.ts                ← formatter input types (if any)
├── types.ts                    ← domain-level types shared across subfolders
├── constants.ts                ← domain-level constants (if any)
└── helpers/
    ├── index.ts                ← barrel
    ├── resolveAspects.ts       ← single default export
    └── resolveAspects.test.ts
```

## Operations-only domain template

```
domains/{name}/
├── operations/
│   ├── index.ts                ← barrel
│   ├── list.ts
│   ├── list.test.ts
│   ├── get.ts
│   └── get.test.ts
├── types.ts                    ← domain-level types (if any)
├── constants.ts                ← domain-level constants (if any)
└── helpers/                    ← (if any)
    ├── index.ts
    ├── {name}.ts
    └── {name}.test.ts
```

---

## File conventions

### Inner files use `export default`

Every file inside a subfolder (`commands/`, `operations/`, `formatters/`, `helpers/`) exports a single default export. The file is named by verb only (`list.ts`, `get.ts`).

```typescript
// operations/list.ts
export default async function listComponents(store: Store, filters: FilterConfig): Promise<ComponentSummary[]> {
  // ...
}
```

### Barrels qualify on re-export

Each subfolder has an `index.ts` barrel that re-exports defaults with qualified names:

```typescript
// operations/index.ts
export { default as listComponents } from "./list.js";
export { default as getComponent } from "./get.js";
```

```typescript
// commands/index.ts
export { default as listCommand } from "./list.js";
export { default as getCommand } from "./get.js";
```

```typescript
// formatters/index.ts
export { default as listFormatters } from "./list.js";
export { default as getFormatters } from "./get.js";
```

The barrel is where naming happens — the folder provides domain context, the barrel adds the noun.

### Tests are co-located

`list.test.ts` sits next to `list.ts`. No separate `__tests__/` directories.

### Types and constants at owning level

Per `code/types/file` and `code/constants/file`, types and constants live in `types.ts` / `constants.ts` at the level that owns them:

- Domain-level types shared across subfolders → `domains/{name}/types.ts`
- Subfolder-specific types → `domains/{name}/formatters/types.ts`

---

## Domain barrel (`index.ts`)

The domain barrel is the domain's public API. It exports:

1. A `commands(ctx)` function returning `CommandDefinition[]` (CLI domains only)
2. Re-exports of operations for the package barrel and MCP adapter

```typescript
// domains/component/index.ts
import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { getCommand, listCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), getCommand(ctx)];
}

export { getComponent, listComponents } from "./operations/index.js";
```

---

## PragmaContext

Commands access shared dependencies via `PragmaContext`, which extends the cli-core `CommandContext`:

```typescript
// domains/shared/context.ts
interface PragmaContext extends CommandContext {
  readonly store: Store;
  readonly config: FilterConfig;
}
```

`runCli.ts` constructs a `PragmaContext` after booting the store and passes it to `commands(ctx)`. Since `PragmaContext extends CommandContext`, it satisfies `registerAll()` without cli-core knowing about Store or FilterConfig.

Command builders receive `PragmaContext` and use `ctx.store` / `ctx.config` directly:

```typescript
// commands/list.ts
export default function buildListCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["component", "list"],
    // ...
    execute: async (params) => {
      const data = await listComponents(ctx.store, ctx.config);
      return createOutputResult(data, {
        plain: selectFormatter(ctx, listFormatters),
      });
    },
  };
}
```

---

## Formatters

Every command supports three output modes: plain (terminal), llm (Markdown), json (structured).

### `Formatters<T>` type

```typescript
// domains/shared/formatters.ts
interface Formatters<T> {
  readonly plain: (data: T) => string;
  readonly llm: (data: T) => string;
  readonly json: (data: T) => string;
}
```

### `selectFormatter`

Eliminates the duplicated `if (format === "json") ... if (llm) ... else plain` in every command:

```typescript
function selectFormatter<T>(ctx: CommandContext, formatters: Formatters<T>): (data: T) => string
```

Precedence: `--format json` > `--llm` > plain.

### Formatter files

Each formatter file exports a `Formatters<T>` object as default:

```typescript
// formatters/list.ts
const formatters: Formatters<ComponentSummary[]> = {
  plain(data) { /* chalk formatting */ },
  llm(data) { /* markdown */ },
  json(data) { return JSON.stringify(data, null, 2); },
};
export default formatters;
```

When a command's data shape includes display options (like `detailed` or `aspects`), define a composite input type in `formatters/types.ts`:

```typescript
// formatters/types.ts
interface ComponentGetInput {
  readonly component: ComponentDetailed;
  readonly detailed: boolean;
  readonly aspects: AspectFlags;
}
```

---

## Command collection in runCli.ts

Each CLI domain exports `commands(ctx)`. `runCli.ts` spreads them:

```typescript
import { commands as componentCommands } from "../domains/component/index.js";
import { commands as configCommands } from "../domains/config/index.js";
import { commands as standardCommands } from "../domains/standard/index.js";

function collectCommands(ctx: PragmaContext): CommandDefinition[] {
  return [
    ...configCommands(ctx),
    ...standardCommands(ctx),
    ...componentCommands(ctx),
  ];
}
```

---

## Adding a new CLI domain

1. Create `domains/{name}/` with the full template
2. Write operations in `operations/` with default exports
3. Write formatters in `formatters/` as `Formatters<T>` objects
4. Write commands in `commands/` using `PragmaContext` + `selectFormatter`
5. Create barrels in each subfolder
6. Create domain `index.ts` with `commands(ctx)` + operation re-exports
7. Add `...{name}Commands(ctx)` to `collectCommands()` in `runCli.ts`
8. Add operation re-exports to `src/index.ts` package barrel

## Adding a new operations-only domain

1. Create `domains/{name}/operations/` with operation files + barrel
2. Add helpers in `helpers/` if needed
3. Import operations in `registerTools.ts` from the barrel
4. Add operation re-exports to `src/index.ts` package barrel

---

## Code standards alignment

| Standard | How it applies |
|----------|---------------|
| `code/export/shape` | Inner files: single default export. Barrels: homogeneous named re-exports. |
| `code/export/barrel-public-api` | Barrels at subfolder boundaries define the concern's public surface. |
| `code/naming/single-export-file` | Files named by verb (`list.ts`, `get.ts`). Barrel qualifies on re-export. |
| `code/naming/function-verb` | Operations: `listComponents`, `getComponent`. Commands: `listCommand`. |
| `code/types/file` | Types in `types.ts` at the owning level. |
| `code/constants/file` | Constants in `constants.ts` at the owning level. |
