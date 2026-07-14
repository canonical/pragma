import { useTranslation } from "@canonical/i18n-react";
import { Link } from "@canonical/router-react";
import type { ReactElement } from "react";
import LocaleSelector from "../LocaleSelector/index.js";
import ThemeSelector from "../ThemeSelector/index.js";

export default function Navigation(): ReactElement {
  const { t } = useTranslation();

  return (
    <nav aria-label={t("nav.label")}>
      <Link to="home">{t("nav.home")}</Link>
      <Link params={{ slug: "router-core" }} to="guide">
        {t("nav.guide")}
      </Link>
      <Link to="catalog">{t("nav.catalog")}</Link>
      <Link to="contact">{t("nav.contact")}</Link>
      <Link search={{ auth: "1" }} to="account">
        {t("nav.signIn")}
      </Link>
      <ThemeSelector />
      <LocaleSelector />
    </nav>
  );
}
