/**
 * Public UI entry point for summon's interactive Ink experience.
 *
 * Exposes the same `App` the summon binary renders, plus a {@link renderApp}
 * helper that mounts it and resolves when the user finishes, so other CLIs
 * (e.g. pragma's `create`/`setup`) can reuse the exact prompt/preview/execute
 * flow instead of duplicating it.
 *
 * @module
 */

import { render } from "ink";
import { App, type AppProps } from "../components/App.js";

export type { AppProps, AppState } from "../components/App.js";
export { App } from "../components/App.js";

/**
 * Render the interactive generator UI and resolve when it exits.
 *
 * Mounts summon's Ink `App` (prompt sequence → preview/confirm → execution)
 * and awaits `waitUntilExit`, matching how the summon binary drives a run.
 *
 * @param props - The App props (generator, preview, answers, stamp, …).
 * @returns A promise that resolves once the UI has fully exited.
 * @note Impure — takes over the terminal via Ink and performs the run's effects.
 */
export async function renderApp(props: AppProps): Promise<void> {
  const { waitUntilExit } = render(<App {...props} />);
  await waitUntilExit();
}
