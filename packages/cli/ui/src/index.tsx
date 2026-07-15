/**
 * `@canonical/cli-ui` — the shared React Ink UI for Canonical CLIs.
 *
 * The interactive generator experience (prompt sequence → preview/confirm →
 * execution) lives here once and is rendered by both the `summon` binary and
 * `pragma create`/`setup`, so the two CLIs look and behave identically without
 * duplicating any components.
 *
 * Each component is documented by an anatomy-DSL Turtle sidecar under
 * `src/anatomy/*.ttl` (a `ds:Component` with a `ds:anatomyDsl` node tree),
 * mirroring how design-system components are described.
 *
 * @module
 */

import { render } from "ink";
import { App, type AppProps } from "./components/App.js";

export * from "./components/index.js";

/**
 * Render the interactive generator UI and resolve when it exits.
 *
 * Mounts the Ink `App` (prompt sequence → preview/confirm → execution) and
 * awaits `waitUntilExit`, matching how a CLI binary drives a run. This is the
 * single entry point a CLI needs to reuse the whole flow.
 *
 * @param props - The App props (generator, preview, answers, stamp, …).
 * @returns A promise that resolves once the UI has fully exited.
 * @note Impure — takes over the terminal via Ink and performs the run's effects.
 */
export async function renderApp(props: AppProps): Promise<void> {
  const { waitUntilExit } = render(<App {...props} />);
  await waitUntilExit();
}
