import { useFormatters, useTranslation } from "@canonical/i18n-react";
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

export interface ProductCardProps {
  /** Fragment reference to the product this card renders. */
  readonly product: ProductCard_product$key;
}

/**
 * Renders one catalog product from a Relay fragment reference.
 *
 * Price and rating go through `useFormatters` (memoized `Intl` instances
 * bound to the active locale), so "$125.00" becomes "125,00 $US" in French
 * without touching the data: the currency code stays whatever the product
 * says, only its presentation is localized. The name and tagline are data,
 * not chrome, and render untranslated.
 */
export default function ProductCard({
  product,
}: ProductCardProps): ReactElement {
  const data = useFragment(productCardFragment, product);
  const { t } = useTranslation();
  const formatters = useFormatters();

  return (
    <article aria-label={data.name}>
      <h3>{data.name}</h3>
      <p>{data.tagline}</p>
      <p>
        <strong>
          {formatters.currency(data.priceCents / 100, data.currency)}
        </strong>{" "}
        ·{" "}
        {t("catalog.rating", {
          rating: formatters.number(data.rating, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }),
        })}{" "}
        · {data.inStock ? t("catalog.inStock") : t("catalog.outOfStock")}
      </p>
    </article>
  );
}
