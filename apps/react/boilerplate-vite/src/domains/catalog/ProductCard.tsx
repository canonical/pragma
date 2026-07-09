import type { ReactElement } from "react";
import { graphql, useFragment } from "react-relay";
import type { ProductCard_product$key } from "#relay/__generated__/ProductCard_product.graphql.js";

// Data this card needs, colocated with the component. The parent query
// spreads the fragment, so the card can evolve its field selection without
// touching `ProductList`.
const productCardFragment = graphql`
  fragment ProductCard_product on Product {
    name
    tagline
    priceCents
    currency
    rating
    inStock
  }
`;

/** Formats a minor-unit price deterministically (fixed locale, real currency). */
const formatPrice = (priceCents: number, currency: string): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    priceCents / 100,
  );

export interface ProductCardProps {
  /** Fragment reference to the product this card renders. */
  readonly product: ProductCard_product$key;
}

/**
 * Renders one catalog product from a Relay fragment reference.
 */
export default function ProductCard({
  product,
}: ProductCardProps): ReactElement {
  const data = useFragment(productCardFragment, product);

  return (
    <article aria-label={data.name}>
      <h3>{data.name}</h3>
      <p>{data.tagline}</p>
      <p>
        <strong>{formatPrice(data.priceCents, data.currency)}</strong> · rated{" "}
        {data.rating.toFixed(1)} / 5 ·{" "}
        {data.inStock ? "in stock" : "out of stock"}
      </p>
    </article>
  );
}
