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

  render() {
    return html`
      <div class="${componentCssClassName}">
        ${
          this.primary
            ? html`<ds-link href="${this.primary.attrs?.href ?? ""}" variant="primary"
              >${unsafeHTML(this.primary.content_html)}</ds-link
            >`
            : nothing
        }
        ${
          this.secondaries
            ? this.secondaries.map(
                (s) =>
                  html`<ds-link href="${s.attrs?.href ?? ""}" variant="secondary"
                  >${unsafeHTML(s.content_html)}</ds-link
                >`,
              )
            : nothing
        }
        ${
          this.link
            ? html`<ds-link href="${this.link.attrs?.href ?? ""}" variant="default"
              >${unsafeHTML(this.link.content_html)}</ds-link
            >`
            : nothing
        }
      </div>
    `;
  }
}
