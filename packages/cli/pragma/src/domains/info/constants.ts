/**
 * Constants for the info + upgrade domain.
 *
 * @see IN.06, IN.08 in B.11.INSTALL
 */

import type { Channel } from "../../constants.js";

/**
 * Channel → npm dist-tag alignment.
 * @see IN.06
 */
const DIST_TAG_MAP: Record<Channel, string> = {
  normal: "latest",
  experimental: "experimental",
  prerelease: "next",
};

/**
 * Timeout for npm registry HTTP requests.
 * @see IN.08
 */
const REGISTRY_TIMEOUT_MS = 3_000;

export { DIST_TAG_MAP, REGISTRY_TIMEOUT_MS };
