import { useTranslation } from "@canonical/i18n-react";
import { Head } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function AccountPage(): ReactElement {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="account-title">
      <Head title={t("account.title")} />
      <h1 id="account-title">{t("account.heading")}</h1>
      <p>{t("account.body")}</p>
    </section>
  );
}
