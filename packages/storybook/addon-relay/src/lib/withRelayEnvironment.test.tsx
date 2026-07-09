import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactElement, Suspense, useState } from "react";
import { useLazyLoadQuery } from "react-relay";
import type { ConcreteRequest, GraphQLSingularResponse } from "relay-runtime";
import type { MockResolvers } from "relay-test-utils";
import type {
  Renderer,
  StoryContext,
  PartialStoryFn as StoryFunction,
} from "storybook/internal/types";
import { describe, expect, it, vi } from "vitest";
import { withRelayEnvironment } from "./withRelayEnvironment.js";

const viewerField = {
  alias: null,
  args: null,
  concreteType: "User",
  kind: "LinkedField",
  name: "viewer",
  plural: false,
  selections: [
    {
      alias: null,
      args: null,
      kind: "ScalarField",
      name: "id",
      storageKey: null,
    },
    {
      alias: null,
      args: null,
      kind: "ScalarField",
      name: "name",
      storageKey: null,
    },
  ],
  storageKey: null,
};

/**
 * Hand-written relay-compiler artifact for:
 *
 * ```graphql
 * query WithRelayEnvironmentTestQuery {
 *   viewer {
 *     id
 *     name
 *   }
 * }
 * ```
 *
 * Written by hand — matching the `ConcreteRequest` structure relay-compiler
 * emits (shared selection constant, `fragment`/`operation`/`params` shape) —
 * instead of generated, so this test suite does not need a GraphQL schema,
 * a relay config, and a codegen step for a single two-field query.
 * `useLazyLoadQuery` and `MockPayloadGenerator` consume it exactly as they
 * would a generated artifact.
 */
const testQuery = {
  fragment: {
    argumentDefinitions: [],
    kind: "Fragment",
    metadata: null,
    name: "WithRelayEnvironmentTestQuery",
    selections: [viewerField],
    type: "Query",
    abstractKey: null,
  },
  kind: "Request",
  operation: {
    argumentDefinitions: [],
    kind: "Operation",
    name: "WithRelayEnvironmentTestQuery",
    selections: [viewerField],
  },
  params: {
    cacheID: "WithRelayEnvironmentTestQuery",
    id: null,
    metadata: {},
    name: "WithRelayEnvironmentTestQuery",
    operationKind: "query",
    text: "query WithRelayEnvironmentTestQuery {\n  viewer {\n    id\n    name\n  }\n}\n",
  },
} as unknown as ConcreteRequest;

interface WithRelayEnvironmentTestQuery {
  readonly variables: Record<string, never>;
  readonly response: {
    readonly viewer: {
      readonly id: string;
      readonly name: string;
    } | null;
  };
}

/** Story-like component fetching its own data at render time. */
const ViewerName = (): ReactElement => {
  const data = useLazyLoadQuery<WithRelayEnvironmentTestQuery>(testQuery, {});
  return <output>{data.viewer?.name}</output>;
};

/** Story-like component that issues a second network operation on demand. */
const RefetchableViewerName = (): ReactElement => {
  const [fetchKey, setFetchKey] = useState(0);
  const data = useLazyLoadQuery<WithRelayEnvironmentTestQuery>(
    testQuery,
    {},
    { fetchKey, fetchPolicy: "network-only" },
  );
  return (
    <div>
      <output>{data.viewer?.name}</output>
      <button type="button" onClick={() => setFetchKey((key) => key + 1)}>
        refetch
      </button>
    </div>
  );
};

/** Invokes the decorator the way Storybook would for a given story context. */
const decorateStory = (
  story: ReactElement,
  context: Record<string, unknown>,
): { storyFn: ReturnType<typeof vi.fn>; element: ReactElement } => {
  const storyFn = vi.fn(() => story);
  const element = withRelayEnvironment(
    storyFn as StoryFunction<Renderer>,
    context as unknown as StoryContext<Renderer>,
  );
  return { storyFn, element: element as ReactElement };
};

