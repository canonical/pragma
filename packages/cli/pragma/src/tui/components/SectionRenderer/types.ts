import type {
  RenderLookupOptions,
  SectionDef,
} from "../../../domains/shared/contracts.js";

export interface SectionRendererProps<T> {
  /** The section definition to render. */
  readonly section: SectionDef<T>;
  /** The entity data containing the section value. */
  readonly entity: T;
  /** Full lookup options (for code language inference and prefix map). */
  readonly options: RenderLookupOptions<T>;
  /** Domain name for coloring. */
  readonly domain: string;
}
