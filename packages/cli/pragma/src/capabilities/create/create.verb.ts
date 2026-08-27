/**
 * The `create` verbs — `component` / `package` / `application`, the THREE
 * binding-level VerbSpecs (the MCP/covenant/reference grammar). Their params
 * DERIVE mechanically from the generators' own prompts, projected at build
 * time into `createSurface.generated.ts` — no hand mirrors, no flag aliases:
 * the prompt names ARE the param/MCP-arg names, the FLAG tokens are
 * `buildOptionInfo`'s registered forms (a default-true confirm registers
 * ONLY `--no-<kebab>` — the covenant and the doc gate speak that vocabulary
 * through the mount's registered-syntax seam, L-CIS-2), and `component`'s
 * params are the FRAMEWORK UNION of its three declared leaves plus a
 * required, positional `framework` enum derived from the tree segments
 * (L-CIS). The CLI mounts the
 * generator TREE itself (`create component react [component-path]` — see
 * `mount.ts`); these specs are what MCP tools and the emitted surface read.
 *
 * LAZY DISPATCH (R9 + lazy-React): only `@canonical/summon-core/projection`
 * (UI-free data-and-decisions, pinned light by its own graph guard) is
 * imported statically; `run` lazily `import()`s `pickGenerator` + summon-core,
 * so `buildProgram` / `--help` / `__complete` / reads never load summon-core
 * or the generators — and `create --yes` never loads React.
 */

import { isAbsolute } from "node:path";
import type { GeneratorResult } from "@canonical/summon-core";
import {
  decideInteraction,
  explicitAnswersComplete,
  missingExplicitFlags,
  type ProjectedPrompt,
  refusalMessage,
  toKebabCase,
} from "@canonical/summon-core/projection";
import type { Task } from "@canonical/task";
import { BIN_NAME } from "../../constants.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { ParamSpec, VerbSpec } from "../../kernel/spec/types.js";
import { COMPONENT_FRAMEWORKS, CREATE_GENERATORS } from "./constants.js";
import { createFormatters } from "./create.render.js";
import { CREATE_SURFACE } from "./createSurface.generated.js";
import { generatorToParams, promptToParam } from "./generatorToVerbSpec.js";
import { assertInsideWorkspace } from "./pathJail.js";
import type { CreateKind } from "./types.js";

// =============================================================================
// Params, derived from the projected surface (createSurface.generated.ts)
// =============================================================================

/**
 * `framework` — the component tree segments as a REQUIRED positional enum
 * (`create component <framework>`), values derived from the declared paths.
 * Deliberately NO default: summon has no default framework, and neither does
 * the projection of it.
 */
const FRAMEWORK_PARAM: ParamSpec = {
  kind: "enum",
  name: "framework",
  doc: "Component framework — the tree segment (`create component <framework>`).",
  values: COMPONENT_FRAMEWORKS,
  required: true,
  positional: true,
};

/**
 * The FRAMEWORK UNION of the component leaves' prompts (A4): first-seen order
 * over the declared framework order; a prompt identical across all declaring
 * frameworks keeps its default; a prompt whose default DIFFERS across
 * frameworks omits it (`required: false` — the selected framework's own
 * prompt default applies at run time); a prompt not present on every
 * framework gets its doc suffixed with the declaring frameworks.
 */
function unionComponentParams(): ParamSpec[] {
  const paths = CREATE_GENERATORS.component.paths;
  const byName = new Map<
    string,
    { prompt: ProjectedPrompt; frameworks: string[]; defaults: unknown[] }
  >();
  const order: string[] = [];
  for (const commandPath of paths) {
    const framework = commandPath.split("/")[1] as string;
    for (const prompt of surfaceFor(commandPath).prompts) {
      let entry = byName.get(prompt.name);
      if (!entry) {
        entry = { prompt, frameworks: [], defaults: [] };
        byName.set(prompt.name, entry);
        order.push(prompt.name);
      }
      entry.frameworks.push(framework);
      entry.defaults.push(prompt.default);
    }
  }
  return order.map((name) => {
    const entry = byName.get(name) as NonNullable<
      ReturnType<typeof byName.get>
    >;
    const universal = entry.frameworks.length === paths.length;
    const agreed = entry.defaults.every((value) =>
      Object.is(value, entry.defaults[0]),
    );
    const param = promptToParam(
      agreed ? entry.prompt : { ...entry.prompt, default: undefined },
    );
    return {
      ...param,
      ...(universal
        ? {}
        : { doc: `${param.doc} (frameworks: ${entry.frameworks.join(", ")})` }),
      ...(agreed ? {} : { required: false }),
    } as ParamSpec;
  });
}

