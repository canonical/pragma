#!/usr/bin/env node
/**
 * CLI entry point for `pragma` (v2 kernel).
 *
 * The composition root. Ordered early exits keep the hot paths minimal and
 * side-effect-free: `mcp serve` serves over stdio (D9); `__complete` resolves
 * completions storelessly *before* first-run so the greeting never leaks into a
 * shell buffer; `--version` prints and exits. Otherwise: parse global flags,
 * reject a bad `--format`, run first-run onboarding, then build the Commander
 * program from the capabilities and dispatch. Heavy modules are dynamic-imported
 * so `--help`/`__complete` load neither zod nor any verb run body.
 *
 * @note Impure — reads argv/env, writes stdout/stderr, sets the exit code.
 */

import type { Command } from "commander";
import {
  BIN_NAME,
  DETAIL_LEVELS,
  ISSUES_URL,
  PROGRAM_DESCRIPTION,
  VERSION,
} from "./constants.js";

/**
 * The flags a bare invocation answers itself. `--version` returns earlier; the
 * help form falls through to the front door, which IS its answer — so the
 * unknown-flag guard must not mistake it for a typo. One spelling per flag:
 * no `-h`/`-v` shorts exist anywhere on the surface.
 */
const ROOT_FLAGS = new Set(["--help", "--version"]);

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  // 1. MCP server entry (D9) — `pragma mcp serve` serves over stdio.
  //    The exit is NARROW on purpose: argv must be EXACTLY those two tokens.
  //    The server's startup has to stay minimal and stdio-pure (no first-run
  //    banner, no config read, nothing on stdout but JSON-RPC), which is what
  //    this shortcut buys — but the noun itself is ordinary grammar, so
  //    `pragma mcp`, `pragma mcp --help` and `pragma mcp serve --help` fall
  //    through to the same help machinery every other noun uses, and root
  //    help's promise that `--help` works on any command becomes true.
  //    Matching on a PREFIX would extend that purity budget to malformed argv
  //    it was never bought for: `mcp serve extra` would serve instead of
  //    letting Commander reject the excess argument, and `mcp serve --version`
  //    would serve instead of answering the global flag. Anything suffixed
  //    falls through to the ordinary grammar, which owns both jobs.
  if (argv.length === 2 && argv[0] === "mcp" && argv[1] === "serve") {
    const [{ serveMcp }, { capabilities }] = await Promise.all([
      import("./kernel/project/mcp/serve.js"),
      import("./capabilities/index.js"),
    ]);
    await serveMcp(capabilities);
    return;
  }

  // 2. Completion resolver — storeless, and reached before anything that could
  //    print, so a completion request is never polluted by a hint.
  //    Protocol: `pragma __complete -- <words…>`; the first `--` is framing
  //    (tolerated absent) and is stripped here so a later bare `--` stays the
  //    user's end-of-options. Candidates go to stdout newline-delimited (zero
  //    candidates → zero bytes); the entity tier reads the active pack's index
  //    (storeless), never the store; `runComplete` never throws.
  if (argv[0] === "__complete") {
    const [{ runComplete }, { indexCompletionEnv }, { capabilities }] =
      await Promise.all([
        import("./kernel/completion/complete.js"),
        import("./kernel/completion/entitySource.js"),
        import("./capabilities/index.js"),
      ]);
    const words = argv[1] === "--" ? argv.slice(2) : argv.slice(1);
    const matches = await runComplete(
      words,
      capabilities,
      indexCompletionEnv(process.cwd()),
    );
    if (matches.length > 0) process.stdout.write(`${matches.join("\n")}\n`);
    return;
  }

  // 2b. Internal store smoke probe — boots the embedded pack (oxigraph WASM +
  //     pack cache). Not a user command; the WASM-embed smoke test spawns it.
  if (argv[0] === "__store-probe") {
    const { runStoreProbe } = await import("./kernel/runtime/probe.js");
    process.stdout.write(`${await runStoreProbe()}\n`);
    return;
  }

  const {
    findValuedVerbose,
    parseGlobalFlags,
    readRawDetail,
    readRawFormat,
    stripGlobalFlags,
  } = await import("./kernel/project/cli/globalFlags.js");
  const globalFlags = parseGlobalFlags(argv);

  // 3. `--version` is global — print and exit wherever it appears.
  if (argv.some((arg) => arg === "--version")) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  // 4. Reject a bad global-flag value early: an unknown `--format`, an
  //    unrecognized `--detail` level (which used to be dropped silently — the
  //    same defect class as a filter that evaporates), and a valued
  //    `--verbose=<x>` (the flag takes no value; accepting-and-ignoring one
  //    would be a silent no-op). `--help` does NOT bypass these: a typo'd
  //    value must exit 2 whether or not help rides along — printing help over
  //    a bad value read as success (`pragma --help --format bogus` exited 0).
  const explicitHelp = argv.some((arg) => arg === "--help");
  const jsonMode = globalFlags.format === "json";
  {
    const rawFormat = readRawFormat(argv);
    if (
      rawFormat !== undefined &&
      !["plain", "llm", "json"].includes(rawFormat)
    ) {
      await rejectGlobalValue(
        "format",
        rawFormat,
        ["plain", "llm", "json"],
        jsonMode,
      );
      return;
    }
    const rawDetail = readRawDetail(argv);
    if (
      rawDetail !== undefined &&
      !(DETAIL_LEVELS as readonly string[]).includes(rawDetail)
    ) {
      await rejectGlobalValue(
        "detail",
        rawDetail,
        [...DETAIL_LEVELS],
        jsonMode,
      );
      return;
    }
    const valuedVerbose = findValuedVerbose(argv);
    if (valuedVerbose !== undefined) {
      const { PragmaError } = await import("./kernel/error/PragmaError.js");
      await renderStartupError(
        new PragmaError({
          code: "INVALID_INPUT",
          message: `\`--verbose\` takes no value; \`${valuedVerbose}\` is not a flag of this program.`,
          recovery: { message: "Use `--verbose` on its own." },
        }),
        jsonMode,
      );
      return;
    }
  }

  // 5. Load the capability registry — the command tree's data. Commander and
  //    the program builder are NOT loaded yet: the bare-invocation branch
  //    below answers `--help` and the front door from the registry alone, so
  //    the help fast path never pays for the parser it will not run.
  const { capabilities } = await import("./capabilities/index.js");
  const args = stripGlobalFlags(argv);

  // 6. A bare invocation (no command token — argv empty or only global flags)
  //    prints the curated front door instead of exiting silently. Uses the
  //    static capabilities — the front door never reads config or stories.
  if (!args.some((arg) => !arg.startsWith("-"))) {
    // `args` is argv with the global flags already stripped, so a token still
    // starting with `-` here is a flag this program does not have — EXCEPT the
    // two the front door itself answers, which reach this branch by design.
    // Commander rejects unknown flags below the root; without this the ROOT
    // answered a typo with the front door and exit 0, so `pragma --detial
    // standard` read as success.
    const unknownFlag = args.find(
      (arg) => arg.startsWith("-") && !ROOT_FLAGS.has(arg),
    );
    if (unknownFlag !== undefined) {
      const [
        { PragmaError },
        { renderErrorPlain, renderErrorJson },
        { mapExitCode },
      ] = await Promise.all([
        import("./kernel/error/PragmaError.js"),
        import("./kernel/error/renderError.js"),
        import("./kernel/project/cli/exitCodes.js"),
      ]);
      const error = new PragmaError({
        code: "INVALID_INPUT",
        message: `Unknown option "${unknownFlag}".`,
        recovery: {
          message: "Run with `--help` to see the available options.",
        },
      });
      process.stderr.write(
        `${
          globalFlags.format === "json"
            ? renderErrorJson(error)
            : renderErrorPlain(error)
        }\n`,
      );
      process.exitCode = mapExitCode(error.code);
      return;
    }

    const { formatRootHelp } = await import("./kernel/project/cli/rootHelp.js");
    const live = capabilities
      .flatMap((module) => [...module.verbs])
      .filter((verb) => !verb.hidden);
    process.stdout.write(
      `${formatRootHelp(
        BIN_NAME,
        PROGRAM_DESCRIPTION,
        live,
        VERSION,
        ISSUES_URL,
        globalFlags,
      )}\n`,
    );
    // The front door is a read, so it is where the un-set-up hint belongs: the
    // machine's state is the presence of the global config, and nothing is
    // written to discover it.
    const { setupHintLines } = await import("./kernel/config/firstRun.js");
    const hint = setupHintLines();
    if (hint.length > 0) process.stderr.write(`\n${hint.join("\n")}\n`);
    return;
  }

  // A command token merges the package- and config-declared story packs into
  // the tree — even under `--help`, because a config story can declare a NEW
  // noun and the guard below must not report a legitimate story noun as
  // unknown. Bare `--help` never reaches here (the front-door branch above
  // answered it from the static registry), so the help budget and the golden
  // hold. An invalid CONFIG story surfaces as a rendered error; a package
  // story that cannot be used is named on stderr and the command carries on
  // (it is third-party data, and failing here would take `sources update` and
  // `doctor` — the only recoveries — down with it).
  let modules = capabilities;
  try {
    const { loadEffectiveModules } = await import("./kernel/packs/collect.js");
    const effective = await loadEffectiveModules(capabilities, process.cwd());
    modules = effective.modules;
    if (globalFlags.quiet !== true) {
      for (const problem of effective.problems) {
        process.stderr.write(
          `Ignored story ${problem.source}: ${problem.message}\n`,
        );
      }
    }
  } catch (error) {
    // A real command must surface a broken config; help must keep helping —
    // under `--help` fall back to the static registry instead of erroring.
    if (!explicitHelp) {
      await renderStartupError(error, globalFlags.format === "json");
      return;
    }
  }
  const verbs = modules.flatMap((module) => [...module.verbs]);

  // 6b. `--help` riding an unknown command must not read as success.
  // Commander answers `--help` BEFORE it rejects an unknown operand
  // (`_outputHelpIfRequested` runs ahead of `unknownCommand()`), so
  // `pragma changelog --help` printed root help and exited 0 — a typo
  // reporting success. Resolve the command tokens against the effective
  // grammar FIRST and route a miss through the same suggester + exit 2 the
  // flagless typo gets. Commander's own `help` command is real but not a
  // grammar noun, so it stays with Commander.
  if (explicitHelp) {
    const positionals = args.filter((arg) => !arg.startsWith("-"));
    if (positionals[0] !== "help") {
      const { nounVerbMap, resolveUnknownCommand } = await import(
        "./kernel/project/cli/suggest.js"
      );
      const unknown = resolveUnknownCommand(positionals, nounVerbMap(verbs));
      if (unknown) {
        await renderUnknownCommand(unknown, globalFlags.format);
        return;
      }
    }
  }

  // Module-owned noun mounts (CapabilityModule.cliProjection), keyed by the
  // module's noun. A module's verbs all share their noun, so the module name
  // is that noun for every module that declares a mount.
  const mounts = new Map(
    modules.flatMap((module) =>
      module.cliProjection
        ? [[module.name, module.cliProjection] as const]
        : [],
    ),
  );

  // A mount may defer its registration machinery behind `prepare()` (the
  // fast paths import the projection hook without ever mounting) — resolve
  // every deferred import before the tree is built, alongside the program
  // builder's own deferred load.
  const [{ buildProgram }] = await Promise.all([
    import("./kernel/project/cli/buildProgram.js"),
    ...[...mounts.values()].map((projection) => projection.prepare?.()),
  ]);
  const program = buildProgram(verbs, {
    globalFlags,
    programName: BIN_NAME,
    description: PROGRAM_DESCRIPTION,
    version: VERSION,
    mounts,
  });
  // Silence Commander's default stderr writer on EVERY command, not just the
  // root — otherwise a bad subcommand/option prints Commander's raw `error: …`
  // line alongside (and duplicating) the designed diagnostic.
  silenceCommanderErrors(program);

  try {
    await program.parseAsync(args, { from: "user" });
  } catch (error) {
    await handleProgramError(error, argv, globalFlags.format, verbs);
  }
}

