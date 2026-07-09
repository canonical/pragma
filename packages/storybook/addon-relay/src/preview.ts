import type { ProjectAnnotations, Renderer } from "storybook/internal/types";
import { withRelayEnvironment } from "./lib/withRelayEnvironment.js";

/**
 * Storybook preview annotations — registers the `withRelayEnvironment`
 * decorator globally, so adding this addon to the Storybook config is the
 * only setup consumers need.
 */
const preview: ProjectAnnotations<Renderer> = {
  decorators: [withRelayEnvironment],
};

export default preview;
