/**
 * A static mount: a URL route prefix mapped to a filesystem directory.
 */
export interface StaticMount {
  /** URL prefix, always leading-slashed, e.g. `/assets`. The root mount `/`
   * serves a whole directory. */
  route: string;
  /** Absolute directory the route serves from. */
  dir: string;
}
