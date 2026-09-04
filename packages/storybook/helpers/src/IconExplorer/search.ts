import MiniSearch, { type SearchResult } from "minisearch";
import type {
  IconExplorerMetadata,
  IconIndex,
  IconSearchResult,
  MatchReason,
} from "./types.js";

interface IconDocument {
  id: string;
  name: string;
  aliases: string;
  tags: string;
  description: string;
}

const FIELDS = ["name", "aliases", "tags", "description"] as const;

/**
 * Field weights. The name beats everything, then the legacy name someone typed
 * from memory, then synonyms, then prose.
 */
const BOOSTS = { name: 5, aliases: 4, tags: 2, description: 1 };

/**
 * Builds the search index over icon names, aliases, tags and descriptions.
 *
 * An exact name match is always pinned first; the rest are ordered by score,
 * then by shorter name, then alphabetically, so the same query always returns
 * the same order.
 */
export function createIconIndex<Name extends string>(
  icons: readonly Name[],
  metadata: Readonly<Record<Name, IconExplorerMetadata>>,
): IconIndex<Name> {
  const mini = new MiniSearch<IconDocument>({
    fields: [...FIELDS],
    storeFields: ["name"],
    searchOptions: { boost: BOOSTS, prefix: true, fuzzy: 0.2 },
  });

  mini.addAll(
    icons.map((name) => {
      const entry = metadata[name];
      return {
        id: name,
        // MiniSearch tokenises on punctuation, so "add-canvas" already indexes
        // as "add" and "canvas" and matches someone typing "add canvas".
        name,
        aliases: (entry?.aliases ?? []).join(" "),
        tags: (entry?.tags ?? []).join(" "),
        description: entry?.description ?? "",
      };
    }),
  );

  const known = new Set<string>(icons);

  return {
    search(query: string): IconSearchResult<Name>[] {
      const trimmed = query.trim();
      if (trimmed === "")
        return icons.map((name) => ({ name, reason: { kind: "name" } }));

      const ordered = [...mini.search(trimmed)].sort(compareResults);
      const exact = trimmed.toLowerCase();

      const out: IconSearchResult<Name>[] = [];
      const seen = new Set<string>();

      const push = (name: Name) => {
        if (seen.has(name)) return;
        seen.add(name);
        out.push({
          name,
          reason: resolveMatchReason(name, exact, metadata[name]),
        });
      };

      if (known.has(exact)) push(exact as Name);
      for (const result of ordered) push(result.id as Name);

      return out;
    },
  };
}

function compareResults(a: SearchResult, b: SearchResult): number {
  if (b.score !== a.score) return b.score - a.score;
  const nameA = a.id as string;
  const nameB = b.id as string;
  if (nameA.length !== nameB.length) return nameA.length - nameB.length;
  return nameA.localeCompare(nameB);
}

/**
 * Why this icon is in the list. Only worth showing when the icon's own name
 * does not contain what was typed — that is the case where a person needs to be
 * told "you searched trash, this one is called delete".
 */
function resolveMatchReason(
  name: string,
  query: string,
  entry: IconExplorerMetadata | undefined,
): MatchReason {
  const words = query.split(/[\s-]+/).filter(Boolean);
  const nameWords = name.split("-");
  const matchesName = words.some(
    (word) =>
      name.includes(word) || nameWords.some((part) => part.startsWith(word)),
  );
  if (matchesName || !entry) return { kind: "name" };

  const alias = (entry.aliases ?? []).find((candidate) =>
    words.some((word) => candidate.includes(word)),
  );
  if (alias) return { kind: "alias", term: alias };

  const tag = entry.tags.find((candidate) =>
    words.some((word) => candidate.includes(word)),
  );
  if (tag) return { kind: "tag", term: tag };

  const description = entry.description?.toLowerCase() ?? "";
  if (words.some((word) => description.includes(word)))
    return { kind: "description" };

  // MiniSearch matched on an edit-distance or prefix hit that plain containment
  // cannot see. Naming the field it most likely came from is more use to the
  // reader than claiming the name explains a match the name does not contain.
  const [firstAlias] = entry.aliases ?? [];
  if (firstAlias) return { kind: "alias", term: firstAlias };
  const [firstTag] = entry.tags;
  if (firstTag) return { kind: "tag", term: firstTag };

  return { kind: "name" };
}
