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

type MainDecoratorProps = {
  id?: string;
  children?: ReactNode;
};

/**
 * Wraps the story in a main element with the given id and before/after content.
 * @param id
 * @param beforeMain
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
