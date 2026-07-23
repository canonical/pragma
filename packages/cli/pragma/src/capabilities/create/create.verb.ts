/**
 * The `create` verbs — `component` / `package` / `application` (path capped at
 * two segments; the three component frameworks collapse to one verb + a
 * `--framework` enum). Each is a mutating, interactive, storeless verb.
 *
 * LAZY DISPATCH (R9 + lazy-React): the params are STATIC — built by the
 * generator→grammar adapter over static prompt MIRRORS, never the live
 * generators (importing a generator runs a top-level `await loadTemplate`). The
 * `run` body lazily `import()`s `pickGenerator` + summon-core, so `buildProgram`
 * / `--help` / `__complete` / reads never load summon-core or the generators —
 * and `create --yes` never loads React (the Ink UI is dynamic-only, and only the
 * TTY branch even asks for it). A parity test loads the real generators and
 * asserts the mirrors still match.
 */

import type { GeneratorResult, PromptDefinition } from "@canonical/summon-core";
import type { Task } from "@canonical/task";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { ParamSpec, VerbSpec } from "../../kernel/spec/types.js";
import { createFormatters } from "./create.render.js";
import { generatorToParams } from "./generatorToVerbSpec.js";
import { assertNoOverwrite } from "./overwriteGuard.js";
import { assertInsideWorkspace } from "./pathJail.js";
import type { CreateKind } from "./types.js";

/**
 * Whether the overwrite guard is skipped for this invocation: a plan-only
 * preview (`--dry-run` / MCP plan-first) never writes, and an `--undo` reverses
 * a prior run rather than creating — in both cases the target files existing is
 * expected, not a conflict. The projector sets `rt.mutation.preview`/`.undo`.
 */
function skipsOverwriteGuard(rt: PragmaRuntime): boolean {
  return rt.mutation?.preview === true || rt.mutation?.undo === true;
}

// =============================================================================
// Static params (mirrors of the generators' prompts — see the module doc)
// =============================================================================

/**
 * `--force` — opt in to overwriting existing files. Without it, a `create` run
 * that would clobber a file already on disk is refused (the data-loss guard);
 * with it, the generator writes over them. Shared by all three create verbs.
 */
const FORCE_PARAM: ParamSpec = {
  kind: "boolean",
  name: "force",
  doc: "Overwrite existing files instead of refusing when the target path already exists.",
};

/** `--framework` — the three component generators collapsed to one enum. */
const FRAMEWORK_PARAM: ParamSpec = {
  kind: "enum",
  name: "framework",
  doc: "Component framework.",
  values: ["react", "svelte", "lit"],
  default: "react",
};

/**
 * `componentPath` — positional, and deliberately WITHOUT a ParamSpec default so
 * the selected framework's own prompt default applies (react vs svelte/lit
 * differ); `required: false` keeps it optional despite having no default here.
 */
const COMPONENT_PATH_PARAM: ParamSpec = {
  kind: "string",
  name: "componentPath",
  doc: "Component path (its final segment is the PascalCase component name).",
  required: false,
  positional: true,
  complete: { kind: "files" },
};

const SHARED_COMPONENT_MIRROR: PromptDefinition[] = [
  {
    name: "withStyles",
    type: "confirm",
    message: "Include styles?",
    default: true,
  },
  {
    name: "withStories",
    type: "confirm",
    message: "Include Storybook stories?",
    default: true,
  },
  {
    name: "withSsrTests",
    type: "confirm",
    message: "Include SSR tests?",
    default: true,
  },
];