/**
 * Reject an invalid global-flag value before dispatch: one renderer for the
 * `--format`/`--detail` guards, so every validated global value flag fails
 * with the same invalid-input shape and its valid list.
 */
async function rejectGlobalValue(
  name: string,
  value: string,
  validOptions: readonly string[],
  jsonMode: boolean,
): Promise<void> {
  const { PragmaError } = await import("./kernel/error/PragmaError.js");
  await renderStartupError(
    PragmaError.invalidInput(name, value, {
      validOptions: [...validOptions],
    }),
    jsonMode,
  );
}

/**
 * Render a startup error (e.g. an invalid config story pack) before the command
 * tree is built, mapping it to stderr + an exit code — the same envelope
 * dispatch uses, so a bad `stories` entry surfaces identically to a run error.
 */
async function renderStartupError(
  error: unknown,
  jsonMode: boolean,
): Promise<void> {
  const [
    { PragmaError },
    { renderErrorPlain, renderErrorJson },
    { mapExitCode },
  ] = await Promise.all([
    import("./kernel/error/PragmaError.js"),
    import("./kernel/error/renderError.js"),
    import("./kernel/project/cli/exitCodes.js"),
  ]);
  const pragmaError =
    error instanceof PragmaError
      ? error
      : PragmaError.internalError(
          error instanceof Error ? error.message : String(error),
        );
  process.stderr.write(
    `${jsonMode ? renderErrorJson(pragmaError) : renderErrorPlain(pragmaError)}\n`,
  );
  process.exitCode = mapExitCode(pragmaError.code);
}

