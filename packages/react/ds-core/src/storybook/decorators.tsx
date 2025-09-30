import type { ElementType } from "react";

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
