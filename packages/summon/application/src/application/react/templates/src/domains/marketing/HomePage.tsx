import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function HomePage(): ReactElement {
  useHead({ title: "Home — Boilerplate" });

  return (
    <section aria-labelledby="home-title">
      <h1 id="home-title">Home</h1>
      <p>Welcome to the pragma router boilerplate.</p>
    </section>
  );
}
