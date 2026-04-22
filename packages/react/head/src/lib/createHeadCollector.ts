import type { HeadCollector, HeadLink, HeadMeta, HeadTags } from "./types.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function metaKey(meta: HeadMeta): string {
  if (meta.name) return `name:${meta.name}`;
  if (meta.property) return `property:${meta.property}`;
  if (meta.httpEquiv) return `http-equiv:${meta.httpEquiv}`;
  return `content:${meta.content}`;
}

/**
 * Create an SSR head collector.
 *
 * During server rendering, `useHead()` writes to this collector instead of the
 * DOM. After the render pass, call `toHtml()` to serialize the collected tags
 * for injection into the HTML template's `<head>` section.
 *
 * Tag merging: when multiple components declare the same tag (e.g., `<title>`),
 * the last writer wins — deepest component in the tree takes priority.
 */
export default function createHeadCollector(): HeadCollector {
  const entries = new Map<string, HeadTags>();

  return {
    add(id: string, tags: HeadTags) {
      entries.set(id, tags);
    },

    remove(id: string) {
      entries.delete(id);
    },

    toHtml(): string {
      const parts: string[] = [];
      let title: string | undefined;
      const metaByKey = new Map<string, HeadMeta>();
      const links: HeadLink[] = [];

      for (const tags of entries.values()) {
        if (tags.title !== undefined) {
          title = tags.title;
        }

        if (tags.meta) {
          for (const meta of tags.meta) {
            metaByKey.set(metaKey(meta), meta);
          }
        }

        if (tags.link) {
          for (const link of tags.link) {
            links.push(link);
          }
        }
      }

      if (title !== undefined) {
        parts.push(`<title>${escapeHtml(title)}</title>`);
      }

      for (const meta of metaByKey.values()) {
        const attrs: string[] = [];

        if (meta.name) attrs.push(`name="${escapeHtml(meta.name)}"`);
        if (meta.property)
          attrs.push(`property="${escapeHtml(meta.property)}"`);
        if (meta.httpEquiv)
          attrs.push(`http-equiv="${escapeHtml(meta.httpEquiv)}"`);
        attrs.push(`content="${escapeHtml(meta.content)}"`);
        parts.push(`<meta ${attrs.join(" ")} />`);
      }

      for (const link of links) {
        const attrs: string[] = [
          `rel="${escapeHtml(link.rel)}"`,
          `href="${escapeHtml(link.href)}"`,
        ];

        if (link.type) attrs.push(`type="${escapeHtml(link.type)}"`);
        if (link.sizes) attrs.push(`sizes="${escapeHtml(link.sizes)}"`);
        if (link.media) attrs.push(`media="${escapeHtml(link.media)}"`);
        if (link.crossOrigin)
          attrs.push(`crossorigin="${escapeHtml(link.crossOrigin)}"`);
        parts.push(`<link ${attrs.join(" ")} />`);
      }

      return parts.join("\n");
    },
  };
}
