import { onTestFinished, vi } from "vitest";

/**
 * Silence the error React reports to the console before rethrowing a render's
 * throw, for the length of one test: a test that asserts the throw wants the
 * throw, not the report of it.
 *
 * @note Impure: replaces `console.error` until the test finishes.
 */
export default function silenceRenderErrors(): void {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  onTestFinished(() => {
    errors.mockRestore();
  });
}
