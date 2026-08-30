/**
 * Compile-time contract tests for the router's type surface.
 *
 * Runtime behavior lives in the sibling test files; this file pins the
 * inference results and the compile-time diagnostics. Every assertion here
 * has been mutation-tested: change the source type and the assertion fails.
 */

import { describe, expectTypeOf, it } from "vitest";
import createRouter from "./createRouter.js";
import createRouterStore from "./createRouterStore.js";
import type { RedirectTarget, ValidPath } from "./route.js";
import route from "./route.js";
import type {
  AnyRoute,
  InferOutput,
  InferParams,
  InferSearch,
  ParamNames,
  ParamsOf,
  RouterStore,
  SearchInputOf,
  SearchOf,
  SearchParamKey,
  StandardSchemaIssue,
  StandardSchemaResult,
  StandardSchemaV1,
} from "./types.js";

/** Standard Schema v1 test double; `TInput` defaults to `TOutput`. */
function testSchema<TOutput, TInput = TOutput>(
  validate: (value: unknown) => StandardSchemaResult<TOutput> = (value) => ({
    value: value as TOutput,
  }),
): StandardSchemaV1<TInput, TOutput> {
  return { "~standard": { version: 1, vendor: "router-test", validate } };
}

describe("schema inference", () => {
  it("requires a message on every validation issue", () => {
    void (() => {
      const issue: StandardSchemaIssue = { message: "broken" };

      // @ts-expect-error — the Standard Schema spec requires `message`
      const bare: StandardSchemaIssue = {};

      return [issue, bare];
    });
  });

  it("infers output, falling back to unknown when unknowable", () => {
    type Coercing = StandardSchemaV1<{ page?: string }, { page: number }>;

    expectTypeOf<InferOutput<Coercing>>().toEqualTypeOf<{ page: number }>();

    // A value widened to the bare constraint is unknowable — the fallback
    // must be `unknown`, never a concrete record, so consumers can detect
    // it with `unknown extends …` and pick their own fallback.
    expectTypeOf<InferOutput<StandardSchemaV1>>().toEqualTypeOf<unknown>();
    expectTypeOf<InferOutput<undefined>>().toEqualTypeOf<unknown>();
  });

  it("derives params from the schema output, else from the path", () => {
    type IdSchema = StandardSchemaV1<{ id: string }, { readonly id: number }>;

    expectTypeOf<InferParams<"/users/:id", IdSchema>>().toEqualTypeOf<{
      readonly id: number;
    }>();
    expectTypeOf<InferParams<"/users/:id", undefined>>().toEqualTypeOf<{
      readonly id: string;
    }>();
    // A schema widened to the bare constraint keeps the path-derived params.
    expectTypeOf<
      InferParams<"/users/:id", StandardSchemaV1 | undefined>
    >().toEqualTypeOf<{ readonly id: string }>();
  });

  it("keeps an empty search without a schema and widens unknowable ones", () => {
    expectTypeOf<InferSearch<undefined>>().toEqualTypeOf<
      Record<string, never>
    >();
    expectTypeOf<InferSearch<StandardSchemaV1>>().toEqualTypeOf<
      Readonly<Record<string, unknown>>
    >();
    expectTypeOf<
      InferSearch<StandardSchemaV1<{ q?: string }, { q: string }>>
    >().toEqualTypeOf<{ q: string }>();
  });

  it("types matched search on output and built search on input", () => {
    const listRoute = route({
      url: "/list",
      search: testSchema<{ q: string; page: number }, { q: string }>(),
      content: () => "list",
    });
    const plainRoute = route({ url: "/plain", content: () => "plain" });

    expectTypeOf<SearchOf<typeof listRoute>>().toEqualTypeOf<{
      q: string;
      page: number;
    }>();
    expectTypeOf<SearchInputOf<typeof listRoute>>().toEqualTypeOf<{
      q: string;
    }>();
    expectTypeOf<SearchOf<typeof plainRoute>>().toEqualTypeOf<
      Record<string, never>
    >();
    expectTypeOf<SearchInputOf<typeof plainRoute>>().toEqualTypeOf<
      Record<string, never>
    >();
    // A route widened to `AnyRoute` has an unknowable search input — the
    // build side falls back to a readonly record, mirroring `SearchOf`.
    expectTypeOf<SearchInputOf<AnyRoute>>().toEqualTypeOf<
      Readonly<Record<string, unknown>>
    >();
  });
});

