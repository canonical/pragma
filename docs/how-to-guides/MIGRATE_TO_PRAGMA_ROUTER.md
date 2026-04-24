# Migrating to the pragma router

Migration guide for apps currently using React Router (v5, v6, v7) or TanStack Router. Covers concept translation, incremental adoption, and coexistence patterns.

## Shared concepts

Before diving into version-specific translations, understand the pragma router's model:

**Flat routes, not nested trees.** Every route is a top-level entry in a route map object. There is no route tree or hierarchy. Shared layout and data live in wrappers, not parent routes.

**Wrappers for layout.** Where other routers use nested routes for shared layout, pragma uses `wrapper()` + `group()`. A wrapper provides a layout shell; `group()` applies it to a set of routes.

**Middleware for cross-cutting concerns.** Auth checks, i18n, analytics, and similar concerns are expressed as middleware — functions that transform routes before the router is created.

**Type-safe navigation by name.** Routes are navigated by their key in the route map (`"home"`, `"userProfile"`), not by path. TypeScript enforces that only valid route names are used.

**Data is not a routing concern.** The router does not own data fetching. `prefetch()` is a fire-and-forget navigation-time hook for warming caches or preloading assets. Components fetch their own data from their cache library (Relay, TanStack Query, SWR, etc.).

**React error boundaries for errors.** No router-specific error UI. Errors from `prefetch()` throw into the React tree and are caught by standard React error boundaries. Use `StatusResponse` to signal HTTP-like errors.

---

## From React Router v5

React Router v5 uses class-based patterns, `<Switch>`, render props, and the `withRouter()` HOC. The gap to pragma is the largest of any migration.

| React Router v5 | Pragma |
|---|---|
| `<BrowserRouter>` | `createBrowserRouter(routes)` + `<RouterProvider>` |
| `<Switch>` / `<Route path="/foo">` | `route({ url: "/foo", content: FooPage })` in a flat route map |
| `<Route component={Foo}>` | `content: FooPage` on the route definition |
| `<Route render={() => <Foo />}>` | `content: FooPage` (pass component directly) |
| `withRouter(Component)` | `useRouter()` hook |
| `this.props.match.params` | `useRoute().params` or `({ params }) => ...` in content |
| `this.props.history.push("/bar")` | `router.navigate("bar")` (by route name, not path) |
| `this.props.location` | `useRoute()` returns pathname, search, hash |
| `<Redirect to="/login">` | `redirect("/login", 302)` in `prefetch()`, or a static redirect route |
| `<Link to="/foo">` | `<Link to="foo">` (route name, typed) |
| `<NavLink activeClassName="on">` | `<Link to="foo">` sets `aria-current="page"` when active |
| Nested `<Route>` for layout | `wrapper()` + `group()` |

### Key differences

- **No render props or HOCs.** Everything is hooks-based. If your v5 app uses class components with `withRouter()`, you'll need to convert them to function components.
- **No path-based navigation.** `router.navigate("userProfile", { params: { id: "42" } })` instead of `history.push("/users/42")`. The router builds the URL from the route definition.
- **No `exact` prop.** Pragma routes match exactly by default. URL patterns use `:param` syntax.

---

## From React Router v6

React Router v6 is hooks-based and closer to pragma's model. The main differences are nested routes (pragma is flat) and relative navigation (pragma uses named routes).

| React Router v6 | Pragma |
|---|---|
| `<BrowserRouter>` | `createBrowserRouter(routes)` + `<RouterProvider>` |
| `<Routes>` / `<Route path="/foo" element={<Foo />}>` | `route({ url: "/foo", content: FooPage })` |
| Nested `<Route>` for layout | `wrapper()` + `group()` |
| `<Outlet />` | `<Outlet />` (same concept, different implementation) |
| `useNavigate()` | `useRouter().navigate("routeName")` |
| `useParams()` | `useRoute().params` |
| `useSearchParams()` | `useSearchParams()` (similar API) |
| `useLocation()` | `useRoute()` returns pathname, hash, searchParams |
| `<Link to="/foo">` | `<Link to="foo">` (route name, not path) |
| `<Link to="../sibling">` | Not supported — use absolute route names |
| `Navigate` component | `redirect()` in `prefetch()` |
| `loader` (v6.4+) | `prefetch()` (fire-and-forget, not data provider) |
| `useLoaderData()` | Use your cache library: `useQuery()`, `useLazyLoadQuery()` |
| Error boundaries via `errorElement` | React `<ErrorBoundary>` with `StatusResponse` |

### Key differences

- **No relative paths.** Pragma routes are flat — there's no hierarchy to navigate relative to. All navigation uses route names.
- **No `loader` data return.** `prefetch()` warms caches but doesn't return data to the component. Components own their data.
- **Wrappers instead of layout routes.** Instead of nesting `<Route>` inside a layout route with `<Outlet>`, use `wrapper()` to define the layout and `group()` to apply it.

### Example: nested layout migration

React Router v6:
```tsx
<Route element={<DashboardLayout />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/settings" element={<Settings />} />
</Route>
```

Pragma:
```tsx
const dashboardLayout = wrapper({
  id: "dashboard",
  component: ({ children }) => <DashboardLayout>{children}</DashboardLayout>,
});

const [dashboard, settings] = group(dashboardLayout, [
  route({ url: "/dashboard", content: DashboardPage }),
  route({ url: "/settings", content: SettingsPage }),
] as const);
```

---

## From React Router v7

