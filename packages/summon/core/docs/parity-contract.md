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

The invariant binds the DECLARED BINDING PATHS as each host mounts them —
`component/react|svelte|lit`, `package`, `application/react`: pragma's
`CREATE_GENERATORS` declaration, and the same paths of the summon bin's
discovered (or `--generators`-served) generator packages. Other generators
a discovered package exports (`domain`/`route`/`wrapper` from
summon-application, `monorepo` from summon-monorepo) and the summon
builtins (`init`, `example/hello`, `example/webapp`) are summon-only
surface OUTSIDE this contract — reachable through summon discovery only,
never mounted by pragma, and no rule below speaks for them. A host's root
presentation (the `create` topic page, summon's root help) is host prose;
every rule below binds the declared paths beneath it.

## 2. Grammar derivation

The whole surface derives from `GeneratorDefinition.prompts` through
`@canonical/summon-core/projection` — neither host authors grammar by hand.

- **Tree segments are subcommands.** A command path (`component/react`)
  mounts segment by segment; interior segments are namespaces that list their
  children; a bare namespace prints its own help on stderr and exits 1 — and
  despite that exit code it is NOT reframed under pragma's explicit
  `--format json`/`--format llm`: it is a help page (byte-identical in
  every format), not an error message, and pragma's kernel never reframes a
  bare noun's usage page either (summon's `--format` is a leaf flag,
  unregistered on a namespace); a leaf
  is a generator command. A binding may declare several leaf paths
  (`component/react|svelte|lit`); each leaf projects ITS OWN generator's
  prompts — no cross-leaf merging on the CLI (the union rule exists only where
  one schema must span leaves, §5).
