import { Head } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function GuidePage({
  params,
}: {
  params: { slug: string };
}): ReactElement {
  return (
    <section aria-labelledby="guide-title">
      <Head title={`${params.slug} — Guides`} />
      <h1 id="guide-title">{params.slug}</h1>
      <p>Guide content for {params.slug}.</p>
    </section>
  );
}
