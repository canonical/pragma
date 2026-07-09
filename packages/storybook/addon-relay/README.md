# @canonical/storybook-addon-relay

Mock Relay environment integration for Storybook. This addon lets React stories that use Relay hooks (`useLazyLoadQuery`, `useFragment`, `usePaginationFragment`, ...) render against a `relay-test-utils` mock environment, so components with GraphQL data requirements work in Storybook without a running GraphQL server.

## Installation

```bash
bun add -D @canonical/storybook-addon-relay
```

`react-relay` and `relay-runtime` (18.x) are peer dependencies — your app already has them if it uses Relay.

## Setup

Register the addon in your `.storybook/main.ts`:

```typescript
const config: StorybookConfig = {
  addons: [
    "@canonical/storybook-addon-relay",
  ],
};

export default config;
```

If your Storybook config is built with `@canonical/storybook-config`, pass it through `extraAddons`:

```typescript
import { createConfig } from "@canonical/storybook-config";

export default createConfig("react", {
  extraAddons: ["@canonical/storybook-addon-relay"],
});
```

Registering the addon does two things:

- its `preview` entry adds the `withRelayEnvironment` decorator globally;
- its `preset` entry adds `relay-test-utils` (a CJS-only package) to Vite's `optimizeDeps.include`, so its named exports resolve in the browser ESM context.

## Usage in Stories

Declare a `relay` key in your story parameters. The decorator wraps the story in a `RelayEnvironmentProvider` carrying a fresh mock environment, and every GraphQL operation the story issues resolves automatically with data from `MockPayloadGenerator`:

```typescript
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { RelayParameters } from "@canonical/storybook-addon-relay";
import { UserProfile } from "./UserProfile.js";

const meta: Meta<typeof UserProfile> = {
  title: "Components/UserProfile",
  component: UserProfile,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    relay: {
      mockResolvers: {
        User: () => ({
          name: "Ada Lovelace",
          email: "ada@example.com",
        }),
      },
    } satisfies RelayParameters,
  },
};
```

Stories without a `relay` parameter pass through unchanged — the decorator is a no-op for them.

### Full payload control

For error states or hand-crafted payloads, provide `generateFunction` — it replaces `MockPayloadGenerator.generate()` entirely:

```typescript
export const CustomPayload: Story = {
  parameters: {
    relay: {
      generateFunction: (operation, mockResolvers) => ({
        data: { user: { id: "1", name: "Custom Name" } },
      }),
    } satisfies RelayParameters,
  },
};
```

## API

### `parameters.relay: RelayParameters`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `mockResolvers` | `MockResolvers` | | Mock resolvers passed to `MockPayloadGenerator.generate()`. Keys are GraphQL type names, values are factories returning field values. Fields without a resolver receive deterministic placeholder values |
| `generateFunction` | `(operation, mockResolvers?) => GraphQLSingularResponse` | | Full override for payload generation. When provided, `MockPayloadGenerator.generate()` is not called |

### `withRelayEnvironment`

The decorator itself, exported from the package root for manual composition (e.g. applying it to a single story file instead of globally). It is registered globally by the addon's `preview` entry, so most consumers never import it.

## How operations resolve

React components issue their Relay requests while rendering — after the decorator has returned — so the decorator queues an operation resolver on the mock environment rather than resolving up front. `relay-test-utils` consumes a queued resolver after a single operation, so the resolver re-arms itself after each one: initial queries, refetches, pagination, and mutations (including those triggered from play functions) all resolve with the same story configuration, no matter how many operations the story issues.

The mock environment is created once per story mount. Re-renders (e.g. changing args via controls) keep the environment and its store; switching stories or pressing the remount toolbar button starts from a fresh environment.

The environment is not exposed to the story context: operations resolve automatically, so stories and play functions do not need to drive the mock network by hand, and the `parameters.relay` contract stays minimal.

## Peer Dependencies

| Package | Version |
|---------|---------|
| `react` | ^18.0.0 \|\| ^19.0.0 |
| `react-dom` | ^18.0.0 \|\| ^19.0.0 |
| `react-relay` | >=18.0.0 <19.0.0 |
| `relay-runtime` | >=18.0.0 <19.0.0 |
| `storybook` | ^10.3.1 |

## Troubleshooting

### `does not provide an export named 'createMockEnvironment'`

`relay-test-utils` and `relay-runtime` are CJS-only. The addon's `preset` adds `relay-test-utils` to `optimizeDeps.include` automatically — make sure the addon is registered in `.storybook/main.ts` (not only imported in `preview.ts`), otherwise the preset does not run.

### A refetch or mutation never resolves

Operations only resolve for stories that declare a `relay` parameter (even an empty object enables the mock environment):

```typescript
export const Default: Story = {
  parameters: {
    relay: {},
  },
};
```

### Deterministic data

`MockPayloadGenerator` generates placeholder values for any field not covered by `mockResolvers`. If a story must render exact values (e.g. for visual regression tests), resolve every displayed field in `mockResolvers`, or use `generateFunction` for full control.
