import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function GuidePage({
  params,
}: {
  params: { slug: string };
}): ReactElement {
  useHead({ title: `${params.slug} — Guides` }, [params.slug]);

  return (
    <section aria-labelledby="guide-title">
      <h1 id="guide-title">{params.slug}</h1>
      <p>Guide content for {params.slug}.</p>
    </section>
  );
}
