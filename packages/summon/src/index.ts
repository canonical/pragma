/**
 * Summon - A Monadic Task-Centric Code Generator Framework
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  // Generator types
  AnyGenerator,
  ConfirmPrompt,
  // Result types
  DryRunResult,
  Effect,
  ExecResult,
  GeneratorDefinition,
  GeneratorMeta,
  LogLevel,
  MultiselectPrompt,
  PromptDefinition,
  // Prompt types
  PromptQuestion,
  PromptQuestionBase,
  SelectPrompt,
  // Task and Effect types
  Task,
  TaskError,
  // Event types
  TaskEvent,
  TextPrompt,
  TraceResult,
  TraceSpan,
} from "./types.js";

// =============================================================================
// Task Monad
// =============================================================================

export {
  ap,
  effect,
  fail,
  failWith,
  // Monad operations
  flatMap,
  hasEffects,
  isFailed,
  // Utilities
  isPure,
  map,
  mapError,
  of,
  // Core constructors
  pure,
  recover,
  // Fluent builder
  TaskBuilder,
  task,
} from "./task.js";

// =============================================================================
// Effects
// =============================================================================

export {
  // File system effects
  appendFileEffect,
  copyDirectoryEffect,
  copyFileEffect,
  deleteDirectoryEffect,
  deleteFileEffect,
  // Utilities
  describeEffect,
  // Process effects
  execEffect,
  existsEffect,
  getAffectedPaths,
  globEffect,
  isWriteEffect,
  // Logging effects
  logEffect,
  makeDirEffect,
  // Concurrency effects
  parallelEffect,
  // Prompt effects
  promptEffect,
  raceEffect,
  // Context effects
  readContextEffect,
  readFileEffect,
  writeContextEffect,
  writeFileEffect,
} from "./effect.js";

// =============================================================================
// Primitives
// =============================================================================

export type { SortFileLinesOptions } from "./primitives.js";
export {
  // File system primitives
  appendFile,
  copyDirectory,
  copyFile,
  debug,
  deleteDirectory,
  deleteFile,
  error,
  // Process primitives
  exec,
  execSimple,
  exists,
  // Context primitives
  getContext,
  glob,
  info,
  // Logging primitives
  log,
  mkdir,
  // Pure primitives
  noop,
  // Prompt primitives
  prompt,
  promptConfirm,
  promptMultiselect,
  promptSelect,
  promptText,
  readFile,
  setContext,
  // File transformation primitives
  sortFileLines,
  succeed,
  warn,
  withContext,
  writeFile,
} from "./primitives.js";

// =============================================================================
// Combinators
// =============================================================================

export {
  attempt,
  // Resource management
  bracket,
  delay,
  ensure,
  fold,
  ifElse,
  ifElseM,
  optional,
  orElse,
  // Parallelism
  parallel,
  parallelN,
  race,
  // Error handling
  retry,
  retryWithBackoff,
  // Sequencing
  sequence,
  sequence_,
  // Utilities
  tap,
  tapError,
  timeout,
  traverse,
  traverse_,
  unless,
  // Conditionals
  when,
  whenM,
  zip,
  zip3,
} from "./combinators.js";

// =============================================================================
// Interpreter
// =============================================================================

export type { RunTaskOptions, StampConfig } from "./interpreter.js";
export {
  executeEffect,
  run,
  runTask,
  TaskExecutionError,
} from "./interpreter.js";

// =============================================================================
// Dry-Run
// =============================================================================

export {
  // Test utilities
  assertEffects,
  assertFileWrites,
  collectEffects,
  countEffects,
  dryRun,
  dryRunWith,
  expectTask,
  filterEffects,
  getAffectedFiles,
  getFileWrites,
  mockEffect,
} from "./dry-run.js";

// =============================================================================
// Templates
// =============================================================================

export type {
  StampOptions,
  TemplateDirOptions,
  TemplateOptions,
} from "./template.js";
export {
  // Stamp utilities
  generateStamp,
  // Metadata
  generatorComment,
  generatorHtmlComment,
  prependStamp,
  renderFile,
  // Template rendering
  renderString,
  renderStringAsync,
  // Template tasks
  template,
  templateDir,
  // Helpers
  templateHelpers,
  withHelpers,
} from "./template.js";

// =============================================================================
// Components (for custom CLI implementations)
// =============================================================================

export type {
  AppProps,
  AppState,
  ExecutionProgressProps,
  FileTreePreviewProps,
  PromptSequenceProps,
  SpinnerProps,
} from "./components/index.js";
export {
  App,
  ExecutionProgress,
  FileTreePreview,
  PromptSequence,
  Spinner,
} from "./components/index.js";

// =============================================================================
// CLI Types (for generator authors)
// =============================================================================

export type { ForbidReserved, ReservedOption } from "./cli-types.js";