describe("withRelayEnvironment", () => {
  it("passes through unchanged when the context has no parameters", () => {
    const story = <output>plain story</output>;
    const { storyFn, element } = decorateStory(story, {});

    expect(storyFn).toHaveBeenCalledTimes(1);
    expect(element).toBe(story);
  });

  it("passes through unchanged when parameters have no relay key", () => {
    const story = <output>plain story</output>;
    const { storyFn, element } = decorateStory(story, {
      parameters: { backgrounds: { default: "light" } },
    });

    expect(storyFn).toHaveBeenCalledTimes(1);
    expect(element).toBe(story);
  });

  it("resolves a useLazyLoadQuery story with data from mockResolvers", async () => {
    const { element } = decorateStory(
      <Suspense fallback={<span>loading</span>}>
        <ViewerName />
      </Suspense>,
      {
        parameters: {
          relay: {
            mockResolvers: {
              User: () => ({ id: "user-1", name: "Ada Lovelace" }),
            },
          },
        },
      },
    );

    render(element);

    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
  });

  it("generates placeholder data when no mockResolvers are provided", async () => {
    const { element } = decorateStory(
      <Suspense fallback={<span>loading</span>}>
        <ViewerName />
      </Suspense>,
      { parameters: { relay: {} } },
    );

    render(element);

    // MockPayloadGenerator's default scalar payload for un-resolved fields
    expect(await screen.findByText(/mock-value-for-field/)).toBeTruthy();
  });

  it("resolves every operation a story issues, not only the first (refetch/pagination)", async () => {
    let operationCount = 0;
    const { element } = decorateStory(
      <Suspense fallback={<span>loading</span>}>
        <RefetchableViewerName />
      </Suspense>,
      {
        parameters: {
          relay: {
            mockResolvers: {
              User: () => {
                operationCount += 1;
                return {
                  id: `user-${operationCount}`,
                  name: `Viewer ${operationCount}`,
                };
              },
            },
          },
        },
      },
    );

    render(element);

    expect(await screen.findByText("Viewer 1")).toBeTruthy();
    expect(operationCount).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "refetch" }));

    // The second, story-triggered operation resolves through the re-armed
    // queued resolver — a single queued resolver would leave it pending.
    expect(await screen.findByText("Viewer 2")).toBeTruthy();
    expect(operationCount).toBe(2);
  });

  it("uses generateFunction instead of MockPayloadGenerator when provided", async () => {
    const mockResolvers = {
      User: () => ({ id: "resolver-id", name: "From Resolvers" }),
    };
    const generateFunction = vi.fn(
      (): GraphQLSingularResponse => ({
        data: { viewer: { id: "custom-id", name: "Custom Name" } },
      }),
    );

    const { element } = decorateStory(
      <Suspense fallback={<span>loading</span>}>
        <ViewerName />
      </Suspense>,
      { parameters: { relay: { mockResolvers, generateFunction } } },
    );

    render(element);

    expect(await screen.findByText("Custom Name")).toBeTruthy();
    expect(screen.queryByText("From Resolvers")).toBeNull();
    expect(generateFunction).toHaveBeenCalledWith(
      expect.objectContaining({ request: expect.anything() }),
      mockResolvers satisfies MockResolvers,
    );
  });

  it("keeps the same environment and data across story re-renders", async () => {
    let operationCount = 0;
    const parameters = {
      relay: {
        mockResolvers: {
          User: () => {
            operationCount += 1;
            return { id: "user-1", name: `Viewer ${operationCount}` };
          },
        },
      },
    };
    const story = (
      <Suspense fallback={<span>loading</span>}>
        <ViewerName />
      </Suspense>
    );

    const { element } = decorateStory(story, { parameters });
    const view = render(element);
    expect(await screen.findByText("Viewer 1")).toBeTruthy();

    // Storybook re-invokes the decorator on re-renders (e.g. args changes);
    // the mounted provider must keep its environment rather than refetch.
    const { element: rerendered } = decorateStory(story, { parameters });
    view.rerender(rerendered);

    expect(await screen.findByText("Viewer 1")).toBeTruthy();
    expect(operationCount).toBe(1);
  });
});
