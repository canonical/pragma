/**
 * The playground probe's query contract, lifted to the route level (P-2 D3):
 * the compiled `ComponentProbeQuery` operation and its exact variable values,
 * exported from one module so the route's server entry (`routes.ts` meta) and
 * the component (`ComponentProbe`) read the same operation and byte-identical
 * variables — after `ClientOnly` drops, the component's store read must match
 * the server-executed operation exactly.
 *
 * This module imports the GENERATED artifact rather than declaring a tag:
 * it sits on the server bricks' native import chain (via `appRoutes`), where
 * no Vite transform rewrites tags — an untransformed tag throws at module
 * evaluation. The tag itself lives next to the component (see
 * `ComponentProbe.tsx`) as relay-compiler's source of truth.
 */

import type { ComponentProbeQuery$variables } from "#relay/__generated__/ComponentProbeQuery.graphql.js";
import componentProbeQueryNode from "#relay/__generated__/ComponentProbeQuery.graphql.js";

/** The entity the probe renders — Button, the pilot's exemplar. */
export const PROBE_URI = "ds:global.component.button";

/** How many related entities each connection lists in the probe. */
export const RELATION_PAGE_SIZE = 12;

/** The compiled operation (full text under `params.text`, `id: null`). */
export { componentProbeQueryNode };

/**
 * The probe's variables — one builder, so the server-executed operation and
 * the component's store read use identical values.
 */
export const componentProbeVariables = (): ComponentProbeQuery$variables => ({
  uri: PROBE_URI,
  count: RELATION_PAGE_SIZE,
});
