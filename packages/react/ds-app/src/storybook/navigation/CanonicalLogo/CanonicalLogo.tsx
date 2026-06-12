import type React from "react";
import { CANONICAL_LOGO } from "./constants.js";
import type { CanonicalLogoProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds canonical-logo";

/**
 * Canonical logo placeholder for story brand slots: a portrait brand-orange
 * rectangle (`--color-background-logo`) that fills the start column and the full
 * header height (flush to the top, extending to the bottom), with the
 * circle-of-friends mark seated on the baseline grid inside it. A stand-in for
 * the real Canonical logo while app-shell rhythm is aligned.
 */
const CanonicalLogo = ({
  href = "/",
  className,
  ...props
}: CanonicalLogoProps): React.ReactElement => {
  return (
    <a
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      href={href}
      aria-label="Home"
      {...props}
    >
      <img src={CANONICAL_LOGO} alt="Canonical" className="mark" />
    </a>
  );
};

export default CanonicalLogo;
