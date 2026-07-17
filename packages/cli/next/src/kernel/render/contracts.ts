/**
 * Layout contracts for the generic list and lookup renderers.
 *
 * These describe *how* a domain's data is projected to text — which columns a
 * list shows, which fields and sections a lookup renders — with no coupling to
 * store shapes, filters, or effects. Domain formatters (PR2+) build these
 * option bags and hand them to {@link renderers}.
 */

/** A single column in a list rendering. */
export interface ColumnDef<T> {
  readonly key: keyof T & string;
  readonly label: string;
  readonly format?: (value: unknown) => string;
  readonly showWhenEmpty?: boolean;
}

/** The kinds of section a lookup can render. */
export type SectionKind =
  | "field"
  | "code"
  | "list"
  | "table"
  | "nested-table"
  | "tree";

/** A single section in a lookup rendering. */
export interface SectionDef<T> {
  readonly key: keyof T & string;
  readonly heading: string;
  readonly kind: SectionKind;
  readonly showWhenEmpty?: boolean;
}

/** A single inline field rendered in a lookup heading block. */
export interface LookupField<T> {
  readonly label: string;
  readonly value: (entity: T) => unknown;
}

/** Per-mode override callbacks for a lookup section. */
export interface LookupSectionOverride<T> {
  readonly plain?: (entity: T, section: SectionDef<T>) => string | null;
  readonly llm?: (entity: T, section: SectionDef<T>) => string | null;
}

/** Options controlling the generic list renderer. */
export interface RenderListOptions<T> {
  readonly heading: string;
  readonly columns: readonly ColumnDef<T>[];
  readonly prefixes?: Readonly<Record<string, string>>;
}

/** Options controlling the generic lookup renderer. */
export interface RenderLookupOptions<T> {
  readonly title: (entity: T) => string;
  readonly fields: readonly LookupField<T>[];
  readonly sections: readonly SectionDef<T>[];
  readonly prefixes?: Readonly<Record<string, string>>;
  readonly sectionOverrides?: Partial<
    Record<keyof T & string, LookupSectionOverride<T>>
  >;
  readonly codeLanguage?: (section: SectionDef<T>, value: unknown) => string;
}
