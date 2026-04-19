import { useHead } from "@canonical/react-head";
import { route } from "@canonical/router-core";
import type { ReactElement } from "react";

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

interface AccountSearch {
  readonly auth?: string;
}

const accountSearchSchema = {
  "~standard": {
    output: {} as AccountSearch,
    validate(value: unknown): AccountSearch {
      const record = value as Record<string, unknown>;

      return { auth: readString(record.auth) };
    },
  },
};

interface LoginSearch {
  readonly from?: string;
}

const loginSearchSchema = {
  "~standard": {
    output: {} as LoginSearch,
    validate(value: unknown): LoginSearch {
      const record = value as Record<string, unknown>;

      return { from: readString(record.from) };
    },
  },
};

function Account(): ReactElement {
  useHead({ title: "Account — Boilerplate" });

  return (
    <section aria-labelledby="account-title">
      <h1 id="account-title">Account</h1>
      <p>Protected account page. You are signed in.</p>
    </section>
  );
}

function Login({ from }: { from?: string }): ReactElement {
  useHead({ title: "Login — Boilerplate" });

  return (
    <section aria-labelledby="login-title">
      <h1 id="login-title">Login</h1>
      <p>
        Demo login. Add <code>?auth=1</code> to any protected URL to simulate
        authentication.
      </p>
      {from && <p>You will be redirected to {from} after login.</p>}
    </section>
  );
}

const accountRoutes = {
  account: route({
    url: "/account",
    search: accountSearchSchema,
    content: () => <Account />,
  }),
  login: route({
    url: "/login",
    search: loginSearchSchema,
    content: ({ search }) => <Login from={search.from} />,
  }),
} as const;

export default accountRoutes;
