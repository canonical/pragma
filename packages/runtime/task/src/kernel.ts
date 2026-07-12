/**
 * @canonical/task/kernel — the node-free entry point.
 *
 * Re-exports exactly the modules with no `node:` reach (types, the task
 * monad, effect constructors, primitives, combinators), and none of the
 * execution machinery (`interpreter`, `dry-run`, `undo-interpreter`,
 * `driveSync`), whose static `node:fs/promises` / `node:path` imports make
 * the root barrel unbundlable for browser targets (`platform: "browser"`
 * resolvers reject `node:` specifiers before tree-shaking can drop them).
 * Browser and bundler consumers import this entry; Node consumers keep the
 * root barrel. The node-freeness of this entry's import closure is asserted
 * by `kernel.node-free.test.ts`.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  BaseErrorCode,
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

export type { TaskGen } from "./lib/task.js";
export {
  $,
  ap,
  effect,
  fail,
  failWith,
  flatMap,
  gen,
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
  symlinkEffect,
  transformFileEffect,
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
  symlink,
  transformFile,
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
  switchMap,
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
// Undo Options (a type on the effect module, not the undo interpreter)
// =============================================================================

export type { UndoOptions } from "./lib/effect.js";