/** The projected surface for a declared path (fails loud on a stale build). */
function surfaceFor(commandPath: string) {
  const surface = CREATE_SURFACE[commandPath];
  if (!surface) {
    throw new Error(
      `createSurface.generated.ts carries no entry for declared path "${commandPath}" — rerun the build`,
    );
  }
  return surface;
}

const componentParams: ParamSpec[] = [
  FRAMEWORK_PARAM,
  ...unionComponentParams(),
];
const packageParams: ParamSpec[] = generatorToParams(
  surfaceFor("package").prompts,
);
const applicationParams: ParamSpec[] = generatorToParams(
  surfaceFor("application/react").prompts,
);

/** The path param each noun jails (package writes into a name-derived subdir). */
const PATH_PARAM: Record<CreateKind, string | undefined> = {
  component: "componentPath",
  package: undefined,
  application: "appPath",
};

/**
 * The two value classes the shared prompt validators reject as workspace
 * ESCAPES — absolute, and any `..` segment: exactly the jail's own
 * non-symlink classes, which the round-9 reorder moved onto the validator
 * tier. Used to keep the jail-tier `recovery` hint on those rejections.
 */
const isEscapeValue = (value: unknown): boolean =>
  typeof value === "string" &&
  (isAbsolute(value) || value.split(/[/\\]/).includes(".."));

// =============================================================================
// The lazy run — the one-line summon↔pragma seam per invocation
// =============================================================================

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
 * Load the create runtime — the generator selector and summon-core.
 *
 * Lazy, and the specifiers stay STATIC so they remain analysable: importing
 * these pulls summon-core and with it React, which must stay off `--help`,
 * completion and every read. The generators load their own templates from their
 * own packages on first `generate()`.
 *
 * A resolution failure means a broken or pruned install, and
 * {@link isModuleNotFound} turns it into a clean refusal rather than an
 * internal-bug report.
 */
async function loadCreateRuntime() {
  try {
    const [summon, pick] = await Promise.all([
      import("@canonical/summon-core"),
      import("./pickGenerator.js"),
    ]);
    return { pickGenerator: pick.pickGenerator, summon };
  } catch (cause) {
    if (isModuleNotFound(cause)) {
      throw new PragmaError({
        code: "UNSUPPORTED",
        message:
          "`create` cannot load its generator runtime — the `@canonical/summon-*` packages it depends on could not be resolved.",
        recovery: {
          message: `Reinstall ${BIN_NAME}; its generator dependencies look missing.`,
        },
      });
    }
    throw cause;
  }
}

/** The create noun that declares a command path. */
function kindOf(commandPath: string): CreateKind {
  for (const [kind, binding] of Object.entries(CREATE_GENERATORS)) {
    if ((binding.paths as readonly string[]).includes(commandPath)) {
      return kind as CreateKind;
    }
  }
  throw PragmaError.internalError(`undeclared command path ${commandPath}`);
}

/**
 * Build the `create` Task for one invocation of a declared COMMAND PATH: pick
 * the generator, pre-validate the provided answers (the shared validator
 * tier), jail its output path (the host backstop, after validation),
 * decide the interaction mode (the ONE shared decision — same function, same
 * inputs as the summon bin), and return `execute` wired to the strategy the
 * mode names.
 *
 * `params` are the EXPLICIT answers only (CLI flags/positional; MCP args
 * carry schema defaults, which is that transport's contract). MCP keeps its
 * plan-first/confirm path untouched — `decideInteraction` is CLI-only.
 *
 * @param commandPath - The declared command path (`component/react`, …).
 * @param params - The provided answers for this invocation.
 * @param rt - The pragma runtime.
 * @returns A `Promise<Task<GeneratorResult>>` (the union's third arm) the
 *   dispatcher/MCP handler awaits into a Task before interpreting.
 */