const PACKAGE_MIRROR: PromptDefinition[] = [
  {
    name: "name",
    type: "text",
    message: "Package name:",
    default: "@canonical/my-package",
  },
  {
    name: "type",
    type: "select",
    message: "Package type:",
    choices: [
      { label: "tool-ts", value: "tool-ts" },
      { label: "library", value: "library" },
      { label: "css", value: "css" },
    ],
    default: "tool-ts",
  },
  {
    name: "description",
    type: "text",
    message: "Package description:",
    default: "",
  },
  {
    name: "withReact",
    type: "confirm",
    message: "Include React dependencies?",
    default: false,
  },
  {
    name: "withStorybook",
    type: "confirm",
    message: "Include Storybook setup?",
    default: false,
  },
  {
    name: "withCli",
    type: "confirm",
    message: "Include a CLI binary entry point?",
    default: false,
  },
  {
    name: "withPrTemplate",
    type: "confirm",
    message: "Include a PR template?",
    default: false,
  },
  // Opt-in (default false): the grammar has no `--no-` form, so a default-true
  // boolean could never be turned off. `--run-install` enables it.
  {
    name: "runInstall",
    type: "confirm",
    message: "Run the package manager install after creation?",
    default: false,
  },
];

// The include-flag prompts carry the CLI grammar's `--with-X` names
// (`withSsr`/`withRouter`/`withForms`/`withRelay`, AV-228 B8) rather than the
// summon generator's bare prompt names (`ssr`/`router`/`forms`/`relay`). {@link
// INCLUDE_FLAG_ALIASES} maps them back at the CLI↔generator boundary so the
// generator prompt names — and their embedded templates + byte-equality
// goldens — stay stable. `--run-install` (default false) is an action flag, not
// an include, so it keeps its spelling.
const APPLICATION_MIRROR: PromptDefinition[] = [
  {
    name: "appPath",
    type: "text",
    message: "Application directory:",
    default: "my-app",
    positional: true,
  },
  { name: "withSsr", type: "confirm", message: "Include SSR?", default: true },
  {
    name: "withRouter",
    type: "confirm",
    message: "Include router?",
    default: true,
  },
  {
    name: "withForms",
    type: "confirm",
    message: "Include form components?",
    default: true,
  },
  {
    name: "withRelay",
    type: "confirm",
    message: "Include a Relay (GraphQL) data layer?",
    default: false,
  },
  {
    name: "runInstall",
    type: "confirm",
    message: "Install dependencies now?",
    default: false,
  },
];

/**
 * CLI include-flag names → summon generator prompt names, per create kind
 * (AV-228 B8). All four `create application` include-flags are exposed on the
 * unified `--with-X` convention, so their params arrive keyed `withSsr`/
 * `withRouter`/`withForms`/`withRelay`; the summon generator reads the bare
 * `ssr`/`router`/`forms`/`relay`. We normalize at the ONE CLI↔generator seam
 * ({@link toGeneratorAnswers}), keeping the generator prompt names (and their
 * templates/goldens) untouched. Component and package already use `--with-X`
 * names that match their prompts, so their maps are empty.
 */
export const INCLUDE_FLAG_ALIASES: Record<
  CreateKind,
  Readonly<Record<string, string>>
> = {
  component: {},
  package: {},
  application: {
    withSsr: "ssr",
    withRouter: "router",
    withForms: "forms",
    withRelay: "relay",
  },
};

/**
 * Re-key a param bag's CLI include-flag aliases to the generator prompt names,
 * so the summon generator reads `ssr` where the CLI grammar exposes `--with-ssr`.
 *
 * @param kind - The create noun (selects the alias map).
 * @param params - The coerced CLI/MCP param bag.
 * @returns A new bag with aliased keys renamed to the generator prompt names.
 */
export function toGeneratorAnswers(
  kind: CreateKind,
  params: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const aliases = INCLUDE_FLAG_ALIASES[kind];
  const answers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    answers[aliases[key] ?? key] = value;
  }
  return answers;
}

