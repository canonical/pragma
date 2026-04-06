import { Link } from "@canonical/router-react";
import type { ReactElement } from "react";

export default function Navigation(): ReactElement {
  return (
    <header className="shell-header">
      <div className="brand stack-tight">
        <p className="eyebrow">React boilerplate</p>
        <h1 className="shell-title">Router-enabled Vite shell</h1>
        <p className="shell-copy">
          Hover a navigation link to prefetch route data before you click.
        </p>
      </div>
      <nav aria-label="Primary" className="shell-nav">
        <Link to="home">Home</Link>
        <Link params={{ slug: "router-core" }} to="guide">
          Guide
        </Link>
        <Link to="account">Protected account</Link>
        <Link search={{ auth: "1" }} to="account">
          Demo sign-in
        </Link>
      </nav>
    </header>
  );
}
