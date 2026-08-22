# The parity contract — `pragma create` ≡ `summon`

Generated from `src/projection/emitParityContract.ts` — do not edit by hand.
Regenerate: `bun run gen:parity`. The byte-drift test
(`src/projection/parityContract.test.ts`) fails whenever this file and the
projection disagree, so behavior without doc and doc without behavior are both
build failures. The PROTECTED cross-CLI matrix
(`packages/cli/pragma/src/capabilities/create/crossCli.subprocess.test.ts`)
names this document as its normative source and executes it against both
binaries.

## 1. The invariant

The ruling's §0, quoted:

> `pragma create <args…>` ≡ `summon <args…>` — **zero difference**. Same
> grammar, same flags, same interactive wizard, same defaults, same failure
> modes, byte-identical generated trees. All generators work everywhere pragma
> runs, **including the compiled binary** — the templates are carried. Summon's
> generators are the single source; adjusting the summon generators to serve
> this is in scope.

The invariant holds over the declared bindings a host mounts: pragma's
`CREATE_GENERATORS` declaration, the summon bin's discovered (or
`--generators`-served) generator packages. A host's root presentation (the
`create` topic page, summon's root help) is host prose; every rule below
binds the tree beneath it.

## 2. Grammar derivation

The whole surface derives from `GeneratorDefinition.prompts` through
`@canonical/summon-core/projection` — neither host authors grammar by hand.

- **Tree segments are subcommands.** A command path (`component/react`)
  mounts segment by segment; interior segments are namespaces that list their
  children; a bare namespace prints its own help on stderr and exits 1; a leaf
  is a generator command. A binding may declare several leaf paths
  (`component/react|svelte|lit`); each leaf projects ITS OWN generator's
  prompts — no cross-leaf merging on the CLI (the union rule exists only where
  one schema must span leaves, §5).
- **The one positional.** The prompt marked `positional: true` is the leaf's
  single optional positional `[<kebab-name>]`, accepted equivalently in flag
  form. Excess positionals are an error (`unexpected argument`, exit 2, with
  a did-you-mean when the stray names a sibling or child command).
- **Prompts become flags** via `buildOptionInfo` — the emitted shapes:

| Prompt (exemplar) | Registered option | Help text |
| --- | --- | --- |
| `text` — `name: "componentPath"` | `--component-path <value>` | Component path: |
| `select` — `name: "packageType"`, choices `lib`, `app` | `--package-type <value>` | Package type: [lib\|app] |
| `multiselect` — `name: "features"` | `--features <values>` | Features: (comma-separated) |
| `confirm` — `name: "withRelay"`, default `false` | `--with-relay` | Include Relay? |
| `confirm` — `name: "withStyles"`, default `true` | `--no-with-styles` | Include styles? |

- **Defaults are never registered with Commander.** Defaults are applied by
  `applyDefaults()` after extraction, so the surface distinguishes "not
  provided" from "provided the default" — which is what keeps explicit answers
  explicit. Consequence of the confirm shapes: a confirm equal to its default
  cannot be expressed explicitly (its only flag names the non-default state).
- **The parity flag set** — what the conformance matrix holds both help pages
  to — is the prompt-derived flags ∪ the mutation trio
  `--dry-run`/`--undo`/`--yes`. Host output extras (summon's
  `--verbose`/`--show-files`/`--llm`/`--format`/preview and stamp
  toggles) sit outside the projection by design: they change what is printed,
  never what is written.

## 3. The interaction decision

Both hosts call the ONE `decideInteraction` on five inputs — nothing else may
influence the mode. Precedence: `--dry-run` > `--undo` > `--yes` > TTY >
explicit-complete; the batch modes ignore TTY.

Each host contributes its TTY fact:

- **summon**: `stdin` AND `stdout` are TTYs (the wizard renders to stdout).
- **pragma create**: `stdin` AND `stderr` are TTYs (the wizard renders to
  stderr; stdout is reserved for machine output).

All 32 rows, enumerated from the code:

| `--dry-run` | `--undo` | `--yes` | TTY | explicit-complete | mode |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | `refuse` |
| — | — | — | — | yes | `run` |
| — | — | — | yes | — | `wizard` |
| — | — | — | yes | yes | `wizard` |
| — | — | yes | — | — | `run` |
| — | — | yes | — | yes | `run` |
| — | — | yes | yes | — | `run` |
| — | — | yes | yes | yes | `run` |
| — | yes | — | — | — | `batch-undo` |
| — | yes | — | — | yes | `batch-undo` |
| — | yes | — | yes | — | `batch-undo` |
| — | yes | — | yes | yes | `batch-undo` |
| — | yes | yes | — | — | `batch-undo` |
| — | yes | yes | — | yes | `batch-undo` |
| — | yes | yes | yes | — | `batch-undo` |
| — | yes | yes | yes | yes | `batch-undo` |
| yes | — | — | — | — | `batch-dry-run` |
| yes | — | — | — | yes | `batch-dry-run` |
| yes | — | — | yes | — | `batch-dry-run` |
| yes | — | — | yes | yes | `batch-dry-run` |
| yes | — | yes | — | — | `batch-dry-run` |
| yes | — | yes | — | yes | `batch-dry-run` |
| yes | — | yes | yes | — | `batch-dry-run` |
| yes | — | yes | yes | yes | `batch-dry-run` |
| yes | yes | — | — | — | `batch-dry-run` |
| yes | yes | — | — | yes | `batch-dry-run` |
| yes | yes | — | yes | — | `batch-dry-run` |
| yes | yes | — | yes | yes | `batch-dry-run` |
| yes | yes | yes | — | — | `batch-dry-run` |
| yes | yes | yes | — | yes | `batch-dry-run` |
| yes | yes | yes | yes | — | `batch-dry-run` |
| yes | yes | yes | yes | yes | `batch-dry-run` |

