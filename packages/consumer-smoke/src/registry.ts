/**
 * The single npm-registry status client for this repo.
 *
 * One `npm view <pkg> --json` answers everything the repo's tooling needs to
 * know about a package's publication state: the full list of published
 * versions, the latest version, and whether the latest version carries an npm
 * provenance attestation (OIDC trusted publishing). Both the consumer-smoke
 * guard and `scripts/publish-status.ts` consume this module — do not grow a
 * second registry client.
 *
 * Lookups are @canonical/task effects (`Exec`), so they are:
 *   - concurrent: one `parallelN` batch, not a serial await-per-package loop;
 *   - deterministic/journaled: the task tree is pure data until interpreted;
 *   - mockable: tests drive them through `dryRunWith` with a mocked Exec.
 *
 * Fail-closed error model: only a definitive registry 404 (npm E404) means
 * "never published". Every other failure (rate-limit, 5xx, network error,
 * unparseable output) is retried and then reported as `state: "unknown"` —
 * NEVER as published — so a rate-limited CI run cannot silently pass a
 * genuinely-unpublished package.
 */

import {
  type ExecResult,
  exec,
  failWith,
  flatMap,
  parallelN,
  pure,
  recover,
  retry,
  runTask,
  type Task,
} from "@canonical/task";

/** What the public registry reports for one package name. */
export type RegistryStatus =
  | {
      state: "published";
      /** Every published version. */
      versions: string[];
      /** The `latest` dist-tag (null if the registry omits it). */
      latest: string | null;
      /** True when `latest` carries an npm provenance attestation. */
      hasProvenance: boolean;
    }
  /** Definitive npm E404: the package has never been published. */
  | { state: "absent" }
  /** Could not determine (transient registry/network failure) — fail closed. */
  | { state: "unknown"; reason: string };

export interface RegistryClientOptions {
  /** Registry override; defaults to the NPM_REGISTRY_URL env var, then npm's default. */
  registryUrl?: string;
  /** Attempts per package before failing closed to "unknown" (default 3). */
  attempts?: number;
  /** Concurrent lookups per batch (default 10 — npm rate-limits aggressive CI). */
  concurrency?: number;
}

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_CONCURRENCY = 10;

/** The argv for one lookup; exported so tests can assert the exact effect. */
export function npmViewArgs(name: string, registryUrl?: string): string[] {
  const registry = registryUrl ?? process.env.NPM_REGISTRY_URL;
  return [
    "view",
    name,
    "--json",
    "--prefer-online",
    ...(registry ? [`--registry=${registry}`] : []),
  ];
}

/**
 * Classify a finished `npm view <pkg> --json` invocation. Pure — unit-tested
 * directly. `"unknown"` here means "transient"; callers retry before
 * accepting it.
 */
export function classifyNpmView(result: ExecResult): RegistryStatus {
  if (result.exitCode === 0) {
    try {
      const data = JSON.parse(result.stdout.trim()) as {
        versions?: string[] | string;
        version?: string;
        "dist-tags"?: Record<string, string>;
        dist?: { attestations?: { provenance?: unknown } };
      };
      // npm --json collapses single-element arrays to a bare string.
      const versions =
        typeof data.versions === "string"
          ? [data.versions]
          : (data.versions ?? []);
      return {
        state: "published",
        versions,
        latest: data["dist-tags"]?.latest ?? data.version ?? null,
        hasProvenance: Boolean(data.dist?.attestations?.provenance),
      };
    } catch (cause) {
      return {
        state: "unknown",
        reason: `unparseable npm view output (${cause})`,
      };
    }
  }
  // With --json, npm reports errors as {"error":{"code":"E404",...}} on
  // stdout and "npm error code E404" on stderr; accept either stream.
  if (/E404|404 Not Found/.test(result.stdout + result.stderr)) {
    return { state: "absent" };
  }
  const firstErrorLine =
    result.stderr.split("\n").find((line) => line.trim().length > 0) ??
    `exit code ${result.exitCode}`;
  return { state: "unknown", reason: firstErrorLine.trim() };
}

/**
 * Registry status for one package as a task. Transient failures are retried
 * (`attempts` total), then recovered into `state: "unknown"` — fail closed,
 * never "published".
 */
export function registryStatusTask(
  name: string,
  options: RegistryClientOptions = {},
): Task<RegistryStatus> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  // Built with flatMap (stateless continuation), NOT gen: gen-tasks share a
  // single generator iterator and are one-shot, but `retry` re-drives the
  // same task value on each attempt.
  const oneAttempt: Task<RegistryStatus> = flatMap(
    exec("npm", npmViewArgs(name, options.registryUrl)),
    (result) => {
      const status = classifyNpmView(result);
      return status.state === "unknown"
        ? failWith<RegistryStatus>(
            "REGISTRY_UNAVAILABLE",
            `${name}: ${status.reason}`,
          )
        : pure(status);
    },
  );
  return recover(retry(oneAttempt, attempts), (error) =>
    pure<RegistryStatus>({
      state: "unknown",
      reason: `${error.message} (after ${attempts} attempts)`,
    }),
  );
}

/**
 * Registry statuses for a set of package names in ONE parallel batch.
 * Names are deduplicated and sorted first (the batch is the registry cache,
 * keyed by package name: each unique name is looked up exactly once), so the
 * task tree — and therefore its effect journal — is deterministic for a
 * given input set.
 */
export function registryStatusesTask(
  names: Iterable<string>,
  options: RegistryClientOptions = {},
): Task<Map<string, RegistryStatus>> {
  const unique = [...new Set(names)].sort();
  return flatMap(
    parallelN(
      options.concurrency ?? DEFAULT_CONCURRENCY,
      unique.map((name) => registryStatusTask(name, options)),
    ),
    (statuses) =>
      pure(new Map(unique.map((name, index) => [name, statuses[index]]))),
  );
}

/** Convenience runner so plain scripts don't need to import @canonical/task. */
export async function fetchRegistryStatuses(
  names: Iterable<string>,
  options: RegistryClientOptions = {},
): Promise<Map<string, RegistryStatus>> {
  return runTask(registryStatusesTask(names, options));
}
