import type { RowRecord, SourceAdapter } from "@canonical/dataviews-core";
import { createArraySource, createSchema } from "@canonical/dataviews-core";

/**
 * Story fixtures for the machine collection. Story-only: this folder is
 * excluded from the package build, and the tests define their own minimal
 * fixtures inline.
 *
 * The stories drive a real `createArraySource` rather than a frozen page of
 * rows, so sorting, searching and paging in a story run the same path a
 * consumer's source runs. Hosts are `example.com` and people are `ex:*`
 * personas, as in the package's tests.
 */

/** One machine record, as a source would deliver it. */
type Machine = {
  readonly id: string;
  readonly name: string;
  readonly status: "running" | "failed" | "pending";
  readonly region: string;
  readonly cores: number;
  readonly owner: string;
  readonly note: string;
};

/** Twelve machines, every status represented; one story pages them by five. */
export const machines = [
  {
    id: "m-01",
    name: "alder.example.com",
    status: "running",
    region: "eu-west-1",
    cores: 4,
    owner: "ex:ana",
    note: "Nominal.",
  },
  {
    id: "m-02",
    name: "birch.example.com",
    status: "failed",
    region: "eu-west-1",
    cores: 8,
    owner: "ex:ben",
    note: "Commissioning stopped after the second reboot; the storage controller did not enumerate any of its attached disks.",
  },
  {
    id: "m-03",
    name: "cedar.example.com",
    status: "running",
    region: "us-east-2",
    cores: 16,
    owner: "ex:cai",
    note: "Nominal.",
  },
  {
    id: "m-04",
    name: "dogwood.example.com",
    status: "pending",
    region: "us-east-2",
    cores: 2,
    owner: "ex:dia",
    note: "Waiting on an address from the upstream pool.",
  },
  {
    id: "m-05",
    name: "elm.example.com",
    status: "running",
    region: "ap-south-1",
    cores: 32,
    owner: "ex:eze",
    note: "Nominal.",
  },
  {
    id: "m-06",
    name: "fir.example.com",
    status: "failed",
    region: "ap-south-1",
    cores: 4,
    owner: "ex:fay",
    note: "Power driver reported the outlet as off while the machine answered on the network.",
  },
  {
    id: "m-07",
    name: "gum.example.com",
    status: "running",
    region: "eu-west-1",
    cores: 8,
    owner: "ex:gil",
    note: "Nominal.",
  },
  {
    id: "m-08",
    name: "hazel.example.com",
    status: "pending",
    region: "us-east-2",
    cores: 16,
    owner: "ex:hen",
    note: "Queued behind two other deployments in the same rack.",
  },
  {
    id: "m-09",
    name: "ironwood.example.com",
    status: "running",
    region: "ap-south-1",
    cores: 64,
    owner: "ex:ivy",
    note: "Nominal.",
  },
  {
    id: "m-10",
    name: "juniper.example.com",
    status: "failed",
    region: "eu-west-1",
    cores: 2,
    owner: "ex:jun",
    note: "Disk self-test reported reallocated sectors on both attached drives.",
  },
  {
    id: "m-11",
    name: "karri.example.com",
    status: "running",
    region: "us-east-2",
    cores: 4,
    owner: "ex:kit",
    note: "Nominal.",
  },
  {
    id: "m-12",
    name: "larch.example.com",
    status: "pending",
    region: "ap-south-1",
    cores: 8,
    owner: "ex:lex",
    note: "Nominal.",
  },
] as const satisfies readonly Machine[];

/**
 * The collection's filterable schema. It names the fields a filter control
 * would edit; a column's ordering is declared by the source below, not here.
 */
export const machineSchema = createSchema([
  {
    field: "status",
    kind: "choices",
    options: ["running", "failed", "pending"],
  },
  { field: "cores", kind: "number", min: 1 },
]);

/** The schema's field definitions, for typing a provider over it. */
export type MachineFields = typeof machineSchema.fields;

/**
 * Every field the source can filter and order by. A source refuses a query
 * carrying a sort term it never declared, so a column offering a sort the
 * source cannot execute would offer a dead control.
 */
const sortableFields = ["name", "status", "region", "cores", "owner"] as const;

/** A field the source can order by — the only kind a story may sort. */
export type SortableField = (typeof sortableFields)[number];

/**
 * `count` machines for the windowed stories, made from the twelve above in
 * turn — their statuses, regions, owners and notes — each host numbered.
 */
export const manyMachines = (count: number): readonly RowRecord[] =>
  Array.from({ length: count }, (_, position) => ({
    ...machines[position % machines.length],
    id: `n-${position}`,
    name: `node-${String(position).padStart(5, "0")}.example.com`,
  }));

/** A local-array source over the machines, or over a caller's own rows. */
export const createMachineSource = (
  rows: readonly RowRecord[] = machines,
): SourceAdapter =>
  createArraySource({
    rows,
    fields: sortableFields,
    searchFields: ["name", "owner"],
  });

/**
 * A source that cannot filter or order by cores: its declaration leaves the
 * field out, so no part may offer it.
 */
export const createSourceWithoutCores = (): SourceAdapter =>
  createArraySource({
    rows: machines,
    fields: sortableFields.filter((field) => field !== "cores"),
    searchFields: ["name", "owner"],
  });

/** A source whose collection has nothing in it. */
export const createEmptySource = (): SourceAdapter => createMachineSource([]);

/**
 * A source that pages without counting, as many backends do: it declares no
 * total and publishes none, so nothing can offer a last page.
 */
export const createUncountedSource = (): SourceAdapter => {
  const source = createMachineSource();
  return {
    capabilities: { ...source.capabilities, count: "none" },
    execute: (request, deliver) =>
      source.execute(request, (result) => {
        deliver(
          result.status === "success" ? { ...result, count: null } : result,
        );
      }),
  };
};

/** A source that accepts a request and never answers it. */
export const createPendingSource = (): SourceAdapter => ({
  ...createMachineSource(),
  execute: () => () => undefined,
});

/** A source that fails every request: the inventory cannot be reached. */
export const createFailingSource = (): SourceAdapter => ({
  ...createMachineSource(),
  execute: (_request, deliver) => {
    deliver({
      status: "failure",
      reason: "The machine inventory could not be reached.",
    });
    return () => undefined;
  },
});
