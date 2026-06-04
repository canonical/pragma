import type {
  Renderer,
  StoryContext,
  PartialStoryFn as StoryFunction,
} from "storybook/internal/types";

/**
 * Wraps a story in a base `.surface` layer.
 *
 * Surface-channel tokens (e.g. `--surface-color-foreground-navigation-primary`)
 * only resolve when an ancestor carries the `.surface` class defined in the
 * `ds.surfaces` cascade layer. Outside an application shell — as in the
 * Storybook canvas — that ancestor is missing, so channel-based colours fall
 * back to their defaults. This decorator supplies the top-level surface so
 * those tokens resolve, and so nested `.surface` elements step down to
 * layer2/layer3 as designed.
 *
 * Opt-in: add it to a story or meta's `decorators` array.
 *
 * @example
 * const meta = {
 *   component: SideNavigation,
 *   decorators: [withBaseLayer],
 * } satisfies Meta<typeof SideNavigation>;
 */
export const withBaseLayer = (
  StoryFn: StoryFunction<Renderer>,
  _context: StoryContext<Renderer>,
) => (
  <div className="surface" style={{ height: "100%" }}>
    {StoryFn()}
  </div>
);
