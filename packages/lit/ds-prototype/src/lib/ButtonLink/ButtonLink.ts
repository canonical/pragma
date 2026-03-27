import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import styles from "./styles.css";
import type ButtonLinkProps from "./types.js";

const componentCssClassName = "ds button-link";

/**
 * Button link web component.
 * An anchor-based interactive element styled as a button or plain link.
 *
 * @slot - Label content for the link.
 *
 * @prop {string} href - URL the link points to.
 * @prop {"default"|"primary"|"secondary"} variant - Visual variant.
 *   `default` = plain underlined link, `primary` = constructive (green) button,
 *   `secondary` = default button (border, no fill). Defaults to `"default"`.
 * @prop {string} target - Equivalent to the native `target` attribute on `<a>`.
 * @prop {string} aria-label - Accessible label when slot content is not descriptive.
 *
 * @implements ds:global.component.button-link
 */
@customElement("ds-button-link")
export default class ButtonLink extends LitElement implements ButtonLinkProps {
  static styles = styles;

  @property({ type: String }) href = "";
  @property({ type: String }) variant: "default" | "primary" | "secondary" =
    "default";
  @property({ type: String }) target?: string;
  @property({ type: String, attribute: "aria-label" }) ariaLabel: string | null =
    null;

  render() {
    return html`
      <a
        class="${componentCssClassName} ${this.variant}"
        href="${this.href}"
        target="${ifDefined(this.target)}"
        aria-label="${ifDefined(this.ariaLabel ?? undefined)}"
      >
        <slot></slot>
      </a>
    `;
  }
}
