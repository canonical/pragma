export type WithoutChildren<T extends { children?: unknown }> = Omit<
  T,
  "children"
>;
