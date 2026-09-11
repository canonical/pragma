import { useTranslation } from "@canonical/i18n-react";
import { Head } from "@canonical/react-head";
import type { ReactElement } from "react";

interface LoginSearch {
  readonly from?: string;
}

export default function LoginPage({
  search,
}: {
  search: LoginSearch;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="login-title">
      <Head title={t("login.title")} />
      <h1 id="login-title">{t("login.heading")}</h1>
      {/*
        The `?auth=1` literal is markup (<code>), which a plain message string
        cannot carry, so the sentence is catalogued as the fragments around it.
      */}
      <p>
        {t("login.hintBefore")} <code>?auth=1</code> {t("login.hintAfter")}
      </p>
      {search.from && <p>{t("login.redirect", { from: search.from })}</p>}
    </section>
  );
}
