/**
 * npm registry version check — the shared network read `info` (enrichment) and
 * `upgrade` (mutation) both consume.
 *
 * Ported verbatim from the old shell's `info/operations/checkRegistryVersion` +
 * its `DIST_TAG_MAP`/`REGISTRY_TIMEOUT_MS` constants. A single GET against the
 * registry's package document, a 3s timeout, and `undefined` on any failure
 * (offline, non-2xx, timeout, missing dist-tag) — so a caller degrades silently
 * rather than erroring. The whole request is preview-safe: it is a plain read
 * with no side effects.
 */

import type { Channel } from "../../kernel/config/types.js";

/**
 * The published package `info`/`upgrade` check for updates: the stable name
 * users installed, so the check answers "is a newer release of the tool
 * available".
 */
export const PRAGMA_PACKAGE = "@canonical/pragma-cli";

/** Maps each release channel to its corresponding npm dist-tag (internal). */
const DIST_TAG_MAP: Record<Channel, string> = {
  normal: "latest",
  experimental: "experimental",
  prerelease: "next",
};

/** Timeout in milliseconds for npm registry HTTP requests. */
export const REGISTRY_TIMEOUT_MS = 3_000;

/** Result of checking the npm registry for the latest package version. */
export interface RegistryCheckResult {
  readonly latest: string;
}

/**
 * Check the npm registry for the latest published version of a package.
 *
 * @param packageName - The npm package name (e.g. `@canonical/pragma-cli`).
 * @param channel - The release channel, selecting which dist-tag to read.
 * @returns The latest version for the channel's dist-tag, or `undefined` when
 *   offline / non-2xx / timed out / the dist-tag is absent.
 * @note Impure — a single network GET (3s timeout, silent-fail).
 */
export async function checkRegistryVersion(
  packageName: string,
  channel: Channel,
): Promise<RegistryCheckResult | undefined> {
  const distTag = DIST_TAG_MAP[channel];
  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return undefined;

    const data = (await response.json()) as {
      "dist-tags"?: Record<string, string>;
    };
    const version = data["dist-tags"]?.[distTag];
    if (!version) return undefined;

    return { latest: version };
  } catch {
    return undefined;
  }
}
