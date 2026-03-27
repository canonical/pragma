import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import styles from "./styles.css";
import type CtaBlockProps from "./types.js";

const componentCssClassName = "ds cta-block";

/**
 * CTA block web component.
 * A flex container for action links. Accepts any combination of one, two, or
 * all three slots — empty slots generate no box in flex layout so partial
 * content works without any JavaScript or slot detection.
 *
 * Pair with `ds-button-link` for the appropriate visual variant:
 * - `primary` slot → `<ds-button-link variant="primary">`
 * - `secondary` slot → `<ds-button-link variant="secondary">`
 * - `link` slot → `<ds-button-link>` (default plain link)
 *
 * @slot primary - Primary (constructive) action, typically a `ds-button-link`.
 * @slot secondary - Secondary action, typically a `ds-button-link`.
 * @slot link - Plain text link action, typically a `ds-button-link`.
 *
 * @implements ds:global.component.cta-block
 */
@customElement("ds-cta-block")
export default class CtaBlock extends LitElement implements CtaBlockProps {
  static styles = styles;

  render() {
    return html`
      <div class="${componentCssClassName}">
        <slot name="primary"></slot>
        <slot name="secondary"></slot>
        <slot name="link"></slot>
      </div>
    `;
  }
}
