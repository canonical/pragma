/**
 * The CLDR root collation with numeric ordering, so "item2" precedes
 * "item10" and every viewer of a shared link sees one order.
 *
 * Spelled `en`, not `und`: no runtime carries collation data under `und`,
 * so it would order by code point, while `en` carries no tailorings of its
 * own and is the root collation everywhere.
 */
export const ROOT_NUMERIC_COLLATION = "en-u-kn-true";
