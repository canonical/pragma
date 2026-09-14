/**
 * Stand-in stores for tests: the two store ports the provider takes, each
 * answering as a test says and nothing otherwise. Together because a test
 * that stands in one port usually stands in the other.
 */

import type { PresentationStore, ViewStore } from "@canonical/dataviews-core";

/** A store call a test did not expect. */
const refuse = (): Promise<never> =>
  Promise.reject(new Error("not used in this test"));

/**
 * Create a presentation store that answers as a test says: every call not
 * overridden reads nothing, saves and hears nobody.
 */
export const createStandInPresentationStore = (
  overrides: Partial<PresentationStore> = {},
): PresentationStore => ({
  readPresentation: async () => ({}),
  patchPresentation: async () => ({ status: "saved" }),
  subscribe: () => () => {},
  ...overrides,
});

/**
 * Create a view store that answers as a test says: every call not
 * overridden lists nothing, finds nothing, refuses to write and hears nobody.
 */
export const createStandInViewStore = (
  overrides: Partial<ViewStore> = {},
): ViewStore => ({
  list: async () => ({ views: [], unreadable: [] }),
  get: async () => ({ status: "missing" }),
  create: refuse,
  update: async () => ({ status: "missing" }),
  remove: async () => ({ status: "removed" }),
  pin: async () => ({ status: "saved" }),
  unpin: async () => ({ status: "saved" }),
  subscribe: () => () => {},
  dispose: () => {},
  ...overrides,
});
