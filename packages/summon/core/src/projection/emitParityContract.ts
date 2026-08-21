/**
 * Emit `docs/parity-contract.md` — the normative statement of the
 * `pragma create` ≡ `summon` invariant, generated FROM the projection so the
 * document cannot drift from the behavior. The grammar table runs
 * {@link buildOptionInfo} over one exemplar prompt per (type × default
 * polarity); the interaction table enumerates {@link decideInteraction} over
 * all 32 input combinations; the refusal texts come from
 * {@link refusalMessage} itself. The byte-drift test
 * (`parityContract.test.ts`) holds the committed file to this emitter's
 * output; `bun run gen:parity` rewrites it.
 */

import buildOptionInfo from "./buildOptionInfo.js";
import {
  decideInteraction,
  missingExplicitFlags,
  refusalMessage,
} from "./decideInteraction.js";
import type { PromptLike } from "./types.js";

// =============================================================================
// Exemplars the generated sections run the projection over
// =============================================================================

/** One exemplar prompt per (type × default polarity), with its table label. */
const FLAG_EXEMPLARS: ReadonlyArray<{
  readonly label: string;
  readonly prompt: PromptLike;
}> = [
  {
    label: '`text` — `name: "componentPath"`',
    prompt: {
      name: "componentPath",
      type: "text",
      message: "Component path:",
      default: "src/components/MyComponent",
    },
  },
  {
    label: '`select` — `name: "packageType"`, choices `lib`, `app`',
    prompt: {
      name: "packageType",
      type: "select",
      message: "Package type:",
      choices: [
        { label: "Library", value: "lib" },
        { label: "Application", value: "app" },
      ],
      default: "lib",
    },
  },
  {
    label: '`multiselect` — `name: "features"`',
    prompt: {
      name: "features",
      type: "multiselect",
      message: "Features:",
      choices: [
        { label: "X", value: "x" },
        { label: "Y", value: "y" },
      ],
      default: ["x"],
    },
  },
  {
    label: '`confirm` — `name: "withRelay"`, default `false`',
    prompt: {
      name: "withRelay",
      type: "confirm",
      message: "Include Relay?",
      default: false,
    },
  },
  {
    label: '`confirm` — `name: "withStyles"`, default `true`',
    prompt: {
      name: "withStyles",
      type: "confirm",
      message: "Include styles?",
      default: true,
    },
  },
];

/**
 * The refusal exemplar: an unanswered leaf whose conditional prompt must NOT
 * appear in the `Missing:` list — the list rule, demonstrated from code.
 */
const REFUSAL_EXEMPLAR: readonly PromptLike[] = [
  {
    name: "componentPath",
    type: "text",
    message: "Component path:",
    default: "src/components/MyComponent",
  },
  {
    name: "withStyles",
    type: "confirm",
    message: "Include styles?",
    default: true,
  },
  {
    name: "useTsStories",
    type: "confirm",
    message: "TypeScript stories?",
    default: true,
    conditional: true,
  },
];

// =============================================================================
// Generated fragments
// =============================================================================

/** Escape a value for a markdown table cell. */
function cell(value: string): string {
  return value.replaceAll("|", "\\|");
}

/** The prompts → flags table, run through {@link buildOptionInfo}. */
function flagTable(): string {
  const rows = FLAG_EXEMPLARS.map(({ label, prompt }) => {
    const info = buildOptionInfo(prompt);
    return `| ${cell(label)} | \`${cell(info.flags)}\` | ${cell(info.description)} |`;
  });
  return [
    "| Prompt (exemplar) | Registered option | Help text |",
    "| --- | --- | --- |",
    ...rows,
  ].join("\n");
}

