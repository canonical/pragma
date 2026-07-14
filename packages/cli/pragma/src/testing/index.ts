/** @module Test infrastructure: CLI subprocess runner, MCP test client, fixtures, and test store factory. */
export type { CommandResult } from "./cli.js";
export { runCommand } from "./cli.js";
export { default as createTestMcpClient } from "./createTestMcpClient.js";
export { DS_ALL_TTL, DS_ONTOLOGY_TTL, DS_TIERS_TTL } from "./dsFixtures.js";
export {
  EX_NAMESPACE,
  EX_PREFIX_ENTRY,
  GRAPHQL_CLEAN_TTL,
  GRAPHQL_ERROR_TTL,
  GRAPHQL_FATAL_TTL,
} from "./graphqlFixtures.js";
export {
  PARITY_GAPS,
  STANDARD_PACK_STORY,
} from "./standardParityFixtures.js";
export type { PragmaTestStoreOptions } from "./store.js";
export { createTestStore } from "./store.js";
export {
  RECIPE_NAMESPACE,
  RECIPE_PREFIXES,
  RECIPE_STORY,
  RECIPE_TTL,
} from "./storyFixtures.js";
export type { TestMcpClientResult } from "./types.js";
