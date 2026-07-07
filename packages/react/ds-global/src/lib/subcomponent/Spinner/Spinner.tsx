import type { ReactElement } from "react";
import type { SpinnerProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds spinner";

/** An empty or whitespace-only label provides no accessible name. */
const hasAccessibleName = (value: string | undefined): boolean =>
  typeof value === "string" && value.trim() !== "";

/**
 * An indeterminate activity indicator: the `spinner` icon (the Canonical
 * "circle of friends") rotating continuously to signal that work is in
 * progress. Mirrors `Icon`'s rendering and accessibility model — decorative by
 * default, exposed as a named `img` when given an `aria-label`/`aria-labelledby`
 * — and adds the continuous rotation, which pauses under `prefers-reduced-motion`.
 *
 * The glyph is referenced from `@canonical/ds-assets` at runtime
 * (`${rootPath}/spinner.svg#spinner`, default `/icons`), not bundled — the
 * consuming app must serve those SVGs at that path, or the spinner renders
 * empty. If the app serves icons from a different location, pass `rootPath`
 * (per instance; there is no global default yet). See the package README
 * ("Icon assets").
 *
 * `import { Spinner } from "@canonical/react-ds-global";`
 *
 * @implements ds:global.subcomponent.spinner
 */
const Spinner = ({
  className,
  rootPath = "/icons",
  role,
  ...props
}: SpinnerProps): ReactElement => {
  // Decorative by default and hidden from assistive technology; providing an
  // accessible name (or an explicit role) exposes it as a named image instead.
  // An empty label counts as decorative, mirroring the `alt=""` convention.
  const isLabelled =
    hasAccessibleName(props["aria-label"]) ||
    hasAccessibleName(props["aria-labelledby"]);

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative spinners render aria-hidden="true"; labelled spinners render role="img" with an aria-label/aria-labelledby (computed at runtime)
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      role={role ?? (isLabelled ? "img" : undefined)}
      aria-hidden={isLabelled || role ? undefined : true}
      {...props}
    >
      <use href={`${rootPath}/spinner.svg#spinner`} />
    </svg>
  );
};

export default Spinner;
