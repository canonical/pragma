#!/usr/bin/env node
/**
 * CLI entry point for `pragma` (v2 kernel).
 *
 * The composition root. Ordered early exits keep the hot paths minimal and
 * side-effect-free: `mcp` serves over stdio (D9); `__complete` resolves
 * completions storelessly *before* first-run so the greeting never leaks into a
 * shell buffer; `--version` prints and exits. Otherwise: parse global flags,
 * reject a bad `--format`, run first-run onboarding, then build the Commander
 * program from the capabilities and dispatch. Heavy modules are dynamic-imported
 * so `--help`/`__complete` load neither zod nor any verb run body.
 *
 * @note Impure — reads argv/env, writes stdout/stderr, sets the exit code.
 */

import type { Command } from "commander";
import { BIN_NAME, PROGRAM_DESCRIPTION, VERSION } from "./constants.js";

/**
 * The flags a bare invocation answers itself. `--version` returns earlier; the
 * help forms fall through to the front door, which IS their answer — so the
 * unknown-flag guard must not mistake them for typos.
 */
const ROOT_FLAGS = new Set(["--help", "-h", "--version", "-v"]);

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  // 1. MCP server entry (D9) — `pragma mcp` serves over stdio.
  if (argv[0] === "mcp") {
    const [{ serveMcp }, { capabilities }] = await Promise.all([
      import("./kernel/project/mcp/serve.js"),
      import("./capabilities/index.js"),
    ]);
    await serveMcp(capabilities);
    return;
  }

  // 2. Completion resolver — storeless, before first-run so no banner leaks.
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

  const { parseGlobalFlags, readRawFormat, stripGlobalFlags } = await import(
    "./kernel/project/cli/globalFlags.js"
  );
  const globalFlags = parseGlobalFlags(argv);

  // 3. `--version` is global — print and exit wherever it appears.
  if (argv.some((arg) => arg === "--version" || arg === "-v")) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  // 4. Reject an unknown `--format` early (help still prints regardless).
  const explicitHelp = argv.some((arg) => arg === "--help" || arg === "-h");
  const rawFormat = readRawFormat(argv);
  if (
    !explicitHelp &&
    rawFormat !== undefined &&
    !["plain", "llm", "json", "text"].includes(rawFormat)
  ) {
    const [
      { PragmaError },
      { renderErrorPlain, renderErrorJson },
      { mapExitCode },
    ] = await Promise.all([
      import("./kernel/error/PragmaError.js"),
      import("./kernel/error/renderError.js"),
      import("./kernel/project/cli/exitCodes.js"),
    ]);
    const error = PragmaError.invalidInput("format", rawFormat, {
      validOptions: ["plain", "llm", "json"],
    });
    const rendered =
      globalFlags.format === "json"
        ? renderErrorJson(error)
        : renderErrorPlain(error);
    process.stderr.write(`${rendered}\n`);
    process.exitCode = mapExitCode(error.code);
    return;
  }

  // 5. First-run onboarding (stderr-only, failure-tolerant). Skipped on the
  //    side-effect-free help path — `--help` here; `mcp`, `__complete`, and
  //    `--version` already returned above — so help never seeds state.
  if (!explicitHelp) {
    const { ensureFirstRun } = await import("./kernel/config/firstRun.js");
    await ensureFirstRun();
  }

  // 6. Build the command tree.
  const [{ buildProgram }, { capabilities }] = await Promise.all([
    import("./kernel/project/cli/buildProgram.js"),
    import("./capabilities/index.js"),
  ]);
  const args = stripGlobalFlags(argv);

  // 7. A bare invocation (no command token — argv empty or only global flags)
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
      `${formatRootHelp(BIN_NAME, PROGRAM_DESCRIPTION, live)}\n`,
    );
    return;
  }

  // A real command merges the package- and config-declared story packs into the
  // tree (DISPATCH only); `--help` stays on the static, storeless capabilities
  // so its budget and the golden hold. An invalid CONFIG story surfaces as a
  // rendered error; a package story that cannot be used is named on stderr and
  // the command carries on (it is third-party data, and failing here would take
  // `sources update` and `doctor` — the only recoveries — down with it).
  let modules = capabilities;
  if (!explicitHelp) {
    try {
      const { loadEffectiveModules } = await import(
        "./kernel/packs/collect.js"
      );
      const effective = await loadEffectiveModules(capabilities, process.cwd());
      modules = effective.modules;
      for (const problem of effective.problems) {
        process.stderr.write(
          `Ignored story ${problem.source}: ${problem.message}\n`,
        );
      }
    } catch (error) {
      await renderStartupError(error, globalFlags.format === "json");
      return;
    }
  }
  const verbs = modules.flatMap((module) => [...module.verbs]);

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
    // instead of a migration message about a grammar it never spoke.
    const { stripGlobalFlags } = await import(
      "./kernel/project/cli/globalFlags.js"
    );
    const strippedArgs = stripGlobalFlags(argv);
    const strippedPositionals = strippedArgs.filter(
      (arg) => !arg.startsWith("-"),
    );
    if (
      strippedPositionals[0] === "create" &&
      strippedPositionals[1] === "component" &&
      strippedArgs.some(
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
      const { stripGlobalFlags } = await import(
        "./kernel/project/cli/globalFlags.js"
      );
      const positionals = stripGlobalFlags(argv).filter(
        (arg) => !arg.startsWith("-"),
      );
      const unknown = resolveUnknownCommand(positionals, nounVerbMap(verbs));
      if (unknown) {
        // Route through the same PragmaError + renderers as every other error,
        // so the plain path gets the `Error:` prefix and the shared "Did you
        // mean?" list instead of a second, inline rendering — and an explicit
        // machine format gets the same envelope every other usage error
        // emits (the kernel's one gate+renderer decision; plain and json
        // bytes unchanged by construction).
        const [
          { PragmaError },
          { renderErrorForFormat, renderErrorPlain },
          { suggestNames },
        ] = await Promise.all([
          import("./kernel/error/PragmaError.js"),
          import("./kernel/error/renderError.js"),
          import("./kernel/project/cli/suggestNames.js"),
        ]);
        const suggestions = suggestNames(unknown.token, [
          ...unknown.candidates,
        ]);
        const unknownError = PragmaError.unknownVerb(unknown.token, {
          suggestions,
        });
        process.stderr.write(
          `${renderErrorForFormat(unknownError, format) ?? renderErrorPlain(unknownError)}\n`,
        );
      }
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
