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
 * Props for the main decorator
 * @TODO this is the first decorator that seems like it may deserve a complex props object, and thus a separate Type.
 *  Should this be a separate file? Or should the decorator be simplified somehow?
 * */
type MainDecoratorProps = {
  id?: string;
  children?: ReactNode;
};

/**
 * Places the story before a `<main>` element.
 * @param id - The id of the main element
 * @param children - Content to be rendered inside the main element
 */
export const beforeMain =
  ({ id = "main", children }: MainDecoratorProps) =>
  (Story: ElementType) => (
    <>
      <Story />
      <main id={id} tabIndex={-1}>
        {children}
      </main>
    </>
  );
