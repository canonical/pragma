# @canonical/router-core

Framework-agnostic router core for the H-plan router architecture.

This package implements the initial core slice of the custom router work:

- flat route triplets via `route()`
- nominal layout wrappers via `wrapper()`
- wrapper annotation composition via `group()`
- endomorphic route transforms via `applyMiddleware()`
- typed route maps via `createRouter()`

## Installation

```bash
bun add @canonical/router-core
```

## Quick start

```ts
import { createRouter, group, route, wrapper } from "@canonical/router-core";

const appLayout = wrapper({
  id: "app:layout",
  component: ({ children }) => children,
});

const homeRoute = route({
  url: "/",
  content: () => "home",
});

const userRoute = route({
  url: "/users/:userId",
  content: ({ params }) => `user:${params.userId}`,
});

const router = createRouter({
  home: group(appLayout, [homeRoute])[0],
  user: group(appLayout, [userRoute])[0],
});

router.buildPath("user", { params: { userId: "42" } });
```
