import { useTranslation } from "@canonical/i18n-react";
import { Head } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function GuidePage({
  params,
}: {
  params: { slug: string };
}): ReactElement {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="guide-title">
      <Head title={params.slug} />
      <h1 id="guide-title">{params.slug}</h1>
      <p>{t("guide.body", { slug: params.slug })}</p>
    </section>
  );
}
