import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import styles from "./styles.css";
import type CtaSectionProps from "./types.js";

const componentCssClassName = "ds cta-section";

/**
 * CTA section web component.
 * A full-width section pattern with a horizontal rule, heading, optional
 * description, and a call-to-action. Mirrors the Vanilla Framework
 * `vf_cta_section` macro.
 *
 * @slot cta - Call-to-action content. In `default` variant rendered inline
 *   inside the h2. In `block` variant rendered directly below the description —
 *   pair with `ds-cta-block` for the standard button row layout.
 * @slot description - Paragraph-style content displayed below the heading.
 *   Only used in the `block` variant.
 *
 * @prop {string} title-text - H2 heading text.
 * @prop {"default"|"block"} variant - Visual variant. Default: `"default"`.
 * @prop {"100"|"25-75"} layout - Column layout. Default: `"100"`.
 *
 * @implements ds:global.component.cta-section
 */
@customElement("ds-cta-section")
export default class CtaSection extends LitElement implements CtaSectionProps {
  static styles = styles;

  @property({ type: String, attribute: "title-text" }) titleText = "";
  @property({ type: String }) variant: "default" | "block" = "default";
  @property({ type: String }) layout: "100" | "25-75" = "100";

  render() {
    return html`
      <hr class="rule" />
      <section class="${componentCssClassName}">
        ${
          this.layout === "25-75"
            ? html`
              <div class="grid-row">
                <div class="offset-content">${this._renderVariant()}</div>
              </div>
            `
            : html`<div class="fixed-width">${this._renderVariant()}</div>`
        }
      </section>
    `;
  }

  private _renderVariant() {
    if (this.variant === "default") {
      return html`
        <h2>
          ${this.titleText ? html`${this.titleText}<br />` : nothing}
          <slot name="cta"></slot>
        </h2>
      `;
    }

    return html`
      <h2>${this.titleText}</h2>
      <slot name="description"></slot>
      <slot name="cta"></slot>
    `;
  }
}
