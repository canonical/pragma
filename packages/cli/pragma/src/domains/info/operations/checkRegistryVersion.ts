import type { Channel } from "#constants";
import { DIST_TAG_MAP, REGISTRY_TIMEOUT_MS } from "../constants.js";
import type { RegistryCheckResult } from "../types.js";

/**
 * Checks the npm registry for the latest published version of a package.
 *
 * Returns `undefined` when offline or when the registry does not respond
 * within the configured timeout ({@link REGISTRY_TIMEOUT_MS}).
 *
 * @note Impure
 *
 * @param packageName - The npm package name (e.g. `@canonical/pragma-cli`).
 * @param channel - The release channel determining which dist-tag to check.
 * @returns A {@link RegistryCheckResult} with the latest version, or `undefined` on failure.
 */
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
