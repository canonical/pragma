import type { SearchParamKey, StandardSchemaV1 } from "@canonical/router-core";
import { route } from "@canonical/router-core";
import { describe, expectTypeOf, it } from "vitest";
import useSearchParam from "./hooks/useSearchParam.js";
import type useSearchParams from "./hooks/useSearchParams.js";
import type { RegisteredRouteMap } from "./register.js";

/**
 * Type-level tests that need a *registered* route map.
 *
 * The `declare module` augmentation below is program-global: it retypes every
 * `RegisteredRouteMap` reference in the whole TypeScript program, which would
 * break sibling tests that build their own route maps. This file therefore
 * runs in its own program — `tsconfig.types.json`, driven by the
 * `check:ts:registered` script — and the default `tsconfig.json` excludes it.
 *
 * Nothing here asserts at runtime; `expectTypeOf` never invokes the hooks.
 */

function testSchema<TValue>(): StandardSchemaV1<TValue, TValue> {
  return {
    "~standard": {
      version: 1,
      vendor: "router-react-types-test",
      validate: (value) => ({ value: value as TValue }),
    },
  };
}

const routes = {
  home: route({
    url: "/",
    content: () => null,
  }),
  results: route({
    url: "/results",
    search: testSchema<{ page: string; q: string }>(),
    content: () => null,
  }),
};

declare module "./register.js" {
  interface RouterRegister {
    routes: typeof routes;
  }
}

describe("SearchParamKey against a registered route map", () => {
  it("is the union of the declared search keys", () => {
    expectTypeOf<SearchParamKey<RegisteredRouteMap>>().toEqualTypeOf<
      "page" | "q"
    >();
  });

  it("types useSearchParam's key argument", () => {
    expectTypeOf(useSearchParam).parameter(0).toEqualTypeOf<"page" | "q">();
    expectTypeOf(useSearchParam).toBeCallableWith("q");
  });

  it("rejects a key no registered route declares", () => {
    // @ts-expect-error - "nope" is not a declared search-param key.
    expectTypeOf(useSearchParam).toBeCallableWith("nope");
  });

  it("constrains useSearchParams' key tuple", () => {
    type Selected = ReturnType<typeof useSearchParams<readonly ["q", "page"]>>;

    expectTypeOf<Selected>().toEqualTypeOf<
      Readonly<{ q: string | null; page: string | null }>
    >();
  });

  it("rejects a key tuple no registered route declares", () => {
    // @ts-expect-error - "nope" is not a declared search-param key.
    type Selected = ReturnType<typeof useSearchParams<readonly ["nope"]>>;

    expectTypeOf<Selected>().not.toBeNever();
  });
});
