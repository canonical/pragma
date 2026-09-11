import { useHead } from "@canonical/react-head";
import type { ReactElement } from "react";

interface LensPlaceholderProps {
  /** The lens's name, as the rail shows it. */
  readonly title: string;
  /** What lands on this canvas when its views are built. */
  readonly lands: string;
  /** The P-track item that builds those views. */
  readonly builtBy: string;
}

/**
 * The honest minimal stub for a lens whose views are not built yet
 * (P-4.1 brief): a placeholder canvas section stating what lands here and
 * which P-item builds it. Everything outside this section — rail, strip,
 * footer — is the finished frame; only this plate is provisional.
 */
export default function LensPlaceholder({
  title,
  lands,
  builtBy,
}: LensPlaceholderProps): ReactElement {
  const headingId = `lens-${title.toLowerCase()}-title`;
  useHead({ title: `${title} — Pragma docs` }, [title]);

  return (
    <section aria-labelledby={headingId}>
      <h1 id={headingId}>{title}</h1>
      <p>{lands}</p>
      <p>
        This canvas is a placeholder: the frame around it is finished, the view
        lands with {builtBy}.
      </p>
    </section>
  );
}
