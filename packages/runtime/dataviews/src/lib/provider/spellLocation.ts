import type { Query } from "../query/index.js";
import type { Schema, SchemaFieldDefinition } from "../schema/index.js";
import { encodeQuery, VIEW_KEY } from "../wire/index.js";
import placeView from "./placeView.js";

/** Configuration of one location spelling: a query and the view open beside it. */
type LocationSpellingConfig = {
  /** The schema whose field addresses the query is spelled against. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  readonly query: Query;
  /** The saved view open beside the query, or null for none. */
  readonly view: string | null;
  /** The location's parameters, whose other members are kept. */
  readonly preserve: URLSearchParams;
};

/**
 * A query as a location spells it, with the saved view open beside it: the
 * view first, when one is open, then the location's other parameters in
 * their order, then the query canonically. The one spelling every write to
 * the location and every destination a control leads to share, so a link
 * never drops the open view a write keeps, nor keeps one a write dropped.
 *
 * Called on every publication by the controls spelling destinations, so a
 * spelling the encoder already produced whole — no view open and none
 * carried, or the view first and alone, as the location loop leaves it — is
 * returned as it is.
 */
export default function spellLocation(
  config: LocationSpellingConfig,
): URLSearchParams {
  const { schema, query, view, preserve } = config;
  const encoded = encodeQuery({
    schema,
    slice: query.slice,
    window: query.window,
    preserve,
  });
  if (view === null && !encoded.has(VIEW_KEY)) {
    return encoded;
  }
  const [[firstKey, firstValue] = []] = encoded;
  const leadsWithView =
    firstKey === VIEW_KEY &&
    firstValue === view &&
    encoded.getAll(VIEW_KEY).length === 1;
  if (leadsWithView) {
    return encoded;
  }
  return placeView(encoded, view);
}
