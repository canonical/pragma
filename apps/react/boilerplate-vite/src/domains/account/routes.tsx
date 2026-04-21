import { route } from "@canonical/router-core";
import AccountPage from "./AccountPage.js";
import LoginPage from "./LoginPage.js";

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const accountSearchSchema = {
  "~standard": {
    output: {} as { readonly auth?: string },
    validate(value: unknown): { readonly auth?: string } {
      const record = value as Record<string, unknown>;

      return { auth: readString(record.auth) };
    },
  },
};

const loginSearchSchema = {
  "~standard": {
    output: {} as { readonly from?: string },
    validate(value: unknown): { readonly from?: string } {
      const record = value as Record<string, unknown>;

      return { from: readString(record.from) };
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
