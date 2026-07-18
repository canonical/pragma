#!/usr/bin/env bun
/**
 * CLI entry point for `pragma2` (v2 kernel).
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

import { BIN_NAME, PROGRAM_DESCRIPTION, VERSION } from "./constants.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  // 1. MCP server entry (D9) — `pragma2 mcp` serves over stdio.
  if (argv[0] === "mcp") {
    const [{ serveMcp }, { capabilities }] = await Promise.all([
      import("./kernel/project/mcp/serve.js"),
      import("./capabilities/index.js"),
    ]);
    await serveMcp(capabilities);
    return;
  }

  // 2. Completion resolver — storeless, before first-run so no banner leaks.
  if (argv[0] === "__complete") {
    const [{ runComplete }, { capabilities }] = await Promise.all([
      import("./kernel/completion/complete.js"),
      import("./capabilities/index.js"),
    ]);
    const matches = runComplete(argv.slice(1), capabilities);
    if (matches.length > 0) process.stdout.write(`${matches.join("\n")}\n`);
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
    !["plain", "json", "text"].includes(rawFormat)
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
      validOptions: ["plain", "json"],
    });
    const rendered =
      globalFlags.format === "json"
        ? renderErrorJson(error)
        : renderErrorPlain(error);
    process.stderr.write(`${rendered}\n`);
    process.exitCode = mapExitCode(error.code);
    return;
  }

  // 5. First-run onboarding (stderr-only, failure-tolerant).
  const { ensureFirstRun } = await import("./kernel/config/firstRun.js");
  await ensureFirstRun();

  // 6. Build the command tree and dispatch.
  const [{ buildProgram }, { capabilities }] = await Promise.all([
    import("./kernel/project/cli/buildProgram.js"),
    import("./capabilities/index.js"),
  ]);
  const verbs = capabilities.flatMap((module) => [...module.verbs]);
  const program = buildProgram(verbs, {
    globalFlags,
    programName: BIN_NAME,
    description: PROGRAM_DESCRIPTION,
    version: VERSION,
  });
  program.configureOutput({ writeErr: () => {} });

  try {
    await program.parseAsync(stripGlobalFlags(argv), { from: "user" });
  } catch (error) {
    await handleProgramError(error, argv, globalFlags.format === "json", verbs);
  }
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
      const { nounVerbMap, resolveUnknownCommand, suggestMessage } =
        await import("./kernel/project/cli/suggest.js");
      const { stripGlobalFlags } = await import(
        "./kernel/project/cli/globalFlags.js"
      );
      const positionals = stripGlobalFlags(argv).filter(
        (arg) => !arg.startsWith("-"),
      );
      const unknown = resolveUnknownCommand(positionals, nounVerbMap(verbs));
      if (unknown) {
        process.stderr.write(
          `${suggestMessage(unknown.token, unknown.candidates)}\n`,
        );
      }
      process.exitCode = 2;
      return;
    }
    // Other usage errors (missing argument, unknown option, bad choice).
    process.stderr.write(`${error.message}\n`);
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