export async function runCreate(
  commandPath: string,
  params: Record<string, unknown>,
  rt: PragmaRuntime,
): Promise<Task<GeneratorResult>> {
  // Lazy: importing these pulls summon-core (and with it React) — kept off every
  // non-create path. The specifiers stay static so they remain analysable; the
  // embedded `.ejs` manifest is injected here as the disk read's fallback.
  const { pickGenerator, summon } = await loadCreateRuntime();

  const generator = pickGenerator(commandPath);
  const kind = kindOf(commandPath);

  // The tree segment is not an answer: drop a stray `framework` key so the
  // generators (whose prompts never include it) see only their own answers.
  const answers: Record<string, unknown> = { ...params };
  delete answers.framework;

  // Reject a flag/arg-provided answer that fails its prompt's own constraint,
  // with a clean INVALID_INPUT (execute re-validates as a backstop). Runs
  // BEFORE the jail: the path prompts' own validators reject absolute/`..`
  // escapes, so an escaping output path fails the SHARED validator line in
  // both hosts (the cross-CLI matrix) and the jail below stays the backstop
  // its docblock claims.
  const pathParam = PATH_PARAM[kind];
  const invalid = summon.validateAnswers(generator.prompts, answers);
  if (invalid !== null) {
    // A rejection of the JAILED path param's escape classes (absolute /
    // `..` — the two the round-9 reorder moved off the jail) attaches ONE
    // workspace hint to BOTH classes — the jail's `..`-branch message —
    // deliberately NOT reproducing the jail's per-branch hints (its
    // absolute branch says "Use a path relative to the current
    // directory."; those stay the jail's own, pinned in pathJail.test.ts).
    // The message stays the validator's — the shared cross-host line. A
    // non-escape rejection of the same param (e.g. casing) never carried
    // recovery and still does not.
    const escaped =
      pathParam !== undefined &&
      invalid.startsWith(`Invalid --${toKebabCase(pathParam)} `) &&
      isEscapeValue(answers[pathParam]);
    throw new PragmaError({
      code: "INVALID_INPUT",
      message: invalid,
      ...(escaped
        ? { recovery: { message: "The path must stay inside the workspace." } }
        : {}),
    });
  }

  // SEC-2: reject a path escaping the workspace BEFORE any effect runs — the
  // host-level backstop behind the validators, and the only tier that catches
  // a symlink RESOLVING outside the workspace.
  if (pathParam) assertInsideWorkspace(pathParam, answers[pathParam], rt.cwd);

  // An ABSENT interaction context defaults to `yes: false` — nothing may
  // silently auto-apply just because a caller forgot to say how it is driven.
  const { isTTY, transport, yes, signal, abort } = rt.interaction ?? {
    isTTY: false,
    transport: "cli" as const,
    yes: false,
  };
  const stamp = summon.createGeneratorStamp(generator);

  // MCP: params-or-error, plan-first/confirm — untouched by the decision
  // table (an MCP call is never a terminal session).
  if (transport === "mcp") {
    const prompt = summon.mcpPrompt(answers);
    rt.exec = {
      cwd: rt.cwd,
      promptHandler: prompt,
      onEffectStart: summon.createStampOnEffectStart(stamp),
      onLog: (_level, message) => process.stderr.write(`${message}\n`),
      signal,
    };
    return summon.execute(generator, { prompt, params: answers, signal });
  }

  // The ONE interaction decision (R2) — the same function, over the same five
  // inputs, as the summon bin. The mount refuses before ever loading this
  // runtime; re-deriving here keeps direct kernel callers honest too.
  const { mode } = decideInteraction({
    dryRun: rt.mutation?.preview === true,
    undo: rt.mutation?.undo === true,
    yes: yes === true,
    isTTY: isTTY === true,
    explicitComplete: explicitAnswersComplete(generator.prompts, answers),
  });

  if (mode === "refuse") {
    throw new PragmaError({
      code: "INVALID_INPUT",
      message: refusalMessage(missingExplicitFlags(generator.prompts, answers)),
    });
  }

  // Wizard: ask exactly the pending prompts — the provided answers are
  // explicit and pre-seeded; `collectAnswers` skips them and evaluates each
  // conditional against the answers as they land (wizard-script parity).
  if (mode === "wizard") {
    // `onCancel` (H2): an in-Ink Ctrl-C during execution aborts the run so the
    // interpreter stops writing — raw mode swallows the SIGINT, so the wizard
    // drives the abort. Shared with setup by construction.
    // `cwd` also reaches the wizard: its confirm-gate preview reads the same
    // jail-checked write root the interpreter resolves effect paths against.
    const session = summon.inkPrompt(generator, {
      signal,
      onCancel: abort,
      cwd: rt.cwd,
      // Flag-provided answers reach the wizard too: without the seed the
      // confirm gate previews with them missing (undefined paths, wrong plan).
      initialAnswers: answers,
    });
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

  // run / batch-dry-run / batch-undo: flags + defaults, never a wizard —
  // `autoPrompt` resolves each unprovided prompt to its default or fails
  // loudly on a missing required answer. Same per-call write root as the
  // wizard branch: `rt.cwd` feeds both the SEC-2 jail and the interpreter's
  // effect-path base, atomically.
  const prompt = summon.autoPrompt(answers);
  rt.exec = {
    cwd: rt.cwd,
    promptHandler: prompt,
    onEffectStart: summon.createStampOnEffectStart(stamp),
    onLog: (_level, message) => process.stderr.write(`${message}\n`),
    signal,
  };
  return summon.execute(generator, { prompt, params: answers, signal });
}

/**
 * The shared capability: storeless, mutating, interactive, MCP-exposed.
 *
 * `destructive: false` is load-bearing (D4): create only WRITES NEW files, so it
 * is explicitly non-destructive. Without it `annotationsFor` emits no
 * `destructiveHint`, and MCP clients default an unset hint on a non-read-only
 * tool to `true` — advertising create as destructive, the opposite of intent.
 */
export const CREATE_CAPABILITY = {
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
 *
 * The binding-level `run` maps its kind (+ `framework` for component) onto
 * the declared command path — the MCP transport's view of the tree.
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
    run: (params_, rt) => {
      let commandPath: string;
      if (kind === "component") {
        const framework = String(params_.framework ?? "");
        if (!COMPONENT_FRAMEWORKS.includes(framework)) {
          throw PragmaError.invalidInput("framework", framework, {
            validOptions: [...COMPONENT_FRAMEWORKS],
          });
        }
        commandPath = `component/${framework}`;
      } else {
        commandPath = CREATE_GENERATORS[kind].paths[0];
      }
      return runCreate(
        commandPath,
        params_,
        rt,
      ) as unknown as Task<GeneratorResult>;
    },
  };
}

