import { PragmaError } from "#error";

/**
 * Validate the application generator's hard flag requirements up front.
 *
 * The `application/react` generator throws a plain `Error` when `ssr` or
 * `router` is false (standalone SPA mode is unsupported). Left to bubble, the
 * CLI wraps that as an `INTERNAL_ERROR` (exit 127) and MCP serializes it
 * untyped — both misclassify what is really invalid user input. Checking here
 * maps the documented requirement to a typed `INVALID_INPUT` with recovery.
 *
 * Only an explicit `false` is rejected; `undefined` leaves the generator's
 * default (`true`) in place, so interactive prompting is unaffected.
 *
 * @throws PragmaError.invalidInput when `ssr` or `router` is explicitly false.
 */
export function assertApplicationFlags(params: {
  readonly ssr?: unknown;
  readonly router?: unknown;
}): void {
  if (params.ssr === false || params.router === false) {
    const field = params.ssr === false ? "ssr" : "router";
    throw PragmaError.invalidInput(field, "false", {
      recovery: {
        message:
          "The application generator requires both SSR and router; " +
          "standalone SPA mode is not supported.",
        cli: "pragma create application my-app",
      },
    });
  }
}
