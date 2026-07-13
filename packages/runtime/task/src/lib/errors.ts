/**
 * The error thrown when an interpreter fails to execute a task.
 *
 * Defined here, apart from the interpreters, so that the node-free surface
 * (the task algebra, the dry-run/testing interpreters, `driveSync`) can throw
 * and catch it without pulling the node-touching production interpreter into
 * its import graph. It is a plain `Error` subclass — node-free by construction.
 */

import type { TaskError } from "./types.js";

/**
 * Wraps a structured {@link TaskError} as a thrown `Error`, preserving the
 * error `code`, the original structured payload (`taskError`), and the
 * originating stack when one is present.
 */
export class TaskExecutionError extends Error {
  public readonly code: string;
  public readonly taskError: TaskError;

  constructor(error: TaskError) {
    super(error.message);
    this.name = "TaskExecutionError";
    this.code = error.code;
    this.taskError = error;

    if (error.stack) {
      this.stack = error.stack;
    }
  }
}
