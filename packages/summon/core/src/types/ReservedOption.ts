/**
 * Reserved option names for CLI global options.
 * Generator prompts MUST NOT use these names.
 */
type ReservedOption =
  | "help"
  | "version"
  | "dryRun"
  | "dry-run"
  | "yes"
  | "output"
  | "preview"
  | "generators"
  | "run"
  | "init"
  | "llm"
  | "format"
  | "showFiles"
  | "show-files"
  | "verbose"
  | "generatedStamp";

export default ReservedOption;