describe("path grammar", () => {
  it("extracts param names from a pattern", () => {
    expectTypeOf<ParamNames<"/users/:userId/posts/:postId">>().toEqualTypeOf<
      "userId" | "postId"
    >();
    expectTypeOf<ParamNames<"/plain/path">>().toEqualTypeOf<never>();
  });

  it("resolves ValidPath to unknown for grammar the router matches", () => {
    expectTypeOf<ValidPath<"/users/:id">>().toEqualTypeOf<unknown>();
    expectTypeOf<ValidPath<"/files/*">>().toEqualTypeOf<unknown>();
  });

  it("rejects a wildcard that is not the final segment", () => {
    // `matchPath` returns as soon as it reaches a `*`, so `/edit` here would
    // never constrain a match — `/files/anything` would match this pattern.
    expectTypeOf<
      keyof ValidPath<"/files/*/edit">
    >().toEqualTypeOf<"route path wildcard '*' must be the final segment; the router stops matching at it, so later segments are never compared">();

    void (() => {
      // @ts-expect-error — the wildcard is followed by another segment
      route({ url: "/files/*/edit", content: () => "files" });
    });
  });

  it("names the offending modifier in the ValidPath error property", () => {
    expectTypeOf<
      keyof ValidPath<"/users/:id?">
    >().toEqualTypeOf<"route path param ':id' uses the '?' optional modifier, which the router never matches; use a plain ':id' segment">();
  });

  it("rejects the phantom param-modifier grammar at the route() call", () => {
    void (() => {
      route({ url: "/users/:id", content: () => "ok" });
      route({ url: "/files/*", content: () => "ok" });

      // @ts-expect-error — ':id?' uses the '?' optional modifier
      route({ url: "/users/:id?", content: () => "no" });
      // @ts-expect-error — ':path*' uses the '*' repeat modifier
      route({ url: "/files/:path*", content: () => "no" });
      // @ts-expect-error — ':seg+' uses the '+' repeat modifier
      route({ url: "/files/:seg+", content: () => "no" });
      // @ts-expect-error — ':id(\d+)' uses a regex group
      route({ url: "/users/:id(\\d+)", content: () => "no" });
    });
  });

  it("requires a params schema to cover the path's param names", () => {
    void (() => {
      route({
        url: "/users/:id",
        params: testSchema<{ readonly id: number }>(),
        content: () => "ok",
      });
      // A schema may output more than the path needs.
      route({
        url: "/users/:id",
        params: testSchema<{ readonly id: number; extra: string }>(),
        content: () => "ok",
      });

      route({
        url: "/users/:id",
        // @ts-expect-error — the schema output lacks the path param 'id'
        params: testSchema<{ readonly slug: string }>(),
        content: () => "no",
      });
    });
  });

  it("rejects a redirect target the path's params cannot satisfy", () => {
    void (() => {
      route({ url: "/old/:id", redirect: "/new/:id", status: 308 });
      route({ url: "/old/:id", redirect: "/new", status: 301 });

      // @ts-expect-error — ':slug' is not provided by '/old/:id'
      route({ url: "/old/:id", redirect: "/new/:slug", status: 308 });
    });

    expectTypeOf<
      keyof RedirectTarget<"/old/:id", "/new/:slug">
    >().toEqualTypeOf<"redirect target references param ':slug' that path '/old/:id' does not provide; add ':slug' to the path or remove it from the target">();
  });

  it("names the modifier when a redirect target param carries one", () => {
    void (() => {
      // @ts-expect-error — ':id?' uses the '?' optional modifier
      route({ url: "/old/:id", redirect: "/new/:id?", status: 308 });
    });

    // The path provides 'id'; the fault is the modifier, and the message
    // must attribute it — not claim the param is missing from the path.
    expectTypeOf<
      keyof RedirectTarget<"/old/:id", "/new/:id?">
    >().toEqualTypeOf<"redirect target param ':id' uses the '?' optional modifier, which the router never renders; use a plain ':id' segment">();
    expectTypeOf<
      keyof RedirectTarget<"/old/:id", "/new/:id(\\d+)">
    >().toEqualTypeOf<"redirect target param ':id' uses a regex group, which the router never renders; use a plain ':id' segment">();
  });
});

