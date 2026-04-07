import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import styles from "./styles.css";
import type { CTABlockProps, LinkObject } from "./types.js";
import "../Link/Link.js";

const componentCssClassName = "ds cta-block";

/**
 * CTA block web component.
 * A flex container for action links. Renders a primary action, optional
 * secondary actions, and an optional plain link from structured data.
 *
 * @prop {LinkObject} primary - Primary (constructive) action link.
 * @prop {LinkObject[]} secondaries - Secondary action links.
 * @prop {LinkObject} link - Plain text link action.
 *
 * @implements ds:global.component.cta-block
 */
@customElement("ds-cta-block")
export default class CTABlock extends LitElement implements CTABlockProps {
  static styles = styles;

  @property({ type: Object }) primary?: LinkObject;
  @property({ type: Array }) secondaries?: LinkObject[];
  @property({ type: Object }) link?: LinkObject;

  private _renderLink(
    linkObj: LinkObject,
    variant: "default" | "primary" | "secondary",
  ) {
    return html`
      <ds-link href="${linkObj.attrs?.href ?? ""}" variant="${variant}"
        >${unsafeHTML(linkObj.content_html)}</ds-link
      >
    `;
  }

  render() {
    return html`
      <div class="${componentCssClassName}">
        ${this.primary ? this._renderLink(this.primary, "primary") : nothing}
        ${this.secondaries
          ? this.secondaries.map((s) => this._renderLink(s, "secondary"))
          : nothing}
        ${this.link ? this._renderLink(this.link, "default") : nothing}
      </div>
    `;
  }
}
