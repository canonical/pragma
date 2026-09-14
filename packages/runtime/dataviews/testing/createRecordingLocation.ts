import { vi } from "vitest";
import {
  createMemoryLocation,
  type MemoryLocationConfig,
  type QueryLocation,
} from "../src/lib/location/index.js";
import type { RecordingLocation } from "./types.js";

/**
 * Create a location port that records what passes through it: every write
 * with the history mode it was asked for, and every notification its
 * subscribers received. Backed by a memory location, so it behaves as that
 * port does; what it adds is the record a test asserts against — "a
 * search replaced, a sort pushed, Back adopted and nothing was written
 * back" is read off the port's own calls, never off a browser.
 *
 * Its reads and subscriptions are spies, for a test that asserts "read once,
 * subscribed to never".
 *
 * @note Impure by design: it records every write, and the core's every
 * notification, into the lists it hands back for a test to read.
 */
export default function createRecordingLocation(
  config: MemoryLocationConfig = {},
): RecordingLocation {
  const memory = createMemoryLocation(config);
  const writes: RecordingLocation["writes"] = [];
  const notifications: string[] = [];
  const read = vi.fn(() => memory.read());
  const subscribe = vi.fn((listener: () => void) =>
    memory.subscribe(() => {
      notifications.push(memory.read().toString());
      listener();
    }),
  );
  const location: QueryLocation = {
    read,
    write(next, options) {
      writes.push([next.toString(), options?.history ?? null]);
      memory.write(next, options);
    },
    subscribe,
  };
  return {
    location,
    writes,
    notifications,
    spies: { read, subscribe },
    /** Move the location from outside, as Back, Forward or a pasted URL would. */
    move(params: string): void {
      memory.write(new URLSearchParams(params));
    },
  };
}
