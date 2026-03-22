/** @module Test infrastructure: CLI subprocess runner, MCP test client, fixtures, and test store factory. */
export type { CommandResult } from "./cli.js";
export { runCommand } from "./cli.js";
export { default as createTestMcpClient } from "./createTestMcpClient.js";
export { DS_ALL_TTL, DS_ONTOLOGY_TTL, DS_TIERS_TTL } from "./dsFixtures.js";
export type { PragmaTestStoreOptions } from "./store.js";
export { createTestStore } from "./store.js";
export type { TestMcpClientResult } from "./types.js";
