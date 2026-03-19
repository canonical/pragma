/**
 * Check the npm registry for the latest version of @canonical/pragma.
 *
 * Uses channel → dist-tag alignment (IN.06):
 * - normal → latest
 * - experimental → experimental
 * - prerelease → next
 *
 * @note Impure — performs an HTTP fetch to the npm registry.
 * @see IN.06, IN.08 in B.11.INSTALL
 */

import type { Channel } from "../../constants.js";

const DIST_TAG_MAP: Record<Channel, string> = {
  normal: "latest",
  experimental: "experimental",
  prerelease: "next",
};

const REGISTRY_TIMEOUT_MS = 3_000;

interface RegistryCheckResult {
  readonly latest: string;
  readonly distTag: string;
}

/**
 * Query the npm registry for the latest version of a package on the
 * dist-tag corresponding to the given channel.
 *
 * Returns undefined when offline or when the registry does not respond
 * within 3 seconds (IN.08).
 */
async function checkRegistryVersion(
  packageName: string,
  channel: Channel,
): Promise<RegistryCheckResult | undefined> {
  const distTag = DIST_TAG_MAP[channel];
  const url = `https://registry.npmjs.org/${packageName}`;

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

    return { latest: version, distTag };
  } catch {
    return undefined;
  }
}

export { checkRegistryVersion, DIST_TAG_MAP, REGISTRY_TIMEOUT_MS };
export type { RegistryCheckResult };