- **`refuse`** writes the shared message verbatim to stderr and exits 2 in
  BOTH hosts — a default piped refusal is byte-identical across them, full
  stderr (modulo pragma's one-time first-run config note: host onboarding
  written before dispatch on a fresh install, outside this surface). Only an
  EXPLICITLY requested machine format reframes it: pragma's root
  `--format json`/`--format llm` render the same message through its
  error envelope (a host output concern outside the parity surface; summon's
  `--format json`/`--llm` imply `--yes`, so a summon refusal is always
  the bare line). Implicit auto-detection of an output mode never reframes a
  refusal. The template, emitted from `refusalMessage`:

  > Refusing to scaffold in a non-interactive run without complete input. Pass --yes to accept defaults, --dry-run to preview, or provide every answer as a flag.

  With a missing list (the exemplar's conditional prompt is excluded — the
  `Missing:` list is the unconditional prompts absent from the explicit
  answers, declared order, kebab-cased; a live `when` and a projected
  `conditional: true` are treated identically):

  > Refusing to scaffold in a non-interactive run without complete input. Pass --yes to accept defaults, --dry-run to preview, or provide every answer as a flag. Missing: --component-path, --with-styles.

- **`wizard`** asks exactly `pendingPrompts(prompts, explicit)`: the
  explicitly provided answers are seeded, shown as completed, and never
  re-asked; a conditional prompt surfaces only when its controller's answered
  value unlocks it.
- **`run`** applies defaults over the explicit answers and executes without
  prompting. An EXPLICIT answer that fails its prompt's own constraint fails
  loudly (exit 2) in every non-MCP mode — batch, run, and wizard alike,
  validated before the mode decision, so no UI renders and nothing is
  written — with a message echoing the offending value
  (`Invalid --<flag> "<value>": <detail>`). The batch modes additionally
  fail loudly (exit 2) on a required answer that is missing even after
  defaults, and re-check the defaults-applied set (an invalid generator
  default fails the same way).

## 4. The template-seam guarantee

Generators must work wherever a host runs, including a compiled binary that
carries no template files — guaranteed by one seam in
`summon-core/template/embedded`:

- **One key scheme**, reader and writer co-located: a template's key is
  `<prefix>/<path after the last "templates/" segment>` (`qualifiedKey`).
  The writer (`buildEmbeddedManifest`) derives every key through
  `qualifiedKey` itself — whatever it embeds, the reader can address, by
  construction. It walks each declared root — every file, dotfiles included,
  UTF-8 validated; a zero-file root, a file outside any `templates/`
  segment, and two files folding onto one key are each a BUILD failure. The
  host injects the manifest (`setEmbeddedTemplates`) and the generator
  packages' versions (`setEmbeddedPackageVersions`) before loading
  generators.
- **Disk first, embedded fallback, miss = hard error naming the key**:
  `loadTemplateSync` reads the file when it exists and otherwise serves the
  embedded entry; a total miss throws
  `Template not found: <source> (not on disk, and no embedded template for
  '<key>').`
- **A content-less `template()` cannot slip through**: in embedded context
  (`hasEmbeddedTemplates()`) a `template()` without `content` fails as
  `TEMPLATE_DISK_READ_IN_EMBEDDED_CONTEXT`, naming the destination and
  source, instead of reaching for the filesystem.
- **Raw carried assets are verbatim**: `rawFile()` writes byte-for-byte
  (`WriteFile` with `verbatim: true`) and is never stamped — generated
  trees match a disk install exactly.

## 5. The MCP mapping rule

Pragma exposes three tools — `create_component`, `create_package`,
`create_application` — whose schemas derive from the same prompts (required =
no default and unconditional). `create_component` presents ONE schema over
the framework leaves:

- `framework` is a required enum whose values are the tree segments, with NO
  default;
- the remaining params are the union over the declared framework order (first
  seen keeps its position);
- a prompt whose defaults disagree across frameworks carries no default (and
  is not required);
- a prompt not present in every framework carries the doc suffix
  ` (frameworks: …)`.
