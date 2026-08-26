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
Regenerate: \`bun run gen:parity\`.

**What guards what, stated exactly**, because the obvious reading is wrong. The
byte-drift test (\`src/projection/parityContract.test.ts\`) compares this file to
the emitter's output, so it catches a hand edit here and a change to the emitter
— and nothing else. The emitter takes no arguments: most of this document is
prose it holds as a literal, so a change to the bindings, the generators, the
template roots, the prompt sets or the package versions leaves its output
byte-identical and this guard green. Only the fragments DERIVED from the live
projection — the tables below, whose row counts the drift test asserts — fail on
such a change.

The wire-measured literals are therefore pinned elsewhere, by the PROTECTED
cross-CLI matrix
(\`packages/cli/pragma/src/capabilities/create/crossCli.subprocess.test.ts\`),
which names this document as its normative source and executes it against both
CLIs. A literal that neither the derived tables nor that matrix covers is pinned
by nothing, and must be written in a form the surface cannot outrun.

## 1. The invariant

The ruling's §0, quoted:

> \`pragma create <args…>\` ≡ \`summon <args…>\` — **zero difference**. Same
> grammar, same flags, same interactive wizard, same defaults, same failure
> modes, byte-identical generated trees. All generators work everywhere pragma
> runs, **including the compiled binary** — the templates are carried. Summon's
> generators are the single source; adjusting the summon generators to serve
> this is in scope.

The invariant binds the DECLARED BINDING PATHS as each host mounts them —
\`component/react|svelte|lit\`, \`package\`, \`application/react\`: pragma's
\`CREATE_GENERATORS\` declaration, and the same paths of the summon bin's
discovered (or \`--generators\`-served) generator packages. Other generators
a discovered package exports (\`domain\`/\`route\`/\`wrapper\` from
summon-application, \`monorepo\` from summon-monorepo) and the summon
builtins (\`init\`, \`example/hello\`, \`example/webapp\`) are summon-only
surface OUTSIDE this contract — reachable through summon discovery only,
never mounted by pragma, and no rule below speaks for them. A host's root
presentation (the \`create\` topic page, summon's root help) is host prose;
every rule below binds the declared paths beneath it.

## 2. Grammar derivation

The whole surface derives from \`GeneratorDefinition.prompts\` through
\`@canonical/summon-core/projection\` — neither host authors grammar by hand.

- **Tree segments are subcommands.** A command path (\`component/react\`)
  mounts segment by segment; interior segments are namespaces that list their
  children; a bare namespace prints its own help on stderr and exits 1 — and
  despite that exit code it is NOT reframed under pragma's explicit
  \`--format json\`/\`--format llm\`: it is a help page (byte-identical in
  every format), not an error message, and pragma's kernel never reframes a
  bare noun's usage page either (summon's \`--format\` is a leaf flag,
  unregistered on a namespace); a leaf
  is a generator command. A binding may declare several leaf paths
  (\`component/react|svelte|lit\`); each leaf projects ITS OWN generator's
  prompts — no cross-leaf merging on the CLI (the union rule exists only where
  one schema must span leaves, §5).
- **The one positional.** The prompt marked \`positional: true\` is the leaf's
  single optional positional \`[<kebab-name>]\`, accepted equivalently in flag
  form. Excess positionals are an error (\`unexpected argument\`, exit 2,
  naming the FIRST excess operand; a did-you-mean follows when ANY operand
  of the invocation — a bound positional included, not only the excess ones
  — names a sibling or child segment: in \`component react svelte MyThing\`
  it is the bound \`svelte\` that earns
  \`Did you mean '… component svelte'?\` while the named stray matches
  nothing). An unknown
  segment beneath a namespace errors the same way in BOTH hosts —
  \`error: unknown command '<stray>'\`, exit 2, with the shared
  \`Did you mean '<chain> <segment>'?\` suggestion when a child segment is
  close (the chain names each host's real invocation). An unknown
  option is the same class of usage error — Commander's own
  \`error: unknown option '--x'\` line, exit 2 in BOTH hosts (as is every
  other parse failure: missing option argument included). These literals
  are the DEFAULT bytes in both hosts: pragma reframes each of them
  through its error envelope under an EXPLICITLY requested
  \`--format json\`/\`--format llm\` (a host output concern outside the
  parity surface — summon never does: its host declines the projection's
  \`writeUsageError\` seam, so its usage errors keep the default bytes in
  every format; its \`--format\` is a leaf OUTPUT flag, parsed fine on a
  leaf and never consulted for a usage failure), and implicit
  auto-detection of an output mode never reframes them (as with
  \`refuse\`, §3). ONE token is the exception: for the single retired flag
  \`--framework\` pragma substitutes its own line — the R1 migration hint
  naming the tree-segment form (\`the framework is now a path segment: …\`),
  host-owned bytes on every declared leaf — while summon, which never had
  the flag, keeps Commander's default line.
- **Prompts become flags** via \`buildOptionInfo\` — the emitted shapes:

${flagTable()}

- **Defaults are never registered with Commander.** Defaults are applied by
  \`applyDefaults()\` after extraction, so the surface distinguishes "not
  provided" from "provided the default" — which is what keeps explicit answers
  explicit. Consequence of the confirm shapes: a confirm equal to its default
  cannot be expressed explicitly (its only flag names the non-default state).
- **The parity flag set** — what the conformance matrix holds both help pages
  to — is the prompt-derived flags ∪ the mutation trio
  \`--dry-run\`/\`--undo\`/\`--yes\`. Everything else either host registers is
  a HOST EXTRA, outside the parity set because neither host is required to
  declare the other's. One RULE governs every extra, and it needs no
  inventory: a FLAG token one host reads and the other does not is rejected
  LOUDLY by the other — \`error: unknown option '<token>'\`, exit 2, nothing
  written — even appended to an otherwise complete leaf invocation that host
  would have scaffolded. A registered SUBCOMMAND spelling is rejected just as
  loudly, in the other error class — the unknown-COMMAND class, whose exact
  rendering differs by host and by depth (both spellings are given in the
  \`help\` bullet below; do not template one here). That is why the rule names
  the token KIND rather than a message. The
  AUTHORITATIVE list of what a host DECLARES is that
  host's own help — its root \`--help\` and the leaf's — on both sides. Read
  them; a list written here could only go stale, because neither host is
  bound by the other's document. Two things those pages do not settle, both
  named below: summon's completion PROTOCOL spellings sit on no help page on
  either host (its \`--setup-completion\`/\`--cleanup-completion\` siblings are
  declared root options and DO appear on summon's, though the same
  pre-Commander scan answers them), and a token can sit on one host's page
  while the other still READS it under a different meaning (\`-v\`). Extras
  also differ in KIND, not only in spelling — summon's \`--format json\`
  and \`SUMMON_LLM=1\`
  imply \`--dry-run\` (a MODE change: such a run writes nothing where pragma
  with the same argv writes the tree), and so does \`--llm\`, whose LONG form
  does not port either (where \`--verbose\`'s does):
  \`pragma create … --llm\` is \`error: unknown option '--llm'\`, exit 2.
- **What puts a token in one host's list and not the other's** are these
  mechanisms; the tokens named below are measured EXAMPLES of each, not an
  inventory of it. **Declared leaf extras** — Commander options summon
  registers on every generator command that pragma's create surface does not,
  e.g. \`--show-files\`, \`--no-preview\`, \`--no-generated-stamp\`: each exits
  0 on summon and writes the tree, where
  \`pragma create component react src/components/B --show-files --yes\` is
  \`error: unknown option '--show-files'\`, exit 2, nothing written. They are
  not decoration — \`--no-generated-stamp\` CHANGES the generated bytes (the
  same file set, a different tree hash), a shape pragma cannot produce at
  all. **Root options that still parse at a LEAF** — summon never calls
  \`enablePositionalOptions\` (pragma calls it at every tier), so an option
  declared on summon's ROOT program is still consumed after a leaf path. \`-V\`
  is one: Commander's default \`--version\` spelling, which summon's root
  declares and pragma's create surface does not, so
  \`summon component react src/components/B -V --yes\` prints summon's own version and
  exits 0 having written nothing where the same argv on pragma is
  \`error: unknown option '-V'\`, exit 2 — pragma's whole-argv scan reads
  \`--version\`/\`-v\` only, so the two hosts' version SHORT forms are SWAPPED.
  \`-g\`/\`--generators\`, the discovery flag §1 names, is another: summon
  writes the tree from that directory's generators where
  \`pragma create … --generators <dir>\` is
  \`error: unknown option '--generators'\`, exit 2, nothing written. \`-v\` is
  the version swap's other half — a token COLLISION, not a spelling — but it
  is NOT this mechanism: it belongs to a different one on each side. On summon
  it is a declared leaf extra (the mechanism above, \`registerStandardFlags\`),
  so \`summon component react src/components/B --yes -v\` writes the tree
  while \`summon -v\` at the ROOT is \`error: unknown option '-v'\`, exit 2 —
  where \`-V\` and \`-g\` are consumed in BOTH positions. On pragma it is read
  by pragma's OWN pre-Commander whole-argv scan rather than by Commander, so
  \`pragma create … -v\` prints pragma's version and exits 0 having written
  nothing. (The BARE long form \`--verbose\` ports at a leaf; only the short
  form collides, and the \`=\` form is pragma-only — below.)
  **Pre-Commander whole-argv scans** — summon's bin
  inspects the raw argv and returns BEFORE Commander parses, so such a token
  is read wherever it sits and suppresses the scaffold entirely. The
  completion-protocol spellings are one such scan, and they are a CLASS rather
  than a token: \`--completion\`, its per-shell siblings, and any
  \`--compgen…\` prefix all exit 0 having written nothing to the target tree —
  some printing a completion script, some printing nothing at all — where each
  is \`error: unknown option '<token>'\`, exit 2 on pragma. The
  \`--setup-completion\`/\`--cleanup-completion\` pair is the sharpest case,
  the one summon extra whose effect lands OUTSIDE the target tree:
  \`summon component react src/components/B --setup-completion --yes\` exits 0
  having written NOTHING to the target tree — and rewritten the invoking
  user's shell init file — where the same argv on pragma is
  \`error: unknown option '--setup-completion'\`, exit 2.
  **A registered SUBCOMMAND** — the one mechanism whose extras are not flags,
  and the reason the RULE names the token kind. The two summon spellings reach
  it by DIFFERENT mechanisms, and only one is the barrel's: \`summon component
  help\` comes from the barrel turning Commander's \`help\` command back on at
  each NAMESPACE it registers (\`onNamespace: cmd.helpCommand(true)\`, which the
  projection's namespace action would otherwise suppress). \`summon help
  component\` does NOT — the root program is handed in already built and never
  enters that hook; it is Commander's own default \`help\` on the root, which
  answers with the named mechanism removed entirely. pragma deliberately
  declares neither — so both summon spellings print a usage page and exit 0, where \`pragma create component help\` is
  \`error: unknown command 'help'\` and \`pragma create help component\` is
  \`Error: Unknown command "help".\` — exit 2, nothing written, both of them
  the unknown-COMMAND class rather than the unknown-option one. It is a
  namespace spelling on both counts: no LEAF page on either host carries a
  \`help\` row, and after a complete leaf path the token is just a positional.
- **The mirror direction** — tokens pragma accepts and summon rejects
  loudly — is a CLASS: pragma's whole-argv scan swallows \`--detail\` (either
  spelling), any \`--detail=<value>\`, and any \`--verbose=<value>\` before
  Commander sees them, and summon answers each with
  \`error: unknown option '<token>'\`, exit 2, nothing written. The \`=\`
  forms are INERT on \`create\` — stdout,
  stderr and generated tree byte-identical to the run without the token
  (measured) — so
  \`pragma create component react src/components/B --detail=summary --yes\`
  writes a tree where the same argv on summon is
  \`error: unknown option '--detail=summary'\`, exit 2, nothing written, and
  \`--verbose=false\` flips the same way. The SPACE form \`--detail\` consumes
  WHATEVER token follows it, so its inertness is CONDITIONAL — and the
  condition is not that the successor is a level value: it is inert whenever
  the swallowed token is one the command DID NOT NEED. Measured
  byte-identical to the token-free run: \`--detail summary\` (a level value),
  \`--detail zzz\` (not a level value at all), and a trailing \`--detail\` with
  nothing following it. It is harmful exactly when it eats a token the command
  needed: \`pragma create component react --detail src/components/B --yes\`
  eats the PATH and exits 0 having scaffolded into the DEFAULT
  \`src/components/MyComponent\`, and
  \`pragma create component react src/components/B --detail --yes\` eats the
  \`--yes\`, turning a complete run into the shared refusal
  (\`Missing: --no-with-styles, --no-with-stories, --no-with-ssr-tests.\`),
  exit 2, nothing written — naming the missing ANSWERS, never the eaten flag.
  \`--format\` swallows its successor the same way but VALIDATES what it
  swallows, so it refuses loudly rather than silently:
  \`--format src/components/B\` is
  \`Error: Invalid format "src/components/B".\`, exit 2 — which is the ONE
  value asymmetry running the reverse way: pragma VALIDATES \`--format\`'s
  value where summon's \`--format <type>\` accepts any —
  \`pragma create … --format bogus\` is \`Error: Invalid format "bogus".\`,
  exit 2, nothing written (\`--format=bogus\` and \`--format=\` fail the same
  gate), where summon with each of the three exits 0 and writes the tree.

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
  stderr (modulo pragma's one-time first-run config note: host onboarding
  written before dispatch on a fresh install, outside this surface). Only an
  EXPLICITLY requested machine format reframes it: pragma's root
  \`--format json\`/\`--format llm\` render the same message through its
  error envelope (a host output concern outside the parity surface; summon's
  \`--format json\`/\`--llm\` imply \`--yes\`, so a summon refusal is always
  the bare line). Implicit auto-detection of an output mode never reframes a
  refusal. The template, emitted from \`refusalMessage\`:

  > ${refusalBase}

  With a missing list (the exemplar's conditional prompt is excluded — the
  \`Missing:\` list names each unconditional prompt absent from the explicit
  answers, declared order, by its PRIMARY registered long form from
  \`buildOptionInfo\` (§2) — \`--no-<kebab>\` for a default-true confirm,
  \`--<kebab>\` otherwise — so every listed token parses on the command
  that printed it; a live \`when\` and a projected \`conditional: true\`
  are treated identically):

  > ${refusalWithMissing}

- **\`wizard\`** asks exactly \`pendingPrompts(prompts, explicit)\`: the
  explicitly provided answers are never re-asked, and a conditional prompt
  surfaces only when its controller's answered value unlocks it. How a host
  PRESENTS the session — a completed-answer table, the step total, what
  \`esc\` does at the confirm gate — is host prose, outside this surface.
- **\`run\`** applies defaults over the explicit answers and executes without
  prompting. An EXPLICIT answer that fails its prompt's own constraint fails
  loudly (exit 2) in every non-MCP mode — batch, run, and wizard alike,
  validated downstream of the refuse decision (an incomplete non-TTY run
  REFUSES first: pragma's mount refuses before its create runtime loads, and
  summon mirrors that order) and before any UI renders or anything is
  written — with a message echoing the offending value:
  \`Invalid --<flag> "<value>": <detail>\` from a \`validate\` rejection,
  \`Invalid --<flag> "<value>". Valid values: <choices>.\` from a value
  outside a select's choices. For this class the shared LINE is the
  parity surface: pragma additionally renders it through its host error
  rendering — a plain \`Error: \` prefix, the condensed frame under
  auto-detected LLM output or an explicit \`--format llm\`, the envelope
  under \`--format json\` — while summon writes the bare line in every
  format. The declared path prompts
  (\`--component-path\` on the three component leaves, \`--app-path\`)
  each carry a \`validate\` that rejects an absolute path and \`..\`
  traversal, so an output path that would escape the invocation
  directory fails this SAME gate in both hosts on every declared leaf;
  pragma ADDITIONALLY refuses a path that RESOLVES outside the
  workspace through a symlink (its host-level jail, behind the shared
  validators — summon relies on the validator tier). Known residue,
  disclosed and OUT of contract: the UNVALIDATED summon-only generators
  outside the declared set (§1 — \`domain\`/\`route\`/\`wrapper\`, the
  builtins \`init\`, \`example/hello\`, \`example/webapp\`) take
  name/path prompts with no validator, and summon scaffolds where they
  point, the invocation directory's outside included; \`monorepo\` is
  not among them — its \`name\` prompt carries its own kebab-case
  validator, so \`../evil\` fails this same gate at exit 2. The batch modes
  additionally fail loudly (exit 2) on a required answer that is missing
  even after
  defaults, and re-check the defaults-applied set (an invalid generator
  default fails the same way). A failure raised PAST that gate keeps the
  same classes in every arm: a generator-raised typed invalid answer (a
  cross-answer constraint its own \`generate\` enforces) exits 2, and any
  other failure — an ordinary \`Error\` thrown by \`generate\` included,
  not only a failed effect — exits 1: in the batch arms as a stderr
  line, never a stack (summon writes the bare message; pragma renders it
  through its error envelope), in the run and wizard arms rendered by the
  host's UI (summon's Ink App reports on stdout; pragma's error rendering
  writes stderr). The stream and its framing are host presentation; the
  exit code is parity surface — a rendered failure never exits 0.

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
