import { Link } from "@canonical/router-react";
import type { ReactElement } from "react";
import LocaleSelector from "../LocaleSelector/index.js";
import ThemeSelector from "../ThemeSelector/index.js";

export default function Navigation(): ReactElement {
  return (
    <nav aria-label="Main">
      <Link to="home">Home</Link>
      <Link params={{ slug: "router-core" }} to="guide">
        Guide
      </Link>
      <Link to="catalog">Catalog</Link>
      <Link to="contact">Contact</Link>
      <Link search={{ auth: "1" }} to="account">
        Demo sign-in
      </Link>
      <ThemeSelector />
      <LocaleSelector />
    </nav>
  );
}
