# @canonical/summon-application

Summon generators for scaffolding application structure: domains, routes, and wrappers. Produces code aligned with the [boilerplate reference app](../../../apps/react/boilerplate-vite/).

## Generators

### `summon domain <name>`

Creates a domain folder under `src/domains/` with a `MainPage` and a `routes.ts` barrel.

```bash
summon domain billing
```

Produces:

```
src/domains/billing/
├── MainPage.tsx    # Page component with useHead()
└── routes.ts       # Route barrel with example route entry
```

After generating, import the domain routes in `src/routes.tsx` and wire them with `group()`:

```tsx
import billingRoutes from "#domains/billing/routes.js";

const [billing] = group(publicLayout, [billingRoutes.billing] as const);
```

### `summon route <domain>/<name>`

Adds a page component to an existing domain and appends the import to its `routes.ts`.

```bash
summon route billing/invoices
```

Produces:

```
src/domains/billing/
├── InvoicesPage.tsx   # New page component
└── routes.ts          # Import + TODO comment appended
```

The generator appends the import and a comment with the route entry. Add the route to the `routes` object manually:

```ts
invoices: route({ url: "/billing/invoices", content: InvoicesPage }),
```

Create the domain first with `summon domain <name>`.

### `summon wrapper <name>`

Creates a layout wrapper component under `src/lib/`.

```bash
summon wrapper sidebar
```

Produces:

```
src/lib/SidebarLayout/
├── SidebarLayout.tsx   # Layout component with children prop
└── index.ts            # Barrel export
```

Use the layout component in a `wrapper()` call in `routes.tsx`:

```tsx
import SidebarLayout from "#lib/SidebarLayout/index.js";

const sidebarWrapper = wrapper({
  id: "sidebar",
  component: ({ children }) => <SidebarLayout>{children}</SidebarLayout>,
});
```

## Conventions

The generators enforce the conventions established by the boilerplate:

### File structure

```
src/
├── client/                 # Client entry point (hydration)
├── server/                 # Server entry points (Express, Bun)
├── domains/                # Feature domains
│   ├── marketing/
│   │   ├── HomePage.tsx
│   │   ├── GuidePage.tsx
│   │   └── routes.ts
│   └── account/
│       ├── AccountPage.tsx
│       ├── LoginPage.tsx
│       └── routes.ts
├── lib/                    # Shared components
│   ├── Navigation/
│   └── SidebarLayout/
├── styles/                 # CSS
└── routes.tsx              # Root route map, middleware, type registration
```

### Naming

| Concept | Pattern | Example |
|---------|---------|---------|
| Page component | `{Name}Page.tsx` | `SettingsPage.tsx` |
| Layout component | `{Name}Layout.tsx` | `SidebarLayout.tsx` |
| Domain routes | `routes.ts` (not `.tsx`) | `src/domains/billing/routes.ts` |
| Root routes | `routes.tsx` | `src/routes.tsx` |
| Component folders | PascalCase | `src/lib/SidebarLayout/` |

### Route definitions

Routes are flat objects using `route()` from `@canonical/router-core`:

```ts
const routes = {
  invoices: route({
    url: "/billing/invoices",
    content: InvoicesPage,
  }),
} as const;

export default routes;
```

- `content` receives the component directly (not a wrapper function)
- Pages use `useHead()` from `@canonical/react-head` for title and meta
- No `fetch()` / `prefetch()` unless needed for cache warming
- No `.error` — use React error boundaries
- Route files are `.ts` (no JSX in route definitions)

### Wrappers

Wrapper components are standard React components with a `children` prop. They become routable wrappers via `wrapper()` + `group()` in `routes.tsx`:

```tsx
const layout = wrapper({
  id: "sidebar",
  component: ({ children }) => <SidebarLayout>{children}</SidebarLayout>,
});

const [invoices, payments] = group(layout, [
  billingRoutes.invoices,
  billingRoutes.payments,
] as const);
```

### Type registration

Register routes once in `routes.tsx` for global type inference:

```tsx
declare module "@canonical/router-react" {
  interface RouterRegister {
    routes: typeof appRoutes;
  }
}
```

This enables typed `<Link to="invoices">`, `router.navigate("invoices")`, and `router.buildPath("invoices")`.
