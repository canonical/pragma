/**
 * Tests for child-process environment scrubbing: OIDC trusted-publishing
 * credentials (and anything token/secret-shaped) must never reach the
 * third-party processes this tooling spawns.
 */

import { afterEach, describe, expect, test } from "vitest";
import { scrubbedEnv, scrubProcessEnv } from "./env.js";

const TEST_KEYS = [
  "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
  "ACTIONS_ID_TOKEN_REQUEST_URL",
  "GITHUB_TOKEN",
  "NODE_AUTH_TOKEN",
  "npm_config__authToken",
  "MY_SERVICE_SECRET",
  "SOME_PASSWORD",
  "NPM_REGISTRY_URL",
  "CONSUMER_SMOKE_DIR",
];

afterEach(() => {
  for (const key of TEST_KEYS) delete process.env[key];
});

describe("scrubbedEnv", () => {
  test("drops OIDC trusted-publishing credentials and token-shaped vars", () => {
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = "oidc-token";
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL = "https://oidc.example";
    process.env.GITHUB_TOKEN = "ghs_x";
    process.env.NODE_AUTH_TOKEN = "npm_x";
    process.env.npm_config__authToken = "npm_y";
    process.env.MY_SERVICE_SECRET = "shh";
    process.env.SOME_PASSWORD = "hunter2";

    const env = scrubbedEnv();
    expect(env.ACTIONS_ID_TOKEN_REQUEST_TOKEN).toBeUndefined();
    expect(env.ACTIONS_ID_TOKEN_REQUEST_URL).toBeUndefined();
    expect(env.GITHUB_TOKEN).toBeUndefined();
    expect(env.NODE_AUTH_TOKEN).toBeUndefined();
    expect(env.npm_config__authToken).toBeUndefined();
    expect(env.MY_SERVICE_SECRET).toBeUndefined();
    expect(env.SOME_PASSWORD).toBeUndefined();
  });

  test("keeps benign vars (PATH, registry override, work dir) and applies overrides", () => {
    process.env.NPM_REGISTRY_URL = "https://registry.example";
    process.env.CONSUMER_SMOKE_DIR = "/tmp/smoke";

    const env = scrubbedEnv({ EXTRA: "1" });
    expect(env.PATH).toBe(process.env.PATH);
    expect(env.NPM_REGISTRY_URL).toBe("https://registry.example");
    expect(env.CONSUMER_SMOKE_DIR).toBe("/tmp/smoke");
    expect(env.EXTRA).toBe("1");
  });

  test("overrides win even when process.env is scrubbed", () => {
    const env = scrubbedEnv({ npm_config_loglevel: "error" });
    expect(env.npm_config_loglevel).toBe("error");
  });
});

describe("scrubProcessEnv", () => {
  test("removes sensitive vars from process.env itself and reports them", () => {
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = "oidc-token";
    process.env.NPM_REGISTRY_URL = "https://registry.example";

    const removed = scrubProcessEnv();
    expect(removed).toContain("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
    expect(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN).toBeUndefined();
    expect(process.env.NPM_REGISTRY_URL).toBe("https://registry.example");
  });
});
