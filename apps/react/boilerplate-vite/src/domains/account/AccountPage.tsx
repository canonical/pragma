import { useTranslation } from "@canonical/i18n-react";
import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function AccountPage(): ReactElement {
  const { t } = useTranslation();
  useHead({ title: t("account.title") });

  return (
    <section aria-labelledby="account-title">
      <h1 id="account-title">{t("account.heading")}</h1>
      <p>{t("account.body")}</p>
    </section>
  );
}