/** All 32 rows of {@link decideInteraction}, enumerated. */
function interactionTable(): string {
  const mark = (value: boolean): string => (value ? "yes" : "—");
  const rows: string[] = [];
  for (let index = 0; index < 32; index += 1) {
    const input = {
      dryRun: (index & 16) !== 0,
      undo: (index & 8) !== 0,
      yes: (index & 4) !== 0,
      isTTY: (index & 2) !== 0,
      explicitComplete: (index & 1) !== 0,
    };
    const { mode } = decideInteraction(input);
    rows.push(
      `| ${mark(input.dryRun)} | ${mark(input.undo)} | ${mark(input.yes)} | ` +
        `${mark(input.isTTY)} | ${mark(input.explicitComplete)} | \`${mode}\` |`,
    );
  }
  return [
    "| `--dry-run` | `--undo` | `--yes` | TTY | explicit-complete | mode |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

// =============================================================================
// The document
// =============================================================================

/**
 * Emit the complete parity contract document.
 *
 * @returns The markdown content of `docs/parity-contract.md`.
 */
export default function emitParityContract(): string {
  const refusalBase = refusalMessage([]);
  const refusalWithMissing = refusalMessage(
    missingExplicitFlags(REFUSAL_EXEMPLAR, {}),
  );

  return `# The parity contract — \`pragma create\` ≡ \`summon\`

Generated from \`src/projection/emitParityContract.ts\` — do not edit by hand.
Regenerate: \`bun run gen:parity\`. The byte-drift test
(\`src/projection/parityContract.test.ts\`) fails whenever this file and the
projection disagree, so behavior without doc and doc without behavior are both
build failures. The PROTECTED cross-CLI matrix
(\`packages/cli/pragma/src/capabilities/create/crossCli.subprocess.test.ts\`)
names this document as its normative source and executes it against both
binaries.

## 1. The invariant

The ruling's §0, quoted:

> \`pragma create <args…>\` ≡ \`summon <args…>\` — **zero difference**. Same
> grammar, same flags, same interactive wizard, same defaults, same failure
> modes, byte-identical generated trees. All generators work everywhere pragma
> runs, **including the compiled binary** — the templates are carried. Summon's
> generators are the single source; adjusting the summon generators to serve
> this is in scope.

The invariant holds over the declared bindings a host mounts: pragma's
\`CREATE_GENERATORS\` declaration, the summon bin's discovered (or
\`--generators\`-served) generator packages. A host's root presentation (the
\`create\` topic page, summon's root help) is host prose; every rule below
binds the tree beneath it.

## 2. Grammar derivation

The whole surface derives from \`GeneratorDefinition.prompts\` through
\`@canonical/summon-core/projection\` — neither host authors grammar by hand.

- **Tree segments are subcommands.** A command path (\`component/react\`)
  mounts segment by segment; interior segments are namespaces that list their
  children; a bare namespace prints its own help on stderr and exits 1; a leaf
  is a generator command. A binding may declare several leaf paths
  (\`component/react|svelte|lit\`); each leaf projects ITS OWN generator's
  prompts — no cross-leaf merging on the CLI (the union rule exists only where
  one schema must span leaves, §5).
- **The one positional.** The prompt marked \`positional: true\` is the leaf's
  single optional positional \`[<kebab-name>]\`, accepted equivalently in flag
  form. Excess positionals are an error (\`unexpected argument\`, exit 2, with
  a did-you-mean when the stray names a sibling or child command).
- **Prompts become flags** via \`buildOptionInfo\` — the emitted shapes:

${flagTable()}

- **Defaults are never registered with Commander.** Defaults are applied by
  \`applyDefaults()\` after extraction, so the surface distinguishes "not
  provided" from "provided the default" — which is what keeps explicit answers
  explicit. Consequence of the confirm shapes: a confirm equal to its default
  cannot be expressed explicitly (its only flag names the non-default state).
- **The parity flag set** — what the conformance matrix holds both help pages
  to — is the prompt-derived flags ∪ the mutation trio
  \`--dry-run\`/\`--undo\`/\`--yes\`. Host output extras (summon's
  \`--verbose\`/\`--show-files\`/\`--llm\`/\`--format\`/preview and stamp
  toggles) sit outside the projection by design: they change what is printed,
  never what is written.

## 3. The interaction decision

Both hosts call the ONE \`decideInteraction\` on five inputs — nothing else may
influence the mode. Precedence: \`--dry-run\` > \`--undo\` > \`--yes\` > TTY >
explicit-complete; the batch modes ignore TTY.

Each host contributes its TTY fact:

- **summon**: \`stdin\` AND \`stdout\` are TTYs (the wizard renders to stdout).
- **pragma create**: \`stdin\` AND \`stderr\` are TTYs (the wizard renders to
  stderr; stdout is reserved for machine output).

All 32 rows, enumerated from the code:

${interactionTable()}

- **\`refuse\`** writes the shared message verbatim to stderr and exits 2 in
  BOTH hosts — a default piped refusal is byte-identical across them, full
  stderr. Only an EXPLICITLY requested machine format reframes it: pragma's
  root \`--format json\`/\`--format llm\` render the same message through its
  error envelope (a host output concern outside the parity surface; summon's
  \`--format json\`/\`--llm\` imply \`--yes\`, so a summon refusal is always
  the bare line). Implicit auto-detection of an output mode never reframes a
  refusal. The template, emitted from \`refusalMessage\`:

  > ${refusalBase}

  With a missing list (the exemplar's conditional prompt is excluded — the
  \`Missing:\` list is the unconditional prompts absent from the explicit
  answers, declared order, kebab-cased; a live \`when\` and a projected
  \`conditional: true\` are treated identically):

  > ${refusalWithMissing}

- **\`wizard\`** asks exactly \`pendingPrompts(prompts, explicit)\`: the
  explicitly provided answers are seeded, shown as completed, and never
  re-asked; a conditional prompt surfaces only when its controller's answered
  value unlocks it.
- **\`run\`** applies defaults over the explicit answers and executes without
  prompting. The batch modes fail loudly (exit 2) on a missing required answer
  or an invalid value — the invalid-value message echoes the offending value
  (\`Invalid --<flag> "<value>": <detail>\`).

## 4. The template-seam guarantee

Generators must work wherever a host runs, including a compiled binary that
carries no template files — guaranteed by one seam in
\`summon-core/template/embedded\`:

- **One key scheme**, reader and writer co-located: a template's key is
  \`<prefix>/<path after the last "templates/" segment>\` (\`qualifiedKey\`).
  The writer (\`buildEmbeddedManifest\`) derives every key through
  \`qualifiedKey\` itself — whatever it embeds, the reader can address, by
  construction. It walks each declared root — every file, dotfiles included,
  UTF-8 validated; a zero-file root, a file outside any \`templates/\`
  segment, and two files folding onto one key are each a BUILD failure. The
  host injects the manifest (\`setEmbeddedTemplates\`) and the generator
  packages' versions (\`setEmbeddedPackageVersions\`) before loading
  generators.
- **Disk first, embedded fallback, miss = hard error naming the key**:
  \`loadTemplateSync\` reads the file when it exists and otherwise serves the
  embedded entry; a total miss throws
  \`Template not found: <source> (not on disk, and no embedded template for
  '<key>').\`
- **A content-less \`template()\` cannot slip through**: in embedded context
  (\`hasEmbeddedTemplates()\`) a \`template()\` without \`content\` fails as
  \`TEMPLATE_DISK_READ_IN_EMBEDDED_CONTEXT\`, naming the destination and
  source, instead of reaching for the filesystem.
- **Raw carried assets are verbatim**: \`rawFile()\` writes byte-for-byte
  (\`WriteFile\` with \`verbatim: true\`) and is never stamped — generated
  trees match a disk install exactly.

## 5. The MCP mapping rule

Pragma exposes three tools — \`create_component\`, \`create_package\`,
\`create_application\` — whose schemas derive from the same prompts (required =
no default and unconditional). \`create_component\` presents ONE schema over
the framework leaves:

- \`framework\` is a required enum whose values are the tree segments, with NO
  default;
- the remaining params are the union over the declared framework order (first
  seen keeps its position);
- a prompt whose defaults disagree across frameworks carries no default (and
  is not required);
- a prompt not present in every framework carries the doc suffix
  \` (frameworks: …)\`.
`;
}
