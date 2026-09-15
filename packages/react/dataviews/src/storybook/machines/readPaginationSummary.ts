import { within } from "storybook/test";

/**
 * The pagination bar's result summary in a story's canvas. Found inside the
 * bar's navigation, since the filters hold status regions of their own.
 */
export default function readPaginationSummary(
  canvas: ReturnType<typeof within>,
): HTMLElement {
  return within(
    canvas.getByRole("navigation", { name: "Pagination" }),
  ).getByRole("status");
}
