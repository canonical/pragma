/**
 * Constants for the info + upgrade domain.
 */

import type { Channel } from "../../constants.js";

/**
 * Channel → npm dist-tag alignment.
 */
const DIST_TAG_MAP: Record<Channel, string> = {
  normal: "latest",
  experimental: "experimental",
  prerelease: "next",
};

/**
 * Timeout for npm registry HTTP requests.
 */
const REGISTRY_TIMEOUT_MS = 3_000;

export { DIST_TAG_MAP, REGISTRY_TIMEOUT_MS };
