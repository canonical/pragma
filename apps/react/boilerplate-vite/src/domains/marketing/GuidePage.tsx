import { useTranslation } from "@canonical/i18n-react";
import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function GuidePage({
  params,
}: {
  params: { slug: string };
}): ReactElement {
  const { t, locale } = useTranslation();
  // `locale` is a dependency: switching languages must retranslate the title.
  useHead({ title: t("guide.title", { slug: params.slug }) }, [
    params.slug,
    locale,
  ]);

  return (
    <section aria-labelledby="guide-title">
      <h1 id="guide-title">{params.slug}</h1>
      <p>{t("guide.body", { slug: params.slug })}</p>
    </section>
  );
}
