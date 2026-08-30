import type { StandardSchemaV1 } from "@canonical/router-core";
import { route } from "@canonical/router-core";
import AccountPage from "./AccountPage.js";
import LoginPage from "./LoginPage.js";

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Standard Schema v1 search validators — the same interface Zod, Valibot,
 * and ArkType implement, so any of them can be dropped in here directly.
 */
const accountSearchSchema: StandardSchemaV1<
  Record<string, unknown>,
  { readonly auth?: string }
> = {
  "~standard": {
    version: 1,
    vendor: "boilerplate",
    validate(value) {
      const record = value as Record<string, unknown>;

      return { value: { auth: readString(record.auth) } };
    },
  },
};

const loginSearchSchema: StandardSchemaV1<
  Record<string, unknown>,
  { readonly from?: string }
> = {
  "~standard": {
    version: 1,
    vendor: "boilerplate",
    validate(value) {
      const record = value as Record<string, unknown>;

      return { value: { from: readString(record.from) } };
    },
  },
};

const routes = {
  account: route({
    url: "/account",
    search: accountSearchSchema,
    content: AccountPage,
  }),
  login: route({
    url: "/login",
    search: loginSearchSchema,
    content: LoginPage,
  }),
} as const;

export default routes;