describe("router surface", () => {
  // These three tests pin the `NoInfer` instrumentation on `route()`'s
  // declared return types. Each is mutation-tested: removing `NoInfer`
  // from `TParamsSchema` or `TSearchSchema` (either overload) fails the
  // first two, and wrongly extending it to `TWrappers` fails the third.
  it("keeps a schema-less inline data route on its path-derived types", () => {
    const router = createRouter({
      user: route({ url: "/users/:id", content: () => "user" }),
    });
    type UserRoute = (typeof router)["routes"]["user"];

    // Without `NoInfer`, the factory's contextual type collapses the
    // schema generics to their constraints: params degrade to
    // `{ readonly id: unknown }` and search widens to a readonly record.
    expectTypeOf<ParamsOf<UserRoute>>().toEqualTypeOf<{
      readonly id: string;
    }>();
    expectTypeOf<SearchOf<UserRoute>>().toEqualTypeOf<Record<string, never>>();
  });

  it("keeps a schema-less inline redirect route on its path params", () => {
    const router = createRouter({
      legacy: route({ url: "/old/:id", redirect: "/new/:id", status: 308 }),
    });

    expectTypeOf<
      ParamsOf<(typeof router)["routes"]["legacy"]>
    >().toEqualTypeOf<{ readonly id: string }>();
  });

  it("leaves the wrapper tuple free of NoInfer markers", () => {
    const router = createRouter({
      home: route({ url: "/", content: () => "home" }),
      legacy: route({ url: "/legacy", redirect: "/modern", status: 301 }),
    });

    // `createRouterStore` infers its route map back out of the match
    // function; a `NoInfer` marker embedded in the wrapper tuple makes
    // these calls fail to typecheck.
    const store = createRouterStore(router.match);
    void (() => store.commit("/legacy", router.match("/legacy")));
  });

  it("keeps inline route schema inference inside the router factory", () => {
    const router = createRouter({
      profile: route({
        url: "/profile/:id",
        params: testSchema<{ readonly id: number }>(),
        search: testSchema<{ tab: string }, { tab?: string }>(),
        content: ({ params, search }) => {
          expectTypeOf(params).toEqualTypeOf<{ readonly id: number }>();
          expectTypeOf(search).toEqualTypeOf<{ tab: string }>();

          return "profile";
        },
      }),
    });

    void (() => {
      const intent = router.navigate("profile", { params: { id: 4 } });

      // Build values are carried verbatim: params on schema output, search
      // on schema input.
      expectTypeOf(intent.params).toEqualTypeOf<{ readonly id: number }>();
      expectTypeOf(intent.search).toEqualTypeOf<{ tab?: string }>();
    });
  });

  it("accepts only serializable search values when building a path", () => {
    const router = createRouter({
      list: route({
        url: "/list",
        search: testSchema<
          { q: string },
          {
            q?: string;
            tags?: Array<string | undefined>;
            filter?: { active: boolean };
            page?: unknown;
          }
        >((value) => ({ value: value as { q: string } })),
        content: () => "list",
      }),
    });

    void (() => {
      router.buildPath("list", {
        search: { q: "x", tags: ["a", undefined] },
      });
      // An unknown-typed field of a coercing schema stays assignable.
      router.buildPath("list", { search: { page: 2 } });

      // @ts-expect-error — a nested object cannot serialize into the query
      router.buildPath("list", { search: { filter: { active: true } } });
      // @ts-expect-error — a typo'd key must fail excess-property checking
      router.buildPath("list", { search: { qq: "typo" } });
    });
  });

  it("accepts only scalar param values when building a path", () => {
    const router = createRouter({
      user: route({
        url: "/users/:id",
        params: testSchema<{ readonly id: number }>(),
        content: () => "user",
      }),
      files: route({
        url: "/files/:path",
        params: testSchema<{ readonly path: string[] }>(),
        content: () => "files",
      }),
    });

    void (() => {
      router.buildPath("user", { params: { id: 42 } });

      // @ts-expect-error — an array cannot render into one path segment
      router.buildPath("files", { params: { path: ["a", "b"] } });
    });
  });

  it("limits search-param keys to those the schemas declare", () => {
    const router = createRouter({
      list: route({
        url: "/list",
        search: testSchema<{ q: string; page: number }>(),
        content: () => "list",
      }),
      plain: route({ url: "/plain", content: () => "plain" }),
    });

    // The schema-less route must not poison the union to `string`.
    expectTypeOf<SearchParamKey<(typeof router)["routes"]>>().toEqualTypeOf<
      "q" | "page"
    >();
    // The store's independently declared surface moves in lockstep.
    expectTypeOf<
      Parameters<
        RouterStore<(typeof router)["routes"]>["subscribeToSearchParam"]
      >[0]
    >().toEqualTypeOf<"q" | "page">();

    void (() => {
      router.setSearchParams({ q: "router", page: null });
      router.setSearchParams((current) => {
        // Live URLs carry undeclared params, so the callback stays wide.
        expectTypeOf(current).toEqualTypeOf<Readonly<Record<string, string>>>();

        return { page: null };
      });
      router.subscribeToSearchParam("page", () => {});

      // @ts-expect-error — 'tab' is not declared by any search schema
      router.setSearchParams({ tab: "x" });
      // @ts-expect-error — 'tab' is not declared by any search schema
      router.subscribeToSearchParam("tab", () => {});
    });
  });

  it("falls back to string keys when no route declares a search schema", () => {
    const router = createRouter({
      plain: route({ url: "/plain", content: () => "plain" }),
    });

    expectTypeOf<
      SearchParamKey<(typeof router)["routes"]>
    >().toEqualTypeOf<string>();
  });

  it("documents the mixed-union args limit of the generic signatures", () => {
    const router = createRouter({
      home: route({ url: "/", content: () => "home" }),
      user: route({ url: "/users/:id", content: () => "user" }),
    });

    void (() => {
      router.buildPath("home");
      router.buildPath("user", { params: { id: "1" } });

      // @ts-expect-error — a params route requires its options argument
      router.buildPath("user");

      // A union of names mixing parameterised and parameterless routes
      // requires the options argument, because one member needs params.
      // `HasParams` distributes to `boolean` over such a union, so this is
      // only caught by asking `true extends HasParams<…>` rather than
      // `HasParams<…> extends true` — the latter takes the optional branch
      // and lets a missing `params` reach `renderPattern` at runtime.
      const name = "home" as "home" | "user";

      // @ts-expect-error — the union includes a route that needs params
      router.buildPath(name);

      router.buildPath(name, { params: { id: "1" } });
    });
  });
});
