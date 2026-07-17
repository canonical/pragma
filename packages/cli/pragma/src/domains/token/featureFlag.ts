/**
 * Feature flag for the token *read* surface (`token list`, `token lookup`,
 * `token sample` and their MCP twins `token_list`, `token_lookup`,
 * `token_sample`).
 *
 * Disabled until token data ships in the semantic packages: the current
 * `@canonical/design-system` data (bundled and `#main`) contains no token
 * instances, so every read command returned EMPTY_RESULTS while the docs
 * and LLM orientation advertised the surface. Flip this to `true` once the
 * ontology publishes token data — commands, MCP tools, and the LLM
 * orientation (tool catalog, command reference, decision trees) all key
 * off this single constant.
 *
 * `pragma tokens add-config` is unaffected: it scaffolds Terrazzo config
 * from package conventions and does not depend on store data.
 */
export const TOKEN_READ_SURFACE_ENABLED = false;
