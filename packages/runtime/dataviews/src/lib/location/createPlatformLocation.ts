import type { Location } from "./types.js";

/**
 * The minimal platform surface a Location adapter composes — satisfied
 * structurally by @canonical/router-core's `PlatformAdapter` without a
 * dependency edge. Only the read/write/subscribe seam: platform navigation
 * state payloads are not part of the port.
 */
export type PlatformLocation = {
  readonly getLocation: () => string | URL;
  readonly navigate: (
    url: string,
    options?: { readonly replace?: boolean },
  ) => void;
  readonly subscribe: (
    listener: (location: string | URL) => void,
  ) => () => void;
};

const resolve = (input: string | URL): URL => {
  if (input instanceof URL) {
    return new URL(input.href);
  }
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return new URL(input);
  }
  return new URL(input, "http://localhost/");
};

/**
 * Create a Location over a host platform surface (for example a router's
 * platform adapter). Reads parse the raw href — repeated parameters survive
 * — and writes navigate the raw href, so the host's own subscription loop
 * picks the change up like any other navigation.
 */
export default function createPlatformLocation(
  platform: PlatformLocation,
): Location {
  return {
    read(): URLSearchParams {
      return new URLSearchParams(resolve(platform.getLocation()).search);
    },
    write(
      next: URLSearchParams,
      options?: { readonly history?: "push" | "replace" },
    ): void {
      const current = resolve(platform.getLocation());
      const search = next.toString();
      const href = `${current.pathname}${search === "" ? "" : `?${search}`}${current.hash}`;
      platform.navigate(href, {
        // The default is replace, so continuous input does not flood
        // history; only an explicit push appends an entry.
        replace: options?.history !== "push",
      });
    },
    subscribe(listener: () => void): () => void {
      return platform.subscribe(() => {
        listener();
      });
    },
  };
}