/**
 * Render the designed unknown-command error — curated or fuzzy suggestions,
 * the shared `Error:` + "Did you mean?" shape — and set exit code 2. One
 * renderer for BOTH routes to an unknown command (the pre-parse `--help`
 * guard and Commander's `unknownCommand` throw), so a typo reads identically
 * with or without `--help` riding along.
 */
async function renderUnknownCommand(
  unknown: import("./kernel/project/cli/suggest.js").UnknownCommand,
  format: import("./constants.js").OutputFormat,
): Promise<void> {
  const [
    { curatedSuggestions },
    { PragmaError },
    { renderErrorForFormat, renderErrorPlain },
    { suggestNames },
  ] = await Promise.all([
    import("./kernel/project/cli/suggest.js"),
    import("./kernel/error/PragmaError.js"),
    import("./kernel/error/renderError.js"),
    import("./kernel/project/cli/suggestNames.js"),
  ]);
  const curated = curatedSuggestions(unknown.token);
  const suggestions = curated
    ? [...curated]
    : suggestNames(unknown.token, [...unknown.candidates]);
  const unknownError = PragmaError.unknownVerb(unknown.token, { suggestions });
  process.stderr.write(
    `${renderErrorForFormat(unknownError, format) ?? renderErrorPlain(unknownError)}\n`,
  );
  process.exitCode = 2;
}

