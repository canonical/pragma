import { type ReactElement, type ReactNode, useState } from "react";
// `react-relay`, `relay-runtime`, and `relay-test-utils` are CJS packages
// with member-expression exports that Node's `cjs-module-lexer` cannot
// detect, so these named imports fail under bare Node ESM. That is fine for
// this package: a Storybook addon is consumed through Storybook + Vite, and
// the `./preset` `viteFinal` pre-bundles `relay-test-utils` so the names
// resolve in the preview iframe.
import { RelayEnvironmentProvider } from "react-relay";
import type {
  GraphQLSingularResponse,
  OperationDescriptor,
} from "relay-runtime";
import {
  createMockEnvironment,
  type MockEnvironment,
  MockPayloadGenerator,
} from "relay-test-utils";
import type {
  Renderer,
  StoryContext,
  PartialStoryFn as StoryFunction,
} from "storybook/internal/types";
import { PARAM_KEY } from "../constants.js";
import type { RelayParameters } from "./types.js";

/**
 * Creates a mock Relay environment whose network resolves every operation
 * with the payload described by the story's `parameters.relay`.
 *
 * React components issue their Relay requests while rendering (e.g.
 * `useLazyLoadQuery` fetches when the hook runs), which happens only after
 * the decorator has returned its element tree — so the decorator cannot call
 * `resolveMostRecentOperation` up front; it must queue a resolver instead.
 * `relay-test-utils` consumes a queued resolver after a single operation, so
 * a resolver queued once would only cover the story's first query and leave
 * refetches, pagination, and mutations (e.g. from play functions) pending
 * forever. The queued resolver therefore re-arms itself after every
 * operation, resolving however many operations the story issues.
 */
const createStoryEnvironment = (
  parameters: RelayParameters,
): MockEnvironment => {
  const environment = createMockEnvironment();
  const { mockResolvers, generateFunction } = parameters;

  const resolveOperation = (
    operation: OperationDescriptor,
  ): GraphQLSingularResponse =>
    generateFunction
      ? generateFunction(operation, mockResolvers)
      : MockPayloadGenerator.generate(operation, mockResolvers);

  const armOperationResolver = (): void => {
    environment.mock.queueOperationResolver((operation) => {
      armOperationResolver();
      return resolveOperation(operation);
    });
  };
  armOperationResolver();

  return environment;
};

/**
 * Internal wrapper component that owns the mock environment's lifecycle.
 *
 * The environment is created lazily on mount and kept for the lifetime of
 * the mounted story: re-renders (e.g. Storybook controls changing args) keep
 * the same environment and store, while remounts (story switch, the remount
 * toolbar button) start from a fresh one. `parameters.relay` is read when the
 * environment is created; Storybook parameters are static per story.
 */
const MockRelayEnvironmentProvider = ({
  parameters,
  children,
}: {
  parameters: RelayParameters;
  children: ReactNode;
}): ReactElement => {
  const [environment] = useState(() => createStoryEnvironment(parameters));

  return (
    <RelayEnvironmentProvider environment={environment}>
      {children}
    </RelayEnvironmentProvider>
  );
};

/**
 * Storybook decorator that lets React stories using Relay hooks
 * (`useLazyLoadQuery`, `useFragment`, `usePaginationFragment`, ...) render
 * against a mock Relay environment.
 *
 * Reads `parameters.relay` from the story context. If absent, the story
 * passes through unchanged. If present, the story is wrapped in a
 * `RelayEnvironmentProvider` carrying a `relay-test-utils` mock environment
 * that automatically resolves every operation the story issues, using the
 * story's `mockResolvers` and/or `generateFunction`.
 */
export const withRelayEnvironment = (
  storyFn: StoryFunction<Renderer>,
  context: StoryContext<Renderer>,
): ReturnType<StoryFunction<Renderer>> => {
  const relayParameters = context.parameters?.[PARAM_KEY] as
    | RelayParameters
    | undefined;

  if (!relayParameters) {
    return storyFn();
  }

  return (
    <MockRelayEnvironmentProvider parameters={relayParameters}>
      {storyFn() as ReactNode}
    </MockRelayEnvironmentProvider>
  ) as ReturnType<StoryFunction<Renderer>>;
};
