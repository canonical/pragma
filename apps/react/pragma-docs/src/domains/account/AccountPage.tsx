import { Head } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function AccountPage(): ReactElement {
  return (
    <section aria-labelledby="account-title">
      <Head title="Account" />
      <h1 id="account-title">Account</h1>
      <p>Protected account page. You are signed in.</p>
    </section>
  );
}
