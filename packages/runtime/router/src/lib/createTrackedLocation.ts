import type { RouterLocationKey, TrackedLocation } from "./types.js";

/** Create a getter-based tracked location view for selective subscriptions. */
export default function createTrackedLocation<TLocation extends object>(
  location: TLocation,
  onAccess: (key: Extract<keyof TLocation, RouterLocationKey>) => void,
): TrackedLocation<TLocation> {
  const trackedLocation = {} as TrackedLocation<TLocation>;

  for (const key of Object.keys(location) as Array<
    Extract<keyof TLocation, RouterLocationKey>
  >) {
    Object.defineProperty(trackedLocation, key, {
      configurable: false,
      enumerable: true,
      get() {
        onAccess(key);
        return location[key];
      },
    });
  }

  return trackedLocation;
}