/** Silence Commander's built-in stderr writer on a command and all descendants. */
function silenceCommanderErrors(command: Command): void {
  command.configureOutput({ writeErr: () => {} });
  for (const child of command.commands) silenceCommanderErrors(child);
}

/**
 * Map a thrown parse error onto stderr + an exit code. Verb run errors are
 * handled inside dispatch; this catches Commander parse failures.
 */
async function handleProgramError(
  error: unknown,
  argv: readonly string[],
  format: import("./constants.js").OutputFormat,
  verbs: import("./kernel/spec/types.js").VerbSpec[],
): Promise<void> {
  const { CommanderError } = await import("commander");

  if (error instanceof CommanderError) {
    if (
      error.code === "commander.helpDisplayed" ||
      error.code === "commander.version"
    ) {
      process.exitCode = 0;
      return;
    }
    if (error.code === "commander.help") {
      // Respect the help error's OWN exit code: `help({ error: true })` — a
      // bare namespace with children, help written to stderr — carries 1;
      // a stdout help carries 0.
      process.exitCode = error.exitCode;
      return;
    }

    // A parse failure whose argv still speaks a retired module grammar gets
    // that module's designed migration error (the module authors the text;
    // the kernel only routes). Currently: `create component --framework`
    // (R1) — scoped to the ONE command that ever had the flag, so
    // `create package --framework …` keeps its honest unknown-option error
    // instead of a migration message about a grammar it never spoke — and
    // scoped to the pre-terminator span: after `--` the spelling is an
    // operand, not the retired flag, so the real parse error stands.
    const { selectScanSpan, stripGlobalFlags } = await import(
      "./kernel/project/cli/globalFlags.js"
    );
    const strippedArgs = stripGlobalFlags(argv);
    const strippedPositionals = strippedArgs.filter(
      (arg) => !arg.startsWith("-"),
    );
    if (
      strippedPositionals[0] === "create" &&
      strippedPositionals[1] === "component" &&
      selectScanSpan(strippedArgs).some(
        (arg) => arg === "--framework" || arg.startsWith("--framework="),
      )
    ) {
      const [
        { FRAMEWORK_FLAG_ERROR },
        { PragmaError },
        { renderErrorForFormat },
      ] = await Promise.all([
        import("./capabilities/create/messages.js"),
        import("./kernel/error/PragmaError.js"),
        import("./kernel/error/renderError.js"),
      ]);
      // Explicit --format json/llm envelope (the kernel's one gate+renderer
      // decision); plain keeps the designed raw line.
      const rendered = renderErrorForFormat(
        new PragmaError({
          code: "INVALID_INPUT",
          message: FRAMEWORK_FLAG_ERROR.replace(/^error:\s*/i, ""),
        }),
        format,
      );
      process.stderr.write(`${rendered ?? FRAMEWORK_FLAG_ERROR}\n`);
      process.exitCode = 2;
      return;
    }
    if (error.code === "commander.unknownCommand") {
      const { nounVerbMap, resolveUnknownCommand } = await import(
        "./kernel/project/cli/suggest.js"
      );
      // Route through the same PragmaError + renderers as every other error,
      // so the plain path gets the `Error:` prefix and the shared "Did you
      // mean?" list instead of a second, inline rendering — and an explicit
      // machine format gets the same envelope every other usage error
      // emits (the kernel's one gate+renderer decision; plain and json
      // bytes unchanged by construction).
      const unknown = resolveUnknownCommand(
        strippedPositionals,
        nounVerbMap(verbs),
      );
      if (unknown) await renderUnknownCommand(unknown, format);
      process.exitCode = 2;
      return;
    }

    // Other usage errors (missing argument, unknown option, bad choice). Under
    // an explicit --format json/llm these route through the same error
    // envelope agents parse (the kernel's one gate+renderer decision — the
    // llm half used to split this one taxonomy class: an excess positional
    // enveloped while an unknown option stayed raw prose).
    const [{ PragmaError }, { renderErrorForFormat }] = await Promise.all([
      import("./kernel/error/PragmaError.js"),
      import("./kernel/error/renderError.js"),
    ]);
    const rendered = renderErrorForFormat(
      new PragmaError({
        code: "INVALID_INPUT",
        message: error.message.replace(/^error:\s*/i, ""),
      }),
      format,
    );
    process.stderr.write(`${rendered ?? error.message}\n`);
    process.exitCode = 2;
    return;
  }

  const [
    { PragmaError },
    { renderErrorPlain, renderErrorJson },
    { mapExitCode },
  ] = await Promise.all([
    import("./kernel/error/PragmaError.js"),
    import("./kernel/error/renderError.js"),
    import("./kernel/project/cli/exitCodes.js"),
  ]);
  const pragmaError =
    error instanceof PragmaError
      ? error
      : PragmaError.internalError(
          error instanceof Error ? error.message : String(error),
        );
  process.stderr.write(
    `${format === "json" ? renderErrorJson(pragmaError) : renderErrorPlain(pragmaError)}\n`,
  );
  process.exitCode = mapExitCode(pragmaError.code);
}

await main();
