/**
 * Shared harness for the entity view's warm-store tests: the REAL
 * `ComponentEntityPage` under the real provider stack (Relay environment
 * seeded — or not — plus `HeadProvider`), so every section test exercises
 * the exact fragment fan-out production renders. No router: the entity view
 * renders no `Link`s in v1 (ruling R5 keeps relations chip-free).
 *
 * Lives in `__fixtures__` beside the captured record maps: imported by
 * tests, never collected as one.
 */

import { HeadProvider } from "@canonical/react-head";
import type { ReactElement } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { createEnvironment } from "#relay/environment.js";
import { ComponentEntityPage } from "../ComponentEntityPage/index.js";

/** The two captured exemplars' URIs. */
export const BUTTON_URI = "ds:global.component.button";
export const CARD_URI = "ds:global.component.card";

/**
 * The entity page at `uri` over an environment seeded with `records`
 * (`undefined` = cold store). The page owns its Suspense/ErrorBoundary, so
 * the harness adds none.
 */
export const entityPageAt = (
  uri: string,
  records: RecordMap | undefined,
  fetchFn: FetchFunction,
): ReactElement => (
  <HeadProvider>
    <RelayEnvironmentProvider
      environment={createEnvironment({ records, fetchFn })}
    >
      <ComponentEntityPage params={{ uri }} />
    </RelayEnvironmentProvider>
  </HeadProvider>
);
