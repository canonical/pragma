import {
  createArraySource,
  createDataViewsProvider,
  createMemoryLocation,
} from "@canonical/dataviews-core";
import createManualSource from "./createManualSource.js";
import {
  buildFleet,
  MACHINE_CAPABILITIES,
  type Machine,
  type MachineProvider,
  machines,
} from "./machines.js";
import type { ManualSource } from "./types.js";

/** The fields whose facets the chart tests ask for. */
const CHART_FACETS = ["status", "cores"] as const;

/** How a faceted fleet provider is set up. */
type FacetedFleetConfig = {
  /** How many machines the fleet holds; twelve by default. */
  readonly count?: number | undefined;
  /** The URL the provider stands on; none by default. */
  readonly href?: string | undefined;
  /** The query it starts on, as a snapshot carries it; none by default. */
  readonly query?: string | undefined;
  /** The fields it asks facets for; the status and the cores by default. */
  readonly facets?: readonly ("status" | "cores")[] | undefined;
};

/**
 * A provider over a fleet in the local array source, which counts and
 * measures every field it facets and answers within the call: what a chart
 * reads its facets from.
 */
export const createFacetedFleet = ({
  count = 12,
  href,
  query,
  facets = CHART_FACETS,
}: FacetedFleetConfig = {}): MachineProvider =>
  createDataViewsProvider({
    collection: machines,
    source: createArraySource({
      rows: buildFleet(count),
      collection: machines,
    }),
    facets,
    ...(href === undefined ? {} : { location: createMemoryLocation({ href }) }),
    ...(query === undefined ? {} : { snapshot: { query, presentation: {} } }),
  });

/**
 * A provider over a manual source that declares the status and cores facets,
 * and asks for both: a test answers each request by hand, with whatever
 * counts and ranges it needs.
 */
export const createFacetedManual = (): {
  readonly provider: MachineProvider;
  readonly source: ManualSource<Machine>;
} => {
  const source = createManualSource<Machine>({
    capabilities: { ...MACHINE_CAPABILITIES, facets: CHART_FACETS },
  });
  const provider = createDataViewsProvider({
    collection: machines,
    source: source.source,
    facets: CHART_FACETS,
  });
  return { provider, source };
};
