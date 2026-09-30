import type { ComponentProps, ReactNode } from "react";

/**
 * The metadata the explorer needs about one icon. Structurally compatible with
 * `IconMetadata` from `@canonical/ds-assets`, restated here so the block works
 * for any icon set rather than only Canonical's — `categories` is a plain
 * string, so a caller's own closed list satisfies it.
 */
export interface IconExplorerMetadata {
  /** Lowercase words someone might search for, e.g. `"trash"` on `delete`. */
  readonly tags: readonly string[];

  /** The groups the icon belongs to, e.g. `["action"]`. */
  readonly categories: readonly string[];

  /** Names the icon was previously published under, e.g. `["unstarred"]`. */
  readonly aliases?: readonly string[];

  /** One line explaining what the icon depicts or means. */
  readonly description?: string;

  /** Present only while the icon is on its way out. */
  readonly deprecated?: {
    readonly replacedBy?: string;
    readonly since?: string;
  };
}

/** Why an icon is in the results, when its own name does not explain it. */
export type MatchReason =
  | { kind: "name" }
  | { kind: "alias"; term: string }
  | { kind: "tag"; term: string }
  | { kind: "description" };

/** One icon in the result list, with the reason it is there. */
export interface IconSearchResult<Name extends string = string> {
  name: Name;
  reason: MatchReason;
}

/** A built search index over one icon set. */
export interface IconIndex<Name extends string = string> {
  search: (query: string) => IconSearchResult<Name>[];
}

type OwnProps<Name extends string = string> = {
  /**
   * Metadata for the icons to show, keyed by icon name. The key type decides
   * what `renderIcon` and `snippet` receive, so a caller with a union of icon
   * names keeps that union all the way through.
   */
  metadata: Readonly<Record<Name, IconExplorerMetadata>>;

  /**
   * The icons to show, in the order they should appear.
   * Defaults to every key of `metadata`.
   */
  icons?: readonly Name[];

  /**
   * Renders one icon. The explorer sizes whatever it returns through the
   * `--icon-explorer-size` custom property.
   */
  renderIcon: (name: Name) => ReactNode;

  /** The code to copy for an icon, e.g. `<Icon icon="delete" />`. */
  snippet: (name: Name) => string;

  /** The import statement shown beside the snippet. */
  importLine?: string;

  /**
   * Where the raw SVG files are served from, used by Copy SVG and Download
   * SVG. Must be exposed so the block is not tied to one asset layout.
   */
  rootPath?: string;

  /** Search text to start with. */
  initialQuery?: string;

  /**
   * Heading above the explorer. Omit for no heading.
   *
   * This deliberately shadows the native `title` attribute: a tooltip over a
   * block this large is not useful, and a heading is what a docs page wants.
   */
  title?: string;
};

/** Props for the IconExplorer block, extending the native props of its `<section>` root. */
export type IconExplorerProps<Name extends string = string> = OwnProps<Name> &
  Omit<ComponentProps<"section">, keyof OwnProps<Name>>;
