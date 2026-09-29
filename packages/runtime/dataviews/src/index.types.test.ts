/**
 * Compile-time contract tests for the package's public type surface.
 *
 * Runtime behavior lives in the sibling test files; this file pins the type
 * exports, including the barrel re-export. Every assertion here has been
 * mutation-tested: change the source type and the assertion fails.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { Identity } from "./index.js";
import * as dataviews from "./index.js";

describe("public surface types", () => {
  it("exports the identity functions with the declared shapes", () => {
    expectTypeOf(dataviews.createIdentity).returns.toEqualTypeOf<Identity>();
    expectTypeOf(dataviews.isIdentity).parameter(0).toEqualTypeOf<unknown>();
  });

  it("narrows unknown values to Identity", () => {
    const value: unknown = undefined;
    if (dataviews.isIdentity(value)) {
      expectTypeOf(value).toEqualTypeOf<Identity>();
    }
  });

  it("keeps Identity opaque to structural construction", () => {
    expectTypeOf<Record<string, never>>().not.toMatchTypeOf<Identity>();
    expectTypeOf<object>().not.toMatchTypeOf<Identity>();
  });
});
