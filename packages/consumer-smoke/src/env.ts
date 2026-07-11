/**
 * Environment scrubbing for child processes.
 *
 * The consumer-smoke tooling spawns a large third-party surface (npm install
 * of external dependencies, vite, tsc, publint, arethetypeswrong, node). In
 * tag.yml this runs inside the publish job, which has `id-token: write` — so
 * the runner injects ACTIONS_ID_TOKEN_REQUEST_TOKEN/URL, the credentials a
 * process can use to mint an npm OIDC trusted-publishing token. None of the
 * processes this tooling spawns need any credential, so we fail safe: every
 * spawned child gets an environment with all token/secret-shaped variables
 * removed.
 */

/** Variables that must never reach a child process spawned by this tooling. */
export const SENSITIVE_ENV_EXACT: ReadonlySet<string> = new Set([
  "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
  "ACTIONS_ID_TOKEN_REQUEST_URL",
  "ACTIONS_RUNTIME_TOKEN",
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "NPM_TOKEN",
  "NODE_AUTH_TOKEN",
  "SSH_AUTH_SOCK",
]);

/**
 * Catch-all for anything credential-shaped (npm_config__authToken,
 * *_SECRET, *_PASSWORD, …). Benign build inputs (PATH, HOME, TMPDIR, CI,
 * npm_config_cache, NPM_REGISTRY_URL, …) never match.
 */
export const SENSITIVE_ENV_PATTERN =
  /(TOKEN|SECRET|PASSWORD|CREDENTIAL|_AUTH|AUTH_)/i;

function isSensitive(key: string): boolean {
  return SENSITIVE_ENV_EXACT.has(key) || SENSITIVE_ENV_PATTERN.test(key);
}

/**
 * A copy of `process.env` with all sensitive variables removed, plus
 * `overrides`. Pass this as the full `env` of every spawned child (do not
 * spread `process.env` back in).
 */
export function scrubbedEnv(
  overrides: Record<string, string> = {},
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || isSensitive(key)) continue;
    env[key] = value;
  }
  return { ...env, ...overrides };
}

/**
 * Delete sensitive variables from `process.env` itself, so children spawned
 * by code we don't control (e.g. the @canonical/task interpreter's Exec
 * effect, which inherits the parent environment) are covered too. Returns
 * the removed keys. Call once at CLI startup.
 */
export function scrubProcessEnv(): string[] {
  const removed: string[] = [];
  for (const key of Object.keys(process.env)) {
    if (isSensitive(key)) {
      delete process.env[key];
      removed.push(key);
    }
  }
  return removed;
}
