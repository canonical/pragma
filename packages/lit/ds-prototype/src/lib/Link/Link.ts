import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import styles from "./styles.css";
import type { LinkProps } from "./types.js";

const componentCssClassName = "ds link";

/**
 * Link web component.
 * An anchor-based interactive element styled as a button or plain link.
 *
 * @slot - Label content for the link.
 *
 * @prop {string} href - URL the link points to.
 * @prop {"default"|"primary"|"secondary"} variant - Visual variant.
 *   `default` = plain underlined link, `primary` = constructive (green) button,
 *   `secondary` = default button (border, no fill). Defaults to `"default"`.
 * @prop {string} target - Equivalent to the native `target` attribute on `<a>`.
 * @prop {string} ariaLabel - Accessible label when slot content is not descriptive (attribute: `aria-label`).
 *
 * @implements ds:global.component.link
 */
@customElement("ds-link")
export default class Link extends LitElement implements LinkProps {
  static styles = styles;

  @property({ type: String }) href?: string;
  @property({ type: String }) variant: "default" | "primary" | "secondary" =
    "default";
  @property({ type: String }) target?: string;
  @property({ type: String, attribute: "aria-label" }) ariaLabel:
    | string
    | null = null;

  render() {
    const rel = this.target === "_blank" ? "noopener noreferrer" : undefined;

    return html`
      <a
        class="${componentCssClassName} ${this.variant}"
        href="${ifDefined(this.href)}"
        target="${ifDefined(this.target)}"
        rel="${ifDefined(rel)}"
        aria-label="${ifDefined(this.ariaLabel ?? undefined)}"
      >
        <slot></slot>
      </a>
    `;
  }
}
