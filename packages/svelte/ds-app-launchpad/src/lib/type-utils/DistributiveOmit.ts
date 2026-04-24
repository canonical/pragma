/**
 * A utility type that applies `Omit` to each member of a union type without collapsing the union.
 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
