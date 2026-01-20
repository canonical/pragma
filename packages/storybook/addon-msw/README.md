# @canonical/storybook-addon-msw

Mock Service Worker integration for Storybook. This addon enables mocking API responses in stories, allowing you to develop and test components that depend on backend services without running actual servers.

## Installation

```bash
bun add -D @canonical/storybook-addon-msw msw
```

Initialize the MSW service worker in your project:

```bash
npx msw init public/
```

This creates `public/mockServiceWorker.js`, which MSW uses to intercept network requests.

## Setup

Register the addon in your `.storybook/main.ts`:

```typescript
const config: StorybookConfig = {
  addons: [
    "@canonical/storybook-addon-msw",
  ],
};

export default config;
```

## Usage in Stories

Define MSW handlers in your story parameters to mock API responses:

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { UserProfile } from "./UserProfile";

const meta: Meta<typeof UserProfile> = {
  title: "Components/UserProfile",
  component: UserProfile,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/user", () => {
          return HttpResponse.json({
            id: 1,
            name: "Jane Doe",
            email: "jane@example.com",
          });
        }),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/user", () => {
          return HttpResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/user", async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return HttpResponse.json({ id: 1, name: "Jane Doe" });
        }),
      ],
    },
  },
};
```

## Toolbar Controls

The addon adds a toolbar button to toggle MSW globally. When enabled (default), all handlers defined in story parameters intercept matching requests. Disable MSW to test how components behave when API requests reach actual endpoints.

## Panel

The MSW panel in the addon bar shows which handlers are active for the current story. Use this to verify your handlers are correctly registered and to debug request matching issues.

## Handler Types

MSW supports all HTTP methods:

```typescript
import { http, HttpResponse } from "msw";

// GET requests
http.get("/api/items", () => HttpResponse.json([...]));

// POST with body access
http.post("/api/items", async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json({ id: 1, ...body }, { status: 201 });
});

// URL parameters
http.get("/api/items/:id", ({ params }) => {
  return HttpResponse.json({ id: params.id });
});

// Query parameters
http.get("/api/search", ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  return HttpResponse.json({ results: [...] });
});
```

## Troubleshooting

### Requests not being intercepted

Verify the service worker is loaded in DevTools under Application > Service Workers. If missing, re-run `npx msw init public/` and restart Storybook.

Check that request URLs in handlers match exactly, including any leading slashes and query parameters.

### TypeScript errors with handlers

Ensure both `msw` and the addon are installed. The `http` and `HttpResponse` imports come from the `msw` package, not from this addon.

### Handlers work in one story but not another

Each story's handlers are scoped to that story. Define common handlers at the meta level if they should apply to all stories in a file:

```typescript
const meta: Meta<typeof Component> = {
  component: Component,
  parameters: {
    msw: {
      handlers: [
        // These handlers apply to all stories
      ],
    },
  },
};
```
