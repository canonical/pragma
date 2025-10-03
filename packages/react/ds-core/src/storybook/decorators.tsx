import type { ElementType, ReactNode } from "react";

export const rtl = () => (Story: ElementType) => (
  <div dir="rtl">
    <Story />
  </div>
);

export const grid = () => (Story: ElementType) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "1em",
    }}
  >
    <Story />
  </div>
);

/**
 * Places the story before a `<main>` element.
 * @param id - The id of the main element
 * @param children - Content to be rendered inside the main element
 * @TODO this is the first decorator that seems like it may deserve a complex props object, and thus a separate Type.
 *      Should the type be declared separately? Should this be a separate file? Should the decorator be simplified somehow?
 */
export const beforeMain =
  ({ id = "main", children }: { id?: string; children?: ReactNode }) =>
  (Story: ElementType) => (
    <>
      <Story />
      <main id={id} tabIndex={-1}>
        {children}
      </main>
    </>
  );
