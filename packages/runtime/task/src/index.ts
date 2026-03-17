/**
 * @canonical/task — A monadic effect framework for composable, testable,
 * dry-runnable CLI operations.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  ConfirmPrompt,
  DryRunResult,
  Effect,
  ExecResult,
  LogLevel,
  MultiselectPrompt,
  PromptQuestion,
  PromptQuestionBase,
  SelectPrompt,
  Task,
  TaskError,
  TaskEvent,
  TextPrompt,
  TraceResult,
  TraceSpan,
} from "./lib/types.js";

// =============================================================================
// Task Monad
// =============================================================================

export {
  ap,
  effect,
  fail,
  failWith,
  flatMap,
  hasEffects,
  isFailed,
  isPure,
  map,
  mapError,
  of,
  pure,
  recover,
  TaskBuilder,
  task,
} from "./lib/task.js";

// =============================================================================
// Effects
// =============================================================================

export {
  appendFileEffect,
  copyDirectoryEffect,
  copyFileEffect,
  deleteDirectoryEffect,
  deleteFileEffect,
  describeEffect,
  execEffect,
  existsEffect,
  getAffectedPaths,
  globEffect,
  isWriteEffect,
  logEffect,
  makeDirEffect,
  parallelEffect,
  promptEffect,
  raceEffect,
  readContextEffect,
  readFileEffect,
  writeContextEffect,
  writeFileEffect,
} from "./lib/effect.js";

// =============================================================================
// Primitives
// =============================================================================

export type { SortFileLinesOptions } from "./lib/primitives.js";
export {
  appendFile,
  copyDirectory,
  copyFile,
  debug,
  deleteDirectory,
  deleteFile,
  error,
  exec,
  execSimple,
  exists,
  getContext,
  glob,
  info,
  log,
  mkdir,
  noop,
  prompt,
  promptConfirm,
  promptMultiselect,
  promptSelect,
  promptText,
  readFile,
  setContext,
  sortFileLines,
  succeed,
  warn,
  withContext,
  writeFile,
} from "./lib/primitives.js";

// =============================================================================
// Combinators
// =============================================================================

export {
  attempt,
  bracket,
  delay,
  ensure,
  fold,
  ifElse,
  ifElseM,
  optional,
  orElse,
  parallel,
  parallelN,
  race,
  retry,
  retryWithBackoff,
  sequence,
  sequence_,
  tap,
  tapError,
  timeout,
  traverse,
  traverse_,
  unless,
  when,
  whenM,
  zip,
  zip3,
} from "./lib/combinators.js";

// =============================================================================
// Interpreter
// =============================================================================

export type { RunTaskOptions } from "./lib/interpreter.js";
export {
  executeEffect,
  run,
  runTask,
  TaskExecutionError,
} from "./lib/interpreter.js";

// =============================================================================
// Dry-Run
// =============================================================================

export {
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
} from "./lib/dry-run.js";
