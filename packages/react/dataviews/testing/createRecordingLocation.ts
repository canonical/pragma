import {
  createMemoryLocation,
  type MemoryLocationConfig,
  type QueryLocation,
} from "@canonical/dataviews-core";
import type { RecordingLocation } from "./types.js";

/**
 * Create a location port that records what passes through it: every write
 * with the history mode it was asked for, and every notification its
 * subscribers received. Backed by a memory location, so it behaves as that
 * port does; what it adds is the record a test asserts against — "a
 * keystroke replaced, a page move pushed" is read off the port's own calls,
 * never off a browser. `move` moves the location from outside, as Back
 * would.
 *
 * @note Impure by design: it records every write and every notification
 * into the lists it hands back for a test to read.
 */
export default function createRecordingLocation(
  config: MemoryLocationConfig = {},
): RecordingLocation {
  const memory = createMemoryLocation(config);
  const writes: RecordingLocation["writes"] = [];
  const notifications: string[] = [];
  const location: QueryLocation = {
    read: memory.read,
    write(next, options) {
      writes.push([next.toString(), options?.history ?? null]);
      memory.write(next, options);
    },
    subscribe(listener) {
      return memory.subscribe(() => {
        notifications.push(memory.read().toString());
        listener();
      });
    },
  };
  return {
    location,
    writes,
    notifications,
    move(params: string): void {
      memory.write(new URLSearchParams(params));
    },
  };
}
