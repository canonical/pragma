import { Link } from "@canonical/router-react";
import type { ReactElement } from "react";

export default function Navigation(): ReactElement {
  return (
    <nav aria-label="Main">
      <Link to="home">Home</Link>
    </nav>
  );
}
