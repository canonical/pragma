# @canonical/cli-core

Shared CLI machinery for the pragma and summon binaries.

Provides `CommandDefinition` as the universal command unit, Commander.js registration, output adapters, completion infrastructure, and help text formatting.

## Usage

```typescript
import {
  registerAll,
  createExitResult,
  createOutputResult,
  type CommandDefinition,
  type CommandContext,
} from "@canonical/cli-core";
import { Command } from "commander";

const commands: CommandDefinition[] = [
  {
    path: ["component", "list"],
    description: "List components in current tier",
    parameters: [
      { name: "allTiers", description: "Include all tiers", type: "boolean" },
    ],
    execute: async (params) => {
      const components = ["Button", "Card", "Modal"];
      return createOutputResult(components, {
        plain: (data) => data.join("\n"),
      });
    },
  },
];

const program = new Command();
const ctx: CommandContext = {
  cwd: process.cwd(),
  globalFlags: { llm: false, format: "text", verbose: false },
};
registerAll(program, commands, ctx);
program.parse();
```

## CommandDefinition

The universal command unit. Each domain exports `CommandDefinition[]`; the root CLI concatenates them and calls `registerAll`.

```typescript
interface CommandDefinition {
  path: string[];              // ["component", "list"] → `pragma component list`
  description: string;
  parameters: ParameterDefinition[];
  execute: (params, ctx) => Promise<CommandResult>;
  meta?: CommandMeta;          // version, examples, extendedHelp
  parameterGroups?: Record<string, string[]>;
}
```

## CommandResult

Three-variant tagged union:

- **output** — data to render via a `RenderPair` (plain text or Ink)
- **interactive** — user interaction needed (spec is data-only, binary decides rendering)
- **exit** — exit with code, no output

## Completions

Derive tab-completion from command definitions:

```typescript
import { buildCompleters, resolveCompletion } from "@canonical/cli-core";

const tree = buildCompleters(commands);
const result = resolveCompletion(tree, ["component", "ge"]);
// result.level === 2, result.completer returns ["get"]
```

Three levels: noun (L1), verb (L2), argument (L3 — dynamic via `ParameterDefinition.complete`).

## Help Formatting

Custom renderers that override Commander auto-generation:

```typescript
import { formatHelp, formatVerbHelp, formatNounHelp } from "@canonical/cli-core";

const help = formatHelp("pragma", "semantic design system CLI", commands);
const nounHelp = formatNounHelp("pragma", "component", commands);
```

## License

GPL-3.0