/**
 * The `create` verbs, one per declared generator binding — so adding a binding
 * to {@link CREATE_GENERATORS} without surfacing it is a type error rather than
 * a silent no-op. Key order is authoring order, which `index.ts` preserves into
 * the command tree, `--help` and the emitted surface.
 */
export const createVerbs: Record<
  CreateKind,
  VerbSpec<Record<string, unknown>, GeneratorResult>
> = {
  component: createVerb(
    "component",
    "Scaffold a React, Svelte, or Lit component.",
    componentParams,
    [
      {
        cmd: `${BIN_NAME} create component react src/components/Button`,
        note: "React component with tests, stories, and styles",
      },
      {
        cmd: `${BIN_NAME} create component svelte src/lib/Card --dry-run`,
        note: "preview the files without writing",
      },
    ],
  ),
  package: createVerb(
    "package",
    "Scaffold a new npm package for the monorepo.",
    packageParams,
    [
      {
        cmd: `${BIN_NAME} create package --name @canonical/my-lib --type library`,
      },
      {
        cmd: `${BIN_NAME} create package --name @canonical/my-tool --no-run-install`,
      },
    ],
  ),
  application: createVerb(
    "application",
    "Scaffold a full React application with SSR and routing.",
    applicationParams,
    [
      { cmd: `${BIN_NAME} create application react my-app` },
      { cmd: `${BIN_NAME} create application react my-app --relay` },
    ],
  ),
};
