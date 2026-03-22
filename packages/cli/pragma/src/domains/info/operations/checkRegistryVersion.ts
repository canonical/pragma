/**
 * Check the npm registry for the latest version of a package.
 *
 * Returns undefined when offline or when the registry does not respond
 * within 3 seconds (IN.08).
 *
 * @note Impure — performs an HTTP fetch to the npm registry.
 * @see IN.06, IN.08 in B.11.INSTALL
 */

import type { Channel } from "../../../constants.js";
import { DIST_TAG_MAP, REGISTRY_TIMEOUT_MS } from "../constants.js";
import type { RegistryCheckResult } from "../types.js";

async function checkRegistryVersion(
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

    return { latest: version, distTag };
  } catch {
    return undefined;
  }
}

export default checkRegistryVersion;
