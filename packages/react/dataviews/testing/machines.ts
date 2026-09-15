/**
 * The machine collection the component tests share: a record type, its
 * collection, the declaration a complete local source makes over it, and
 * a provider over a manual source the test answers by hand or at once.
 */

import {
  type CapabilityDeclaration,
  type Collection,
  createCollection,
  createDataViewsProvider,
  type DataViewsProvider,
  type DataViewsProviderConfig,
  declareCapabilities,
  type PresentationStore,
  type QueryLocation,
  type SortTerm,
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

/** What every machine declaration shares: its filters, its search and its counts. */
const MACHINE_DECLARATION = {
  filter: { status: ["isAny"], cores: ["gte", "lte"] },
  search: ["name"],
  counts: COUNTED_EXACTLY,
} as const satisfies CapabilityDeclaration<MachineFields>;

/** What the fixture source declares: it filters, searches and orders by `name` alone. */
export const MACHINE_CAPABILITIES: SourceCapabilities = declareCapabilities(
  machines,
  {
    ...MACHINE_DECLARATION,
    sort: { fields: ["name"], terms: 1, tiebreak: "opaque" },
  },
);

/**
 * A declaration ordering by all three machine fields, with the given term
 * limit and default: what a header test sorts several columns over.
 */
export const declareMachineOrdering = (
  terms: number | null,
  defaultSort: readonly SortTerm[] = [],
): SourceCapabilities =>
  declareCapabilities(machines, {
    ...MACHINE_DECLARATION,
    sort: {
      fields: ["name", "status", "cores"],
      terms,
      tiebreak: "opaque",
      default: defaultSort,
    },
  });

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
  readonly presentation?: PresentationStore | undefined;
  readonly snapshot?: DataViewsProviderConfig<
    MachineFields,
    Machine
  >["snapshot"];
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
  presentation,
  snapshot,
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
    ...(presentation === undefined ? {} : { presentation }),
    ...(snapshot === undefined ? {} : { snapshot }),
  });
  return { provider, collection: machines, source };
};

/**
 * A fleet of `count` machines numbered from one, named `host-001` onward:
 * every third one failed, each with as many cores as its number, so an
 * ordering by cores is an ordering by number.
 */
export const buildFleet = (count: number): readonly Machine[] =>
  Array.from({ length: count }, (_unused, at) => {
    const number = String(at + 1).padStart(3, "0");
    return machine(
      `m-${number}`,
      `host-${number}`,
      (at + 1) % 3 === 0 ? "failed" : "running",
      at + 1,
    );
  });
