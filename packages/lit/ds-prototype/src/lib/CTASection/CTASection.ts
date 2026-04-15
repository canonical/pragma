import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import styles from "./styles.css";
import type {
  Block,
  CTAContentBlock,
  CTALinksBlock,
  CTASectionProps,
  DescriptionBlock,
} from "./types.js";
import "../CTABlock/CTABlock.js";

const componentCssClassName = "ds cta-section";

/**
 * Checks whether a CTA block carries raw HTML content (used in default variant)
 * as opposed to structured link data.
 */
function isCTAContentBlock(block: Block): block is CTAContentBlock {
  return block.type === "cta" && "content" in block.item;
}

/**
 * Checks whether a CTA block carries structured link actions
 * (primary / secondaries / link).
 */
function isCTALinksBlock(block: Block): block is CTALinksBlock {
  return block.type === "cta" && !("content" in block.item);
}

/**
 * CTA section web component.
 * A full-width section pattern with a horizontal rule, heading, optional
 * description, and a call-to-action. Mirrors the Vanilla Framework
 * `vf_cta_section` macro.
 *
 * @prop {string} titleText - H2 heading text. Attribute: `title-text`.
 * @prop {"default"|"block"} variant - Visual variant. Default: `"default"`.
 * @prop {"100"|"25/75"} layout - Column layout. Default: `"100"`.
 * @prop {Block[]} blocks - Content blocks: description paragraphs and CTA actions.
 *
 * @implements ds:global.component.cta-section
 */
@customElement("ds-cta-section")
export default class CTASection extends LitElement implements CTASectionProps {
  static styles = styles;

  @property({ type: String, attribute: "title-text" }) titleText = "";
  @property({ type: String }) variant: "default" | "block" = "default";
  @property({ type: String }) layout: "100" | "25/75" = "100";
  @property({ type: Array }) blocks: Block[] = [];

  private _renderDescriptionBlock(block: DescriptionBlock) {
    if (block.item.type === "html") {
      return html`<div class="description">${unsafeHTML(block.item.content)}</div>`;
    }
    return html`<p class="description">${block.item.content}</p>`;
  }

  private _renderCTALinksBlock(block: CTALinksBlock) {
    return html`
      <ds-cta-block
        .primary=${block.item.primary}
        .secondaries=${block.item.secondaries}
        .link=${block.item.link}
      ></ds-cta-block>
    `;
  }

  private _renderBlock(block: Block) {
    if (block.type === "description") {
      return this._renderDescriptionBlock(block);
    }
    if (isCTALinksBlock(block)) {
      return this._renderCTALinksBlock(block);
    }
    return nothing;
  }

  private _renderDefaultVariant() {
    const ctaBlock = this.blocks.find(isCTAContentBlock);

    return html`
      <h2>
        ${this.titleText ? html`${this.titleText}<br />` : nothing}
        ${ctaBlock ? unsafeHTML(ctaBlock.item.content) : nothing}
      </h2>
    `;
  }

  private _renderBlockVariant() {
    return html`
      <h2>${this.titleText}</h2>
      ${this.blocks.map((block) => this._renderBlock(block))}
    `;
  }

  render() {
    const content =
      this.variant === "default"
        ? this._renderDefaultVariant()
        : this._renderBlockVariant();

    return html`
      <hr class="rule" />
      <section class="${componentCssClassName}">
        ${
          this.layout === "25/75"
            ? html`
              <div class="grid-row">
                <div class="offset-content">${content}</div>
              </div>
            `
            : html`<div class="fixed-width">${content}</div>`
        }
      </section>
    `;
  }
}
