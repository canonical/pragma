/**
 * The brand marking an identity token: a symbol no other module holds, so a
 * forged key cannot pass for the brand.
 */
export const IDENTITY_BRAND: unique symbol = Symbol("DataViewsIdentity");
