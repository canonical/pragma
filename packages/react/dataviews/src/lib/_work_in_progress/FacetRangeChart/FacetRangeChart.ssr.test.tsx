/**
 * On the server the range is drawn from the facets of the page the server
 * renders, measured over the records matching the URL's query, with its
 * table beside it. A source that cannot answer within the call renders the
 * loading status and draws nothing.
 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createFacetedFleet,
  createFacetedManual,
} from "../../../../testing/createFacetedProviders.js";
import FacetRangeChart from "./FacetRangeChart.js";

describe("FacetRangeChart on the server", () => {
  it("draws the range and its table from the facets of the URL's query", () => {
    const provider = createFacetedFleet({ href: "/machines?status=failed" });
    provider.refresh();
    const markup = renderToString(
      <FacetRangeChart provider={provider} field="cores" label="Cores" />,
    );
    expect(markup).toContain('aria-label="Cores: a range chart from 3 to 12"');
    expect(markup).toContain('<th scope="row">Lowest</th><td>3</td>');
    expect(markup).toContain('<th scope="row">Highest</th><td>12</td>');
    expect(markup).not.toContain("Loading…");
  });

  it("renders the loading status when the source cannot answer within the call", () => {
    const { provider } = createFacetedManual();
    provider.refresh();
    const markup = renderToString(
      <FacetRangeChart provider={provider} field="cores" label="Cores" />,
    );
    expect(markup).toContain('data-status="pending"');
    expect(markup).not.toContain("<svg");
  });
});
