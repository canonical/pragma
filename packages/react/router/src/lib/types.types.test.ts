import type {
  Router,
  RouterState,
  StandardSchemaV1,
} from "@canonical/router-core";
import { route } from "@canonical/router-core";
import { describe, expectTypeOf, it } from "vitest";
import useRoute from "./hooks/useRoute.js";
import type useRouter from "./hooks/useRouter.js";
import type useRouterState from "./hooks/useRouterState.js";
import useSearchParam from "./hooks/useSearchParam.js";
import useSearchParams from "./hooks/useSearchParams.js";
import Link from "./Link/Link.js";
import type readDehydratedState from "./readDehydratedState.js";

/**
 * Type-level tests for the React bindings.
 *
 * Nothing here asserts at runtime — `tsc --noEmit` is the gate, and this
 * package's tsconfig includes test files so the assertions are enforced. The
 * `it()` wrappers exist so Vitest sees a suite; `expectTypeOf(...)` and
 * instantiation expressions such as `useRoute<T>` never invoke the hooks, so
 * no `RouterProvider` is needed.
 *
 * Assertions that need a *registered* route map live in
 * `register.types.test.ts`, which runs in its own TypeScript program: the
 * `declare module` augmentation it needs is program-global and would retype
 * every sibling test here.
 */

function testSchema<TInput, TOutput = TInput>(): StandardSchemaV1<
  TInput,
  TOutput
> {
  return {
    "~standard": {
      version: 1,
      vendor: "router-react-types-test",
      validate: (value) => ({ value: value as TOutput }),
    },
  };
}

const routes = {
  home: route({
    url: "/",
    content: () => null,
  }),
  /** Declares a search field the query-string serializer cannot encode. */
  report: route({
    url: "/report",
    search: testSchema<{ from: Date; label: string }>(),
    content: () => null,
  }),
  /** Coerces its search input, so input and output types differ. */
  results: route({
    url: "/results",
    search: testSchema<{ page: string }, { page: number }>(),
    content: () => null,
  }),
  user: route({
    url: "/users/:id",
    content: () => null,
  }),
};

type Routes = typeof routes;

describe("hook type parameters", () => {
  it("useRoute declares none — its return type never depended on them", () => {
    // @ts-expect-error - useRoute() accepts no type arguments.
    expectTypeOf(useRoute<Routes>);
  });

  it("useSearchParam declares none", () => {
    // @ts-expect-error - useSearchParam() accepts no type arguments.
    expectTypeOf(useSearchParam<Routes>);
  });

  it("useSearchParams declares only its key tuple", () => {
    // @ts-expect-error - useSearchParams() takes one type argument, not three.
    expectTypeOf(useSearchParams<Routes, undefined, readonly ["q"]>);
  });

  it("useSearchParams still infers the selected keys", () => {
    type Selected = ReturnType<typeof useSearchParams<readonly ["q", "page"]>>;

    expectTypeOf<Selected>().toEqualTypeOf<
      Readonly<{ q: string | null; page: string | null }>
    >();
  });

  it("useRouter keeps the generics it actually uses", () => {
    type Instance = ReturnType<typeof useRouter<Routes, undefined>>;

    expectTypeOf<Instance>().toEqualTypeOf<Router<Routes, undefined>>();
  });

  it("useRouterState keeps the generics it actually uses", () => {
    type Selector = Parameters<
      typeof useRouterState<Routes, undefined, string>
    >[0];

    expectTypeOf<Selector>()
      .parameter(0)
      .toEqualTypeOf<RouterState<Routes, undefined>>();
  });
});

describe("Link props", () => {
  /**
   * The first three assertions are what keeps `LinkProps` built out of
   * core's `PathBuildOptions` rather than a structural copy of it. Only
   * core's version types `search` by the schema's *input* and filters it
   * through the serializable-value check, so a hand-rolled substitute
   * breaks them: typing `search` by the schema's output fails the first two,
   * and dropping the serializable filter fails the third.
   */
  it("takes the search schema's input type", () => {
    expectTypeOf(Link<Routes, "results">).toBeCallableWith({
      search: { page: "2" },
      to: "results",
    });
  });

  it("rejects the search schema's output type on the build side", () => {
    expectTypeOf(Link<Routes, "results">).toBeCallableWith({
      // @ts-expect-error - `page` is coerced to a number only after validation.
      search: { page: 2 },
      to: "results",
    });
  });

  it("rejects a search value the query string cannot encode", () => {
    expectTypeOf(Link<Routes, "report">).toBeCallableWith({
      // @ts-expect-error - a Date does not serialize into a query string.
      search: { from: new Date(), label: "Q1" },
      to: "report",
    });
  });

  it("requires params for a parameterized route", () => {
    // @ts-expect-error - route "user" declares :id, so `params` is required.
    expectTypeOf(Link<Routes, "user">).toBeCallableWith({ to: "user" });
  });

  it("rejects an unknown route name", () => {
    // @ts-expect-error - "nope" is not a key of the route map.
    expectTypeOf(Link<Routes>).toBeCallableWith({ to: "nope" });
  });
});

describe("readDehydratedState", () => {
  it("narrows routeId to the route map's names", () => {
    type State = NonNullable<ReturnType<typeof readDehydratedState<Routes>>>;

    expectTypeOf<State["routeId"]>().toEqualTypeOf<
      "home" | "report" | "results" | "user" | null
    >();
  });
});
