import type {
  GraphQLSingularResponse,
  OperationDescriptor,
} from "relay-runtime";
import type { MockResolvers } from "relay-test-utils";

/**
 * Shape of the `relay` key in a story's Storybook `parameters`.
 *
 * When present, the `withRelayEnvironment` decorator wraps the story in a
 * mock Relay environment and resolves every GraphQL operation the story
 * issues (initial queries, refetches, pagination, mutations) with the
 * configuration declared here. When absent, the decorator is a no-op.
 *
 * The created mock environment is deliberately not exposed back to the story
 * context: operations resolve automatically through the queued resolver, so
 * stories and play functions have no need to drive the mock network by hand.
 * Keeping the environment private keeps the `parameters.relay` contract to
 * the two options below.
 */
export interface RelayParameters<
  TResolvers extends MockResolvers = MockResolvers,
> {
  /**
   * Mock resolvers passed to `MockPayloadGenerator.generate()`. Keys are
   * GraphQL type names, values are factories returning field values for that
   * type. Fields without a resolver receive deterministic placeholder values.
   */
  mockResolvers?: TResolvers;

  /**
   * Full override for payload generation. When provided, it is called instead
   * of `MockPayloadGenerator.generate()` for every operation the story
   * issues, receiving the operation and the configured `mockResolvers`.
   */
  generateFunction?: (
    operation: OperationDescriptor,
    mockResolvers?: TResolvers | null,
  ) => GraphQLSingularResponse;
}
