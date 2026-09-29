import type { ReactElement } from "react";

/**
 * Story machinery for the Timeline (timestamp helper + stand-in content
 * shims for the composed blocks). Story-only; the event data sets live in
 * `./fixtures.tsx`.
 */

const day = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-09-16T12:00:00Z");

/** ISO timestamp `days` (plus `hours`) before the fixture "now". */
export const ago = (days: number, hours = 0): string =>
  new Date(NOW - days * day - hours * 60 * 60 * 1000).toISOString();

// ── Story-local content shims ───────────────────────────────────────────────

const textShimStyle = {
  padding: "var(--dimension-150) var(--dimension-200)",
  border:
    "var(--dimension-stroke-thickness-medium) dashed var(--color-border-muted)",
  color: "var(--color-text-muted)",
  fontSize: "var(--typography-text-secondary-font-size)",
} as const;

/** Stand-in for free-form description text. */
export const TextBlock = (): ReactElement => (
  <div style={textShimStyle}>Text</div>
);

const entityStyle = {
  display: "flex",
  alignItems: "center",
  gap: "var(--dimension-100)",
  padding: "var(--dimension-050) 0",
  fontSize: "var(--typography-text-secondary-font-size)",
  color: "var(--color-text)",
} as const;

/** Stand-in for a list of commit entities. */
export const EntityList = ({
  entries,
}: {
  entries: readonly { label: string; hash: string }[];
}): ReactElement => (
  <div>
    {entries.map((entry) => (
      <div key={entry.hash} style={entityStyle}>
        <span>{entry.label}</span>
        <a
          href="#commit"
          style={{ color: "var(--color-text-link)", fontWeight: 600 }}
        >
          {entry.hash}
        </a>
      </div>
    ))}
  </div>
);

/**
 * Figma "Comment in thread": avatar column, then the header, body, and
 * footer indented past it.
 */
export const CommentThread = ({
  author,
  action,
  body,
}: {
  author: string;
  action: string;
  body: string;
}): ReactElement => (
  <div
    style={{
      display: "flex",
      gap: "var(--dimension-100)",
      fontSize: "var(--typography-text-secondary-font-size)",
      color: "var(--color-text)",
    }}
  >
    <div>
      <div>
        <strong>{author}</strong> {action}{" "}
        <span style={{ color: "var(--color-text-muted)" }}>
          • edited 5 days ago
        </span>
      </div>
      <div
        style={{
          marginBlock: "var(--dimension-100)",
          color: "var(--color-text-muted)",
        }}
      >
        {body}
      </div>
      <div style={{ display: "flex", gap: "var(--dimension-100)" }}>
        <button
          type="button"
          style={{
            border: "1px solid var(--color-border-muted)",
            background: "var(--color-background)",
            padding: "0 var(--dimension-150)",
          }}
        >
          Resolve
        </button>
        <button
          type="button"
          style={{
            border: "1px solid var(--color-border-muted)",
            background: "var(--color-background)",
            padding: "0 var(--dimension-150)",
          }}
        >
          Comment
        </button>
      </div>
    </div>
  </div>
);

/** Stand-in for the markdown editor trailing the merge-proposal timeline. */
export const MarkdownEditor = (): ReactElement => (
  <div
    style={{
      border:
        "var(--dimension-stroke-thickness-medium) solid var(--color-border-muted)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--dimension-100)",
        padding: "var(--dimension-100) var(--dimension-200)",
        borderBottom:
          "var(--dimension-stroke-thickness-medium) solid var(--color-border-muted)",
        fontSize: "var(--typography-text-secondary-font-size)",
      }}
    >
      <input type="checkbox" id="preview" />
      <label htmlFor="preview">Preview</label>
    </div>
    <textarea
      placeholder="Add your comment here..."
      style={{
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        border: "none",
        padding: "var(--dimension-150) var(--dimension-200)",
      }}
    />
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "var(--dimension-100)",
        padding: "var(--dimension-100) var(--dimension-200)",
      }}
    >
      <button
        type="button"
        style={{
          border: "1px solid var(--color-border-muted)",
          background: "var(--color-background)",
          padding: "0 var(--dimension-150)",
        }}
      >
        Discard
      </button>
      <button
        type="button"
        style={{
          border: "1px solid var(--color-border-muted)",
          background: "var(--color-background)",
          padding: "0 var(--dimension-150)",
        }}
      >
        Comment
      </button>
    </div>
  </div>
);
