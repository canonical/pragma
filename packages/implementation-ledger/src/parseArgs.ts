/**
 * Command-line argument parsing for the implementation-ledger CLI.
 *
 * Kept free of process/console side effects so it can be unit-tested:
 * invalid invocations throw {@link UsageError}, which cli.ts turns into the
 * usage message and exit code 1.
 */

export const HELP = `
Usage: implementation-ledger collect [options]

Records what each annotated package version makes available in the
append-only ledger at <monorepo root>/data/implementation-versions.ttl.

Options:
  --package <path>   Only collect the package at <path> (e.g. "." from a
                     package's own directory)
  --ledger <path>    Ledger file path (default: <root>/data/implementation-versions.ttl)
  --dry-run          Compute and report, but do not write
  --quiet            Only print appended entries, warnings, and errors
  --tolerate-drift   Downgrade recorded-content mismatches from errors to
                     warnings (local development escape hatch; never used by
                     the repo's build or release wiring)
  --help, -h         Show this help message
`;

/** Invalid command line; the CLI prints the message plus {@link HELP} and exits 1. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

export interface CliOptions {
  help: boolean;
  packageFilter?: string;
  ledgerPath?: string;
  dryRun: boolean;
  quiet: boolean;
  tolerateDrift: boolean;
}

/**
 * Read the value of an option that requires one. Fails fast when the next
 * token is missing or is itself a flag (e.g. `--package --dry-run`), instead
 * of silently consuming the flag as the value.
 */
function optionValue(argv: string[], index: number, option: string): string {
  const value = argv[index];
  if (value === undefined || value.startsWith("-")) {
    throw new UsageError(`Missing value for ${option}`);
  }
  return value;
}

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    help: false,
    dryRun: false,
    quiet: false,
    tolerateDrift: false,
  };

  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        return options;
      case "--package":
        options.packageFilter = optionValue(argv, ++i, arg);
        break;
      case "--ledger":
        options.ledgerPath = optionValue(argv, ++i, arg);
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--quiet":
        options.quiet = true;
        break;
      case "--tolerate-drift":
        options.tolerateDrift = true;
        break;
      default:
        positional.push(arg);
    }
  }

  if (positional.length !== 1 || positional[0] !== "collect") {
    throw new UsageError(
      `Unknown command: ${positional.join(" ") || "(none)"}`,
    );
  }

  return options;
}
