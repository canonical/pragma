/**
 * Resolve the port a `serve-*` bin should listen on.
 *
 * Precedence: an explicit `--port`/`-p` flag, then the `PORT` env var, then the
 * default `5174`. A value that is *present but not a valid TCP port* (non-integer
 * or outside `1..65535`, including `"0"`) is a user error — it throws rather than
 * silently falling back to the default, so a typo'd port fails loudly instead of
 * binding the wrong one. Only an absent value falls through to the default.
 *
 * The `5174` default matches the SSR dev servers (`PORT || 5174`), so every SSR
 * target — dev and preview, Bun and Node — lands on the same port by default.
 *
 * @param flag - The `--port`/`-p` value, if supplied.
 * @param env - The `PORT` env var, if set.
 * @param fallback - Port to use when neither is supplied (default `5174`).
 * @returns The resolved port number.
 * @throws If a supplied value is not an integer in `1..65535`.
 */
export function resolvePort(
  flag: string | undefined,
  env: string | undefined,
  fallback = 5174,
): number {
  const raw = flag ?? env;
  if (raw == null || raw === "") return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(
      `Invalid port "${raw}": expected an integer between 1 and 65535.`,
    );
  }
  return parsed;
}