React Router v7 merges Remix's data model (loaders, actions, forms) into the router. Pragma explicitly does not own data mutations — this is the biggest conceptual gap.

| React Router v7 | Pragma |
|---|---|
| `loader()` | `prefetch()` — fire-and-forget cache warming, not data provider |
| `action()` | No equivalent — use your cache library's mutation API |
| `useLoaderData()` | `useQuery()` / `useLazyLoadQuery()` from cache library |
| `useActionData()` | Cache library's mutation result state |
| `<Form>` | Standard `<form>` with cache library mutation |
| `useFetcher()` | Cache library's `useMutation()` or `useQuery()` |
| `useNavigation()` | `useNavigationState()` for loading state |
| `redirect()` in loader | `redirect()` in `prefetch()` |
| `ErrorBoundary` in route | React `<ErrorBoundary>` wrapping `<Outlet>` |
| File-based routing (optional) | Code-based only — no file conventions |
| Framework mode | Library only — no server functions |

### Key differences

- **No mutation system.** This is the fundamental difference. React Router v7 (via Remix) provides `action()`, `<Form>`, `useFetcher()`, and automatic revalidation. Pragma delegates all mutation and data lifecycle to external cache libraries.
- **No server functions.** Pragma is a client-side routing library. Server logic lives in your server framework (Express, Bun, etc.), not in route definitions.
- **No automatic revalidation.** After a mutation, your cache library handles invalidation and refetching.

### Migration strategy for data-heavy v7 apps

1. Replace `loader()` with `prefetch()` that warms your cache library
2. Replace `action()` with standard form handlers using your cache library's mutation API
3. Replace `useLoaderData()` with your cache library's data hooks
4. Replace `<Form>` with `<form>` + `onSubmit` handler
5. Replace `useFetcher()` with `useMutation()` from your cache library

---

## From TanStack Router

TanStack Router's type-safe tree model is the closest competitor to pragma's type safety. The migration preserves type safety but changes the route structure.

| TanStack Router | Pragma |
|---|---|
| `createRootRoute()` + `createRoute()` | `route()` in a flat map |
| Nested route tree | Flat routes + `wrapper()` + `group()` |
| `createRouter()` | `createBrowserRouter(routes)` |
| `RouterProvider` | `RouterProvider` (same concept) |
| `<Outlet />` | `<Outlet />` |
| `<Link to="/foo" params={...}>` | `<Link to="foo" params={...}>` |
| `useSearch()` | `useSearchParams()` |
| `useParams()` | `useRoute().params` |
| `useNavigate()` | `useRouter().navigate("routeName")` |
| `beforeLoad` | Middleware via `applyMiddleware()` |
| `loader` | `prefetch()` (fire-and-forget) |
| `useLoaderData()` | Cache library hooks |
| `zodSearchValidator()` | Standard Schema on route: `search: schema` |
| Route-level `errorComponent` | React `<ErrorBoundary>` |
| `Pending` component | `<Outlet fallback={...}>` |
| File-based routing (optional) | Code-based only |

### Key differences

- **Flat routes.** TanStack uses a tree with `createRootRoute()` → `createRoute()` nesting. Pragma uses a flat object where layout is handled by wrappers.
- **Type registration.** TanStack infers types from the tree. Pragma uses `declare module` augmentation for global type registration.
- **Search validation.** TanStack uses `zodSearchValidator()` or similar. Pragma uses the Standard Schema protocol (`~standard` interface) — works with Zod, Valibot, ArkType, or custom validators.

---

## Incremental adoption

Most migrations are incremental. Pragma supports two coexistence patterns for running alongside an existing router during transition.

### DOM-subtree partitioning (recommended)

The existing router manages the outer app. Pragma is mounted inside it for new sections:

```tsx
// Existing React Router v6 app
<BrowserRouter>
  <Routes>
    {/* Legacy routes */}
    <Route path="/legacy/*" element={<LegacyApp />} />

    {/* New routes handled by pragma */}
    <Route path="/new/*" element={
      <RouterProvider router={pragmaRouter}>
        <Outlet />
      </RouterProvider>
    } />
  </Routes>
</BrowserRouter>
```

Navigation within `/new/*` stays inside pragma. Navigation to `/legacy/*` goes through React Router. Migrate sections one at a time.

### URL-prefix partitioning

Each router handles a distinct URL prefix. No nesting required:

```tsx
const pragmaRouter = createBrowserRouter(newRoutes, {
  // Only handle routes under /new
});
```

The existing router handles everything outside pragma's route definitions. Clear URL-level boundary.

### Limitations

- Navigation between the two routers may cause a full page load (the target router doesn't intercept the other's navigations).
- Scroll restoration may not work across router boundaries.
- Browser back/forward may behave unexpectedly if both routers listen to the same history events. The Navigation API adapter (default in modern browsers) mitigates this via `event.intercept()`.

---

## Type registration

After defining routes, register them for global type inference:

```tsx
declare module "@canonical/router-react" {
  interface RouterRegister {
    routes: typeof appRoutes;
  }
}
```

This gives you typed `<Link to="routeName">`, `router.navigate("routeName")`, and `router.buildPath("routeName")` without explicit generics on every call.

---

## Reference

- [Router core README](../../packages/runtime/router/README.md)
- [Router React README](../../packages/react/router/README.md)
- [Boilerplate reference app](../../apps/react/boilerplate-vite/)
- [Middleware cookbook](./ROUTER_MIDDLEWARE_COOKBOOK.md)