const componentParams: ParamSpec[] = [
  FRAMEWORK_PARAM,
  COMPONENT_PATH_PARAM,
  ...generatorToParams(SHARED_COMPONENT_MIRROR),
  FORCE_PARAM,
];
const packageParams: ParamSpec[] = [
  ...generatorToParams(PACKAGE_MIRROR),
  FORCE_PARAM,
];
const applicationParams: ParamSpec[] = [
  ...generatorToParams(APPLICATION_MIRROR),
  FORCE_PARAM,
];

/** The path param each noun jails (package writes into a name-derived subdir). */
const PATH_PARAM: Record<CreateKind, string | undefined> = {
  component: "componentPath",
  package: undefined,
  application: "appPath",
};

// =============================================================================
// The lazy run — the one-line summon↔pragma seam per invocation
// =============================================================================

/**
 * Build the `create` Task for one invocation: pick the generator, jail its
 * output path, pre-validate flag/arg answers, pick the prompt strategy against
 * the interaction context, wire `runtime.exec`, and return `execute`.
 *
 * @returns A `Promise<Task<GeneratorResult>>` (the union's third arm) the
 *   dispatcher/MCP handler awaits into a Task before interpreting.
 */
/**
 * The standalone `bun build --compile` binary resolves every bundled module
 * under the virtual `/$bunfs` filesystem — a marker absent from any source or
 * `bun`-run module URL. `create component` is fully embedded and runs from the
 * binary; `create package` / `create application` are NOT (application also
 * copies non-`.ejs` assets), so they are gated to a source run below.
 */
const IS_COMPILED_BINARY = import.meta.url.includes("/$bunfs/");

/**
 * True when a dynamic import failed because the module could not be RESOLVED.
 * summon-core + the generators are now bundled into the binary, so this should
 * not arise; {@link loadCreateRuntime} keeps it as a defensive backstop that
 * turns a resolution failure into a clean gate rather than a raw "internal bug"
 * report. Matched structurally across bun (`ResolveMessage`) and node
 * (`ERR_MODULE_NOT_FOUND`) so a genuine runtime error still propagates.
 */
export function isModuleNotFound(cause: unknown): boolean {
  if (!cause || typeof cause !== "object") return false;
  const { code, name, message } = cause as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
  };
  return (
    code === "ERR_MODULE_NOT_FOUND" ||
    code === "MODULE_NOT_FOUND" ||
    name === "ResolveMessage" ||
    (typeof message === "string" &&
      /cannot find (module|package)/i.test(message))
  );
}

/**
 * Load the create runtime: inject the embedded template manifest, then import
 * the generator selector + summon-core (STATIC dynamic imports, so bun's
 * `--compile` bundler includes them — they stay behind this lazy boundary, so
 * the fast paths and `create --yes` still load neither summon-core nor React).
 *
 * The manifest is injected BEFORE `pickGenerator` — importing the generator
 * packages runs a top-level `await loadTemplate`, and the component loader
 * consults the manifest when its disk read fails (the compiled binary). It is
 * imported from summon-component's `loadTemplate` submodule so this does not
 * evaluate the generator index first. In a source run the disk read wins and the
 * manifest is inert.
 *
 * `create package` / `create application` are not yet embedded for the compiled
 * binary (application also copies non-`.ejs` assets), so they are gated to a
 * source run here. A stale resolution failure is a defensive backstop
 * {@link isModuleNotFound} turns into the same clean gate.
 */
