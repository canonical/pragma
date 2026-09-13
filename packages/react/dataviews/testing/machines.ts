/**
 * The machine collection the component tests share: a record type, its
 * collection, the declaration a complete local source makes over it, and
 * a provider over a manual source the test answers by hand or at once.
 */

import {
  type Collection,
  createCollection,
  createDataViewsProvider,
  type DataViewsProvider,
  type DataViewsProviderConfig,
  declareCapabilities,
  type QueryLocation,
  type SourceCapabilities,
  type ViewStore,
} from "@canonical/dataviews-core";
import createManualSource from "./createManualSource.js";
import { COUNTED_EXACTLY, pageOf } from "./fixtures.js";
import type { ManualSource, ManualSourceConfig } from "./types.js";

/** One machine record, as a source would deliver it. */
export type Machine = {
  readonly id: string;
  readonly name: string;
  readonly status: "failed" | "running";
  readonly cores: number;
};

/** The machine collection every test mounts over. */
export const machines = createCollection({
  identify: (machine: Machine) => machine.id,
  fields: [
    { field: "name", kind: "text" },
    { field: "status", kind: "choices", options: ["failed", "running"] },
    { field: "cores", kind: "number", min: 0 },
  ],
});

/** The fields of the machine collection, for typed handles and providers. */
export type MachineFields = typeof machines.schema.fields;

/** One machine record of the given identity and name. */
export const machine = (
  id: string,
  name: string,
  status: Machine["status"] = "running",
  cores = 4,
): Machine => ({ id, name, status, cores });

/** What the fixture source declares: it filters, searches and orders by `name` alone. */
export const MACHINE_CAPABILITIES: SourceCapabilities = declareCapabilities(
  machines,
  {
    filter: { status: ["eq"], cores: ["gte", "lte"] },
    search: ["name"],
    sort: { fields: ["name"], terms: 1, tiebreak: "opaque" },
    counts: COUNTED_EXACTLY,
  },
);

/** How one test's machine provider is set up. */
export type MachineProviderConfig = Omit<
  ManualSourceConfig<Machine>,
  "capabilities"
> & {
  readonly capabilities?: SourceCapabilities | undefined;
  /** The rows every request is answered with at once; by hand when left out. */
  readonly rows?: readonly Machine[] | undefined;
  readonly location?: QueryLocation | undefined;
  readonly views?: ViewStore | undefined;
  readonly seed?: DataViewsProviderConfig<MachineFields, Machine>["seed"];
};

/** The provider every test drives, over the machine collection. */
export type MachineProvider = DataViewsProvider<MachineFields, Machine>;

/** A machine provider over a manual source, with the source to answer it. */
export type MachineFixture = {
  readonly provider: MachineProvider;
  readonly collection: Collection<MachineFields, Machine>;
  readonly source: ManualSource<Machine>;
};

/**
 * A provider over the machine collection and a manual source. Given `rows`,
 * every request is answered at once with them; otherwise the test delivers
 * through `source.latest().deliver(...)` after the component's effect has
 * observed the provider.
 */
export const createMachineProvider = ({
  rows,
  capabilities = MACHINE_CAPABILITIES,
  location,
  views,
  seed,
  ...rest
}: MachineProviderConfig = {}): MachineFixture => {
  const source = createManualSource<Machine>({
    ...rest,
    capabilities,
    ...(rows === undefined ? {} : { answer: () => pageOf(rows) }),
  });
  const provider = createDataViewsProvider({
    collection: machines,
    source: source.source,
    ...(location === undefined ? {} : { location }),
    ...(views === undefined ? {} : { views }),
    ...(seed === undefined ? {} : { seed }),
  });
  return { provider, collection: machines, source };
};
