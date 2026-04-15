import type { CTABlockProps } from "../CTABlock/types.js";

interface ContentItem {
  type?: "text" | "html";
  content: string;
}

export interface DescriptionBlock {
  type: "description";
  item: ContentItem;
}

/** CTA block with raw HTML content (used in default variant). */
export interface CTAContentBlock {
  type: "cta";
  item: ContentItem;
}

/** CTA block with structured link actions (used in block variant). */
export interface CTALinksBlock {
  type: "cta";
  item: CTABlockProps;
}

export type Block = DescriptionBlock | CTAContentBlock | CTALinksBlock;

export interface CTASectionProps {
  /** H2 heading text for the section. */
  titleText?: string;
  /**
   * Visual variant.
   * - `default`: Title and CTA link rendered inline inside an h2.
   * - `block`: Title, optional description, and a CTA block with action buttons.
   * @default "default"
   */
  variant?: "default" | "block";
  /**
   * Column layout.
   * - `100`: Full-width container.
   * - `25/75`: Content offset to the right two-thirds of the grid.
   * @default "100"
   */
  layout?: "100" | "25/75";
  /** Content blocks: description paragraphs and CTA actions. */
  blocks?: Block[];
}
