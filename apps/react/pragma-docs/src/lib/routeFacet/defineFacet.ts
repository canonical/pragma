/**
 * A typed facet on a route's `meta` bag: ONE place per tenant for the key,
 * the value shape, and the assertion.
 *
 * Route `meta` is `Readonly<Record<string, unknown>>` and the router never
 * serialises it (`dehydrate()` emits routing state only — see
 * `#relay/routeQuery.js`'s header), so anything may live there at the
 * acknowledged cost of `unknown`-typed access. Before this helper each
 * tenant hand-wrote its own reader (`readRouteQueryEntry`, `readStripSlots`)
 * and each AUTHORING site wrote a bare computed key — which type-checks the
 * KEY but never the VALUE: `{ [SHELL_STRIP_META_KEY]: 42 }` compiles today.
 * `of()` closes that hole, because the value is checked where it is written;
 * `read()` keeps the assertion in one place for where it is consumed.
 *
 * THE CONVENTION BOTH EXISTING TENANTS ESTABLISHED, AND THIS HELPER KEEPS:
 * absence is fine (`undefined`), presence-and-malformed THROWS — a route
 * that half-declares a facet is a bug, not an absence. That is why `parse`
 * is a parser that throws the tenant's OWN message rather than a boolean
 * `value is T` guard: a guard collapses `readStripSlots`' four distinct
 * diagnostics ("not an object", "Context/Controls/Status is not a
 * component") into one generic failure, and those four messages are pinned
 * by `#lib/Shell/stripFacet.tests.js`.
 *
 * TENANTS, AND THE ONE HOLDOUT. `#lib/Shell/stripFacet.js` and
 * `#lib/routeShortcut/shortcutFacet.js` read through here.
 * `ROUTE_QUERY_META_KEY` (`#relay/routeQuery.js`) deliberately does NOT, and
 * is the next migration — with a PRECONDITION: `readRouteQueryEntry`'s four
 * error messages have no tests today (`src/server/routeQueries.tests.ts` is
 * happy-path only), and it sits on the SSR data path, whose only end-to-end
 * coverage is the e2e suite. Write those four message tests first, then
 * migrate. Until then the asymmetry in the route modules' `meta` literals —
 * a spread for the migrated tenants beside a bare computed key for the query
 * — is the un-migrated tenant marking itself. Leave it visible.
 */

/** A route's `meta` bag, exactly as `AnyRoute` declares it. */
export type RouteMeta = Readonly<Record<string, unknown>>;

export interface RouteFacet<TValue, TKey extends string = string> {
  /** The `meta` key this facet owns. */
  readonly key: TKey;
  /**
   * The authoring side: spread the result into a route's `meta` literal.
   * The value is type-checked here, which is the whole point — do NOT
   * defeat it with an `as` at the call site.
   */
  readonly of: (value: TValue) => { readonly [P in TKey]: TValue };
  /** The reading side: `undefined` when absent, `parse`'s throw when malformed. */
  readonly read: (meta: RouteMeta | undefined) => TValue | undefined;
}

/**
 * Define a facet from its key and its parser.
 *
 * `parse` receives the raw `unknown` and the key (so the tenant's message
 * can name it without repeating the literal) and either returns the value —
 * BY IDENTITY, callers rely on `toBe` — or throws.
 *
 * `const TKey` keeps the key a literal type through inference, so `of()`
 * produces a precisely-keyed object rather than an index signature.
 */
export const defineFacet = <TValue, const TKey extends string = string>(
  key: TKey,
  parse: (value: unknown, key: TKey) => TValue,
): RouteFacet<TValue, TKey> => ({
  key,
  of: (value) =>
    // A computed key over a generic widens to an index signature; the cast
    // restores the literal key the signature already promises.
    ({ [key]: value }) as unknown as { readonly [P in TKey]: TValue },
  read: (meta) => {
    const raw = meta?.[key];
    return raw === undefined ? undefined : parse(raw, key);
  },
});