async function loadCreateRuntime(kind: CreateKind) {
  if (IS_COMPILED_BINARY && kind !== "component") {
    throw new PragmaError({
      code: "UNSUPPORTED",
      message: `\`create ${kind}\` is not available in the compiled pragma binary yet — only \`create component\` is embedded. Run it from a source checkout, or use the \`summon\` CLI.`,
      recovery: {
        message: `Run \`create ${kind}\` from a source checkout, or use \`summon\`.`,
      },
    });
  }
  try {
    // Inject the embedded manifest before the generators evaluate.
    const [{ setEmbeddedTemplates }, { TEMPLATES }] = await Promise.all([
      import("@canonical/summon-component/embedded"),
      import("./templates.embedded.generated.js"),
    ]);
    setEmbeddedTemplates(TEMPLATES);

    const [pick, summon] = await Promise.all([
      import("./pickGenerator.js"),
      import("@canonical/summon-core"),
    ]);
    return { pickGenerator: pick.pickGenerator, summon };
  } catch (cause) {
    if (isModuleNotFound(cause)) {
      throw new PragmaError({
        code: "UNSUPPORTED",
        message:
          "`create` could not load its generator runtime. Run it from a source checkout, or use the `summon` CLI.",
        recovery: {
          message: "Run `create` from a source checkout, or use `summon`.",
        },
      });
    }
    throw cause;
  }
}

async function runCreate(
  kind: CreateKind,
  params: Record<string, unknown>,
  rt: PragmaRuntime,
): Promise<Task<GeneratorResult>> {
  // Lazy: importing these runs the generators' top-level template loads and
  // pulls summon-core — kept off every non-create path. Now STATIC dynamic
  // imports so `--compile` bundles them; the generators' `.ejs` are embedded and
  // injected here. `package`/`application` stay a source-run feature in the binary.
  const { pickGenerator, summon } = await loadCreateRuntime(kind);

  // Normalize the CLI/MCP `--with-X` include-flags to the generator prompt names
  // (AV-228 B8) once, at this seam; every summon interaction below reads the
  // generator-facing `answers` bag so the generator prompt names stay stable.
  // `force` is a pragma-CLI concern (the overwrite guard), NOT a generator
  // prompt, so it is stripped before the generator ever sees the answers.
  const { force: _force, ...generatorParams } = params;
  const answers = toGeneratorAnswers(kind, generatorParams);

  const generator = pickGenerator(kind, answers);

  // SEC-2: reject a path escaping the workspace BEFORE any effect runs.
  const pathParam = PATH_PARAM[kind];
  if (pathParam) assertInsideWorkspace(pathParam, answers[pathParam], rt.cwd);

  // Reject a flag/arg-provided answer that fails its prompt's own constraint,
  // with a clean INVALID_INPUT (execute re-validates as a backstop).
  const invalid = summon.validateAnswers(generator.prompts, answers);
  if (invalid !== null) {
    throw new PragmaError({ code: "INVALID_INPUT", message: invalid });
  }

  const { isTTY, transport, yes, signal, abort } = rt.interaction ?? {
    isTTY: false,
    transport: "cli" as const,
    yes: true,
  };
  const stamp = summon.createGeneratorStamp(generator);

  // TTY without --yes → the embedded Ink wizard (identical #819 flow). The
  // session both answers prompts and renders live effect progress, so its
  // callbacks ride runtime.exec alongside the shared stamping transform.
  if (isTTY && !yes) {
    // `onCancel` (H2): an in-Ink Ctrl-C during execution aborts the run so the
    // interpreter stops writing — raw mode swallows the SIGINT, so the wizard
    // drives the abort. Shared with setup by construction.
    const session = summon.inkPrompt(generator, { signal, onCancel: abort });
    // Thread the per-call write root: the interpreter resolves the generator's
    // relative output paths against `rt.cwd` — the SAME dir the SEC-2 jail
    // validated above — so the write can never escape the checked directory.
    rt.exec = {
      cwd: rt.cwd,
      promptHandler: session.promptHandler,
      onEffectStart: summon.createStampOnEffectStart(
        stamp,
        session.onEffectStart,
      ),
      onEffectComplete: session.onEffectComplete,
      onLog: session.onLog,
      dispose: session.dispose,
      signal,
    };
    return summon.execute(generator, {
      prompt: session.promptHandler,
      params: answers,
      signal,
    });
  }

  // Non-interactive: MCP → params-or-error; CLI/--yes/CI → flags+defaults.
  const prompt =
    transport === "mcp"
      ? summon.mcpPrompt(answers)
      : summon.autoPrompt(answers);
  // Same per-call write root as the Ink branch: `rt.cwd` feeds both the SEC-2
  // jail and the interpreter's effect-path base, atomically.
  rt.exec = {
    cwd: rt.cwd,
    promptHandler: prompt,
    onEffectStart: summon.createStampOnEffectStart(stamp),
    onLog: (_level, message) => process.stderr.write(`${message}\n`),
    signal,
  };
  // Overwrite guard (data-loss fix): on the NON-INTERACTIVE path (--yes / MCP /
  // CI) all answers are already resolved, so a task dry-runs cleanly — refuse to
  // silently clobber files a developer may have hand-edited unless --force was
  // passed. A dry-run (`--dry-run`) or --force skips the guard: a preview never
  // writes, and --force is the explicit opt-in. The TTY wizard branch above
  // shows live progress + a confirm gate to a human, so its overwrites are
  // visible rather than silent.
  //
  // The guard dry-runs a SEPARATE task instance — `execute` returns a task
  // backed by a single-use generator, so dry-running the same task we then run
  // for real would exhaust it (yielding an effect-less result). Building a fresh
  // task for the preview keeps the returned one pristine.
  if (!skipsOverwriteGuard(rt)) {
    const previewTask = summon.execute(generator, {
      prompt,
      params: answers,
      signal,
    });
    assertNoOverwrite(previewTask, rt.cwd, params.force === true);
  }
  return summon.execute(generator, { prompt, params: answers, signal });
}

