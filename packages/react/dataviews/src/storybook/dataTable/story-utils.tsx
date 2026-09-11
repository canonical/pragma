import type {
  DataViewsProvider,
  ResultWindow,
  SourceAdapter,
} from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSourceBinding,
} from "@canonical/dataviews-core";
import type { Decorator } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import type { MachineFields } from "./fixtures.js";
import { createMachineSource, machineSchema } from "./fixtures.js";

/**
 * Story machinery for DataTable: the provider hook every story drives and the
 * decorators that frame it. Story-only; the records and sources live in
 * `./fixtures.ts`.
 */

/**
 * The provider every DataTable story drives. Its rows are the source's own
 * records: the binding's host contract is typed over `RowRecord`.
 */
export type MachineProvider = DataViewsProvider<MachineFields>;

/** How one story's collection is set up. Read once, when the story mounts. */
export type MachineProviderOptions = {
  /** The source the table reads; every machine by default. */
  readonly source?: () => SourceAdapter;
  /** The displayed window; the provider's default page otherwise. */
  readonly window?: ResultWindow;
  /** Commands issued once the source is bound: a sort, a search, a selection. */
  readonly prepare?: (provider: MachineProvider) => void;
};

/**
 * A provider bound to a real source, wired the way an application wires one.
 *
 * The provider is built once, in state. The binding subscribes to the
 * provider's result channel, so it is built in an effect and disposed by the
 * same effect: a render React throws away never leaves one listening, and
 * StrictMode's rehearsal unmount disposes a binding that the kept mount then
 * rebuilds.
 */
export function useMachineProvider({
  source = createMachineSource,
  window: resultWindow,
  prepare,
}: MachineProviderOptions = {}): MachineProvider {
  const [adapter] = useState(source);
  const [provider] = useState(() =>
    createDataViewsProvider<MachineFields>({
      schema: machineSchema,
      window: resultWindow,
      // The table offers a sort only where the source declares one.
      capabilities: adapter.capabilities,
    }),
  );
  const [setUp] = useState(() => prepare);
  useEffect(() => {
    const binding = createSourceBinding({ host: provider, adapter });
    setUp?.(provider);
    // Only a provider that has never been asked needs its first page: a
    // prepared query has already been answered, and a remount finds its
    // request still pending or already settled.
    const { pendingRequestId, result } = provider.result.get();
    if (pendingRequestId === null && result.status === "idle") {
      provider.refresh();
    }
    return binding.dispose;
  }, [provider, adapter, setUp]);
  return provider;
}

/**
 * Render the story inside the `.app` typography scope, which the table
 * assumes: primary text there takes the application sizes.
 */
export const withAppScope: Decorator = (Story) => (
  <div className="app">
    <Story />
  </div>
);

/** Render the story inside a frame of the given width, as a layout would. */
export const withFrame =
  (maxWidth: string): Decorator =>
  (Story) => (
    <div style={{ maxWidth }}>
      <Story />
    </div>
  );