- **The one positional.** The prompt marked `positional: true` is the leaf's
  single optional positional `[<kebab-name>]`, accepted equivalently in flag
  form. Excess positionals are an error (`unexpected argument`, exit 2,
  naming the FIRST excess operand; a did-you-mean follows when ANY operand
  of the invocation — a bound positional included, not only the excess ones
  — names a sibling or child segment: in `component react svelte MyThing`
  it is the bound `svelte` that earns
  `Did you mean '… component svelte'?` while the named stray matches
  nothing). An unknown
  segment beneath a namespace errors the same way in BOTH hosts —
  `error: unknown command '<stray>'`, exit 2, with the shared
  `Did you mean '<chain> <segment>'?` suggestion when a child segment is
  close (the chain names each host's real invocation). An unknown
  option is the same class of usage error — Commander's own
  `error: unknown option '--x'` line, exit 2 in BOTH hosts (as is every
  other parse failure: missing option argument included). These literals
  are the DEFAULT bytes in both hosts: pragma reframes each of them
  through its error envelope under an EXPLICITLY requested
  `--format json`/`--format llm` (a host output concern outside the
  parity surface — summon never does: its host declines the projection's
  `writeUsageError` seam, so its usage errors keep the default bytes in
  every format; its `--format` is a leaf OUTPUT flag, parsed fine on a
  leaf and never consulted for a usage failure), and implicit
  auto-detection of an output mode never reframes them (as with
  `refuse`, §3). ONE token is the exception: for the single retired flag
  `--framework` pragma substitutes its own line — the R1 migration hint
  naming the tree-segment form (`the framework is now a path segment: …`),
  host-owned bytes on every declared leaf — while summon, which never had
  the flag, keeps Commander's default line.
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
  `--dry-run`/`--undo`/`--yes`. Host extras (summon's
  `--verbose`/`--show-files`/`--llm`/`--format`/preview and stamp
  toggles) sit outside the parity flag set because neither host is required
  to declare the other's — not because they are inert: summon's
  `--llm`/`--format json`/`SUMMON_LLM=1` additionally imply
  `--dry-run` (a MODE change — such a run writes nothing, where pragma
  with the same argv writes), and its `--no-generated-stamp` changes the
  generated bytes. Three SHORT forms are summon-only SPELLINGS pragma
  rejects loudly: `-d` (`--dry-run`) and `-y` (`--yes`) alias two
  of the mutation trio, `-l` aliases the `--llm` extra — so
  `summon … -y` writes a tree where `pragma create … -y` is
  `error: unknown option '-y'`, exit 2, nothing written. `-v` is a
  token COLLISION, not a spelling: summon reads its `--verbose`,
  pragma's whole-argv global scan reads its `--version` — so
  `pragma create … -v` prints the version and exits 0 having written
  nothing (the long form `--verbose` ports; only the short form
  collides). Commander's
  implicit `help` subcommand is likewise a summon host spelling
  (`summon help component`, `summon component help`);
  `pragma create component help` errors as an unknown segment (and
  `pragma create help component` errors at the host's topic tier).

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
  `Missing:` list names each unconditional prompt absent from the explicit
  answers, declared order, by its PRIMARY registered long form from
  `buildOptionInfo` (§2) — `--no-<kebab>` for a default-true confirm,
  `--<kebab>` otherwise — so every listed token parses on the command
  that printed it; a live `when` and a projected `conditional: true`
  are treated identically):

  > Refusing to scaffold in a non-interactive run without complete input. Pass --yes to accept defaults, --dry-run to preview, or provide every answer as a flag. Missing: --component-path, --no-with-styles.

- **`wizard`** asks exactly `pendingPrompts(prompts, explicit)`: the
  explicitly provided answers are never re-asked, and a conditional prompt
  surfaces only when its controller's answered value unlocks it. How a host
  PRESENTS the session — a completed-answer table, the step total, what
  `esc` does at the confirm gate — is host prose, outside this surface.
- **`run`** applies defaults over the explicit answers and executes without
  prompting. An EXPLICIT answer that fails its prompt's own constraint fails
  loudly (exit 2) in every non-MCP mode — batch, run, and wizard alike,
  validated downstream of the refuse decision (an incomplete non-TTY run
  REFUSES first: pragma's mount refuses before its create runtime loads, and
  summon mirrors that order) and before any UI renders or anything is
  written — with a message echoing the offending value:
  `Invalid --<flag> "<value>": <detail>` from a `validate` rejection,
  `Invalid --<flag> "<value>". Valid values: <choices>.` from a value
  outside a select's choices. For this class the shared LINE is the
  parity surface: pragma additionally renders it through its host error
  rendering — a plain `Error: ` prefix, the condensed frame under
  auto-detected LLM output or an explicit `--format llm`, the envelope
  under `--format json` — while summon writes the bare line in every
  format. The declared path prompts
  (`--component-path` on the three component leaves, `--app-path`)
  each carry a `validate` that rejects an absolute path and `..`
  traversal, so an output path that would escape the invocation
  directory fails this SAME gate in both hosts on every declared leaf;
  pragma ADDITIONALLY refuses a path that RESOLVES outside the
  workspace through a symlink (its host-level jail, behind the shared
  validators — summon relies on the validator tier). Known residue,
  disclosed and OUT of contract: the UNVALIDATED summon-only generators
  outside the declared set (§1 — `domain`/`route`/`wrapper`, the
  builtins `init`, `example/hello`, `example/webapp`) take
  name/path prompts with no validator, and summon scaffolds where they
  point, the invocation directory's outside included; `monorepo` is
  not among them — its `name` prompt carries its own kebab-case
  validator, so `../evil` fails this same gate at exit 2. The batch modes
  additionally fail loudly (exit 2) on a required answer that is missing
  even after
  defaults, and re-check the defaults-applied set (an invalid generator
  default fails the same way). A failure raised PAST that gate keeps the
  same classes in every arm: a generator-raised typed invalid answer (a
  cross-answer constraint its own `generate` enforces) exits 2, and any
  other failure — an ordinary `Error` thrown by `generate` included,
  not only a failed effect — exits 1: in the batch arms as a stderr
  line, never a stack (summon writes the bare message; pragma renders it
  through its error envelope), in the run and wizard arms rendered by the
  host's UI (summon's Ink App reports on stdout; pragma's error rendering
  writes stderr). The stream and its framing are host presentation; the
  exit code is parity surface — a rendered failure never exits 0.

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
