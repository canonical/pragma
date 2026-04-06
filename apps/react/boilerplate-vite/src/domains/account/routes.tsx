import { route } from "@canonical/router-core";
import type { ReactElement } from "react";

interface LoginSearch {
  readonly from?: string;
}

interface AccountSearch {
  readonly auth?: string;
}

interface AccountData {
  readonly nextSteps: readonly string[];
  readonly team: string;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const loginSearchSchema = {
  "~standard": {
    output: {} as LoginSearch,
    validate(value: unknown): LoginSearch {
      const record = value as Record<string, unknown>;

      return {
        from: readString(record.from),
      };
    },
  },
};

const accountSearchSchema = {
  "~standard": {
    output: {} as AccountSearch,
    validate(value: unknown): AccountSearch {
      const record = value as Record<string, unknown>;

      return {
        auth: readString(record.auth),
      };
    },
  },
};

const accountRoutes = {
  account: route({
    url: "/account",
    fetch: async (): Promise<AccountData> => ({
      nextSteps: [
        "Review the prefetched guide data.",
        "Confirm the auth middleware redirected correctly.",
        "Use the same route map in React and future Lit bindings.",
      ],
      team: "Router adoption squad",
    }),
    search: accountSearchSchema,
    content: ({ data }: { data: AccountData }): ReactElement => {
      return (
        <section className="route-panel stack" aria-labelledby="account-title">
          <p className="eyebrow">Account domain</p>
          <h1 id="account-title">Protected account workspace</h1>
          <p className="lede">
            You reached the protected route after passing the demo auth
            middleware.
          </p>
          <div className="callout">
            <strong>Team:</strong> {data.team}
          </div>
          <ul className="feature-list">
            {data.nextSteps.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      );
    },
  }),
  login: route({
    url: "/login",
    search: loginSearchSchema,
    content: ({ search }: { search: LoginSearch }): ReactElement => {
      return (
        <section className="route-panel stack" aria-labelledby="login-title">
          <p className="eyebrow">Account domain</p>
          <h1 id="login-title">Sign in to the demo account</h1>
          <p className="lede">
            The local <strong>withAuth("/login")</strong> middleware redirected
            this protected request before the route rendered.
          </p>
          <div className="callout">
            <strong>Redirected from:</strong> {search.from ?? "direct visit"}
          </div>
          <p>
            Use the “Demo sign-in” link in the navigation to revisit the
            protected route with ?auth=1 applied.
          </p>
        </section>
      );
    },
  }),
} as const;

export default accountRoutes;
