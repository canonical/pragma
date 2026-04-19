import { Link } from "@canonical/router-react";
import type { ReactElement } from "react";

export default function Navigation(): ReactElement {
  return (
    <nav aria-label="Main">
      <Link to="home">Home</Link>
      <Link params={{ slug: "router-core" }} to="guide">
        Guide
      </Link>
      <Link search={{ auth: "1" }} to="account">
        Demo sign-in
      </Link>
    </nav>
  );
}
