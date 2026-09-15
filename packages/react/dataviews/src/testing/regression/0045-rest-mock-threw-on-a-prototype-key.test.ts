/**
 * Regression: the REST mock endpoint refuses a parameter named after an
 * object's own machinery, as it refuses any other it cannot run.
 *
 * Before the fix, the endpoint looked a status key and a text field up in plain
 * object tables, so a key naming a prototype member found that member:
 * `toString=failed` passed the status check and threw pushing onto a function,
 * `toString__contains=x` threw calling `find` on one, and
 * `hasOwnProperty=failed` was refused as a status it never named. The tables
 * are now read by their own keys alone, so each is refused as an unknown
 * parameter.
 */

import { describe, expect, it } from "vitest";
import { readRestQuery } from "../../storybook/machines/api/index.js";

describe("regression 0045 — REST mock threw on a prototype key", () => {
  it.each([
    ["toString=failed", "toString"],
    ["hasOwnProperty=failed", "hasOwnProperty"],
    ["toString__contains=web", "toString__contains"],
    ["constructor__startsWith=web", "constructor__startsWith"],
  ])("refuses %s as a parameter it does not accept", (query, key) => {
    expect(readRestQuery(new URLSearchParams(query))).toEqual({
      reason: `this endpoint does not accept "${key}"`,
    });
  });
});
