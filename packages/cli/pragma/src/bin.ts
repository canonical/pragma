#!/usr/bin/env bun
/**
 * CLI entry point for `pragma`.
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
import {
  BIN_FAST_PATH_TOKENS,
  BIN_NAME,
  PROGRAM_DESCRIPTION,
  VERSION,
} from "./constants.js";

/**
 * The three tokens answered below, destructured from the one declaration
 * `kernel/packs/collect.ts` also reserves against. Naming them here rather than
 * repeating the literals is what keeps the bin's dispatch and the pack
 * reservation from drifting apart — they drifted before, and a pack could claim
 * `mcp`.
 */
const [MCP_TOKEN, COMPLETE_TOKEN, STORE_PROBE_TOKEN] = BIN_FAST_PATH_TOKENS;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  // Read the dispatch token ONCE. `.at(0)` per cs:code.array.safe_access: the
  // three comparisons below are against a possibly-absent element (`pragma`
  // with no argument is the `--help` path), and `.at()` says so in the type.
  const token = argv.at(0);

  // 1. MCP server entry (D9) — `pragma mcp` serves over stdio.
  if (token === MCP_TOKEN) {
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
  if (token === COMPLETE_TOKEN) {
    const [{ runComplete }, { indexCompletionEnv }, { capabilities }] =
      await Promise.all([
        import("./kernel/completion/complete.js"),
        import("./kernel/completion/entitySource.js"),
        import("./capabilities/index.js"),
      ]);
    const words = argv.at(1) === "--" ? argv.slice(2) : argv.slice(1);
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
  if (token === STORE_PROBE_TOKEN) {
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

  const program = buildProgram(verbs, {
    globalFlags,
    programName: BIN_NAME,
    description: PROGRAM_DESCRIPTION,
    version: VERSION,
  });
  // Silence Commander's default stderr writer on EVERY command, not just the
  // root — otherwise a bad subcommand/option prints Commander's raw `error: …`
  // line alongside (and duplicating) the designed diagnostic.
  silenceCommanderErrors(program);

  try {
    await program.parseAsync(args, { from: "user" });
  } catch (error) {
    await handleProgramError(error, argv, globalFlags.format === "json", verbs);
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
  jsonMode: boolean,
  verbs: import("./kernel/spec/types.js").VerbSpec[],
): Promise<void> {
  const { CommanderError } = await import("commander");

  if (error instanceof CommanderError) {
    if (
      error.code === "commander.helpDisplayed" ||
      error.code === "commander.version" ||
      error.code === "commander.help"
    ) {
      process.exitCode = 0;
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
        // mean?" list instead of a second, inline rendering.
        const [
          { PragmaError },
          { renderErrorPlain, renderErrorJson },
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
          `${jsonMode ? renderErrorJson(unknownError) : renderErrorPlain(unknownError)}\n`,
        );
      }
      process.exitCode = 2;
      return;
    }

    // Other usage errors (missing argument, unknown option, bad choice). Under
    // --format json these route through the same error envelope agents parse.
    if (jsonMode) {
      const [{ PragmaError }, { renderErrorJson }] = await Promise.all([
        import("./kernel/error/PragmaError.js"),
        import("./kernel/error/renderError.js"),
      ]);
      const message = error.message.replace(/^error:\s*/i, "");
      process.stderr.write(
        `${renderErrorJson(new PragmaError({ code: "INVALID_INPUT", message }))}\n`,
      );
    } else {
      process.stderr.write(`${error.message}\n`);
    }
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
    `${jsonMode ? renderErrorJson(pragmaError) : renderErrorPlain(pragmaError)}\n`,
  );
  process.exitCode = mapExitCode(pragmaError.code);
}

await main();