/**
 * The shared capability: storeless, mutating, interactive, MCP-exposed.
 *
 * `destructive: false` is load-bearing (D4) and now HONEST by construction: the
 * overwrite guard (`assertNoOverwrite`) refuses to clobber existing files unless
 * `--force` is passed, so a default `create` only ever writes NEW files. Without
 * the flag `annotationsFor` emits no `destructiveHint`, and MCP clients default
 * an unset hint on a non-read-only tool to `true` — advertising create as
 * destructive, the opposite of intent.
 */
const CREATE_CAPABILITY = {
  needsStore: false,
  mutates: true,
  destructive: false,
  interactive: true,
  mcp: {
    expose: true as const,
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
};

/**
 * Build a create verb. `run` presents `Promise<Task<R>>` through the `Task<R>`
 * arm by an honest cast at this one site (mirroring `sources update`): a literal
 * `Promise<Task<R>>` arm in the union would poison async read-verb inference.
 */
function createVerb(
  kind: CreateKind,
  summary: string,
  params: ParamSpec[],
  examples: VerbSpec["examples"],
): VerbSpec<Record<string, unknown>, GeneratorResult> {
  return {
    path: ["create", kind],
    summary,
    params,
    output: { formatters: createFormatters },
    examples,
    capability: CREATE_CAPABILITY,
    run: (params_, rt) =>
      runCreate(kind, params_, rt) as unknown as Task<GeneratorResult>,
  };
}

export const createComponentVerb = createVerb(
  "component",
  "Scaffold a React, Svelte, or Lit component.",
  componentParams,
  [
    {
      cmd: "pragma create component src/components/Button --framework react",
      note: "React component with tests, stories, and styles",
    },
    {
      cmd: "pragma create component src/lib/Card --framework svelte --dry-run",
      note: "preview the files without writing",
    },
  ],
);

export const createPackageVerb = createVerb(
  "package",
  "Scaffold a new npm package for the monorepo.",
  packageParams,
  [
    { cmd: "pragma create package --name @canonical/my-lib --type library" },
    { cmd: "pragma create package --name @canonical/my-tool --run-install" },
  ],
);

export const createApplicationVerb = createVerb(
  "application",
  "Scaffold a full React application with SSR and routing.",
  applicationParams,
  [
    { cmd: "pragma create application my-app" },
    { cmd: "pragma create application my-app --with-relay" },
  ],
);
