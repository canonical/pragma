import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

interface LoginSearch {
  readonly from?: string;
}

export default function LoginPage({
  search,
}: {
  search: LoginSearch;
}): ReactElement {
  useHead({ title: "Login — Boilerplate" });

  return (
    <section aria-labelledby="login-title">
      <h1 id="login-title">Login</h1>
      <p>
        Demo login. Add <code>?auth=1</code> to any protected URL to simulate
        authentication.
      </p>
      {search.from && (
        <p>You will be redirected to {search.from} after login.</p>
      )}
    </section>
  );
}
