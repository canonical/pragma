import type { Channel } from "../../constants.js";

/**
 * Maps each release {@link Channel} to its corresponding npm dist-tag.
 */
const DIST_TAG_MAP: Record<Channel, string> = {
  normal: "latest",
  experimental: "experimental",
  prerelease: "next",
};

/** Timeout in milliseconds for npm registry HTTP requests. */
const REGISTRY_TIMEOUT_MS = 3_000;

export { DIST_TAG_MAP, REGISTRY_TIMEOUT_MS };
