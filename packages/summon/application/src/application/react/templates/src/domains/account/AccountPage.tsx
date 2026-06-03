import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function AccountPage(): ReactElement {
  useHead({ title: "Account — Boilerplate" });

  return (
    <section aria-labelledby="account-title">
      <h1 id="account-title">Account</h1>
      <p>Protected account page. You are signed in.</p>
    </section>
  );
}
