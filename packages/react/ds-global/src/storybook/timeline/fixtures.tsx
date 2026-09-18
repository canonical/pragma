import type { ReactElement } from "react";
import type { TimelineItem } from "../../lib/pattern/Timeline/types.js";
import { buildFilterOptions } from "../../lib/pattern/Timeline/utils/buildFilterOptions.js";

/**
 * Story fixtures for the Timeline pattern and its subcomponents. Story-only
 * (this folder is excluded from the package build); tests define their own
 * minimal fixtures inline. Mirrors the Figma references: the Launchpad
 * merge-proposal example and the anatomy/marker-combination sets. The
 * TextBlock/EntityList/CommentThread/MarkdownEditor exports are
 * story-local stand-ins for the composed blocks.
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

// ── DateTime formats ────────────────────────────────────────────────────────

const dateTimeLabels = new Map<string, string>([
  [ago(25, 0), "25 days ago"],
  [ago(20, 0), "20 days ago"],
  [ago(5, 0), "5 days ago"],
  [ago(0, 4), "4 hours ago"],
]);

/** Merge-proposal formats: relative labels with an absolute fallback. */
export const mergeProposalFormats = {
  formatAbsolute: (iso: string): string =>
    dateTimeLabels.get(iso) ??
    new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(Date.parse(iso)),
  formatRelative: (iso: string): string =>
    new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
      Date.parse(iso),
    ),
};

/** Anatomy formats: fixed placeholder labels. */
export const anatomyFormats = {
  formatAbsolute: () => "Date, time",
  formatRelative: () => "5 days ago",
};

// ── Markers ─────────────────────────────────────────────────────────────────

/** Alvarez Daniella monogram marker. */
export const AD = { initials: "AD" };
/** John Doe monogram marker. */
export const JD = { initials: "JD" };

// ── Items ───────────────────────────────────────────────────────────────────

/** The Launchpad merge-proposal event stream (with the 42 hidden updates). */
export const mergeProposalItems: TimelineItem[] = [
  {
    id: "commit-6392cf8",
    dateTime: ago(25),
    actorId: "alvarez",
    actorName: "Alvarez Daniella",
    eventType: "commit",
    eventLabel: "Commit",
    description: "added 1 commit",
    marker: { ...AD, size: "large" },
    customContent: (
      <EntityList
        entries={[
          {
            label:
              "Implementation of a new feature for Launchpad bug templates",
            hash: "6392cf8",
          },
        ]}
      />
    ),
  },
  {
    id: "edited-description",
    dateTime: ago(25),
    actorId: "alvarez",
    actorName: "Alvarez Daniella",
    eventType: "description",
    description: "edited the description",
    marker: { size: "small" },
    customContent: (
      <CommentThread
        author="Alvarez Daniella"
        action="Added a description on ...folder/FileName 7 days ago"
        body="Main updates New field 'content_templates', dict to contain all launchpad templates."
      />
    ),
  },
  {
    id: "changed-draft",
    dateTime: ago(25),
    actorId: "alvarez",
    actorName: "Alvarez Daniella",
    eventType: "status",
    eventLabel: "Status change",
    description: "changed this merge proposal to Draft",
    marker: { size: "small" },
    customContent: <TextBlock />,
  },
  {
    id: "changed-title",
    dateTime: ago(25),
    actorId: "alvarez",
    actorName: "Alvarez Daniella",
    eventType: "title",
    eventLabel: "Title change",
    description: "changed the title to Update IBugTarget for template",
    marker: { size: "small" },
    customContent: <TextBlock />,
  },
  {
    id: "john-description",
    dateTime: ago(20),
    actorId: "john",
    actorName: "John Santa Pietro di Doe",
    eventType: "description",
    description: "edited the description",
    marker: { ...JD, size: "large" },
    customContent: <TextBlock />,
  },
  {
    id: "john-title",
    dateTime: ago(20),
    actorId: "john",
    actorName: "John Santa Pietro di Doe",
    eventType: "title",
    description: "edited the title",
    marker: { size: "small" },
    customContent: <TextBlock />,
  },
  {
    id: "john-status",
    dateTime: ago(20),
    actorId: "john",
    actorName: "John Santa Pietro di Doe",
    eventType: "status",
    description: "changed status to “Ready for review”",
    marker: { ...JD, size: "medium" },
    customContent: <TextBlock />,
  },
  ...Array.from({ length: 42 }, (_, index): TimelineItem => {
    const dateTime = new Date(
      Date.parse(ago(20)) - (index + 1) * 3600 * 1000,
    ).toISOString();
    return {
      id: `hidden-${index}`,
      dateTime,
      actorId: "alvarez",
      actorName: "Alvarez Daniella",
      eventType: "update",
      eventLabel: "Update",
      description: "made an update to this merge proposal",
      marker: { size: "small" },
    };
  }),
  {
    id: "commits-98a0c9a",
    dateTime: ago(5),
    actorId: "alvarez",
    actorName: "Alvarez Daniella",
    eventType: "commit",
    description: "added 2 commits",
    marker: { ...AD, size: "large" },
    customContent: (
      <EntityList
        entries={[
          { label: "Fixed some small bugs.", hash: "98a0c9a" },
          {
            label:
              "Implementation of a new feature for Launchpad bug templates.",
            hash: "48acd6c",
          },
        ]}
      />
    ),
  },
  {
    id: "grummys-comment",
    dateTime: ago(5),
    actorId: "grummys",
    actorName: "grummys",
    eventType: "comment",
    eventLabel: "Comment",
    description: "commented on the proposal",
    marker: { size: "small" },
    customContent: (
      <CommentThread
        author="grummys"
        action="commented on ...folder/FileName 5 days ago"
        body="Good work! I don't have the time today to get into it more and do a deep review, but here it looks solid."
      />
    ),
  },
  {
    id: "commit-6392cf8-recent",
    dateTime: ago(0, 4),
    actorId: "alvarez",
    actorName: "Alvarez Daniella",
    eventType: "commit",
    description: "added 1 commit",
    marker: { ...AD, size: "large" },
    customContent: (
      <EntityList
        entries={[
          {
            label:
              "Implementation of a new feature for Launchpad bug templates",
            hash: "6392cf8",
          },
        ]}
      />
    ),
  },
];

/** Args for the merge-proposal Timeline story. */
export const mergeProposal = {
  items: mergeProposalItems,
  label: "Merge proposal history",
  expansion: { method: "middle" as const },
  dateTimeFormats: mergeProposalFormats,
  trailing: <MarkdownEditor />,
};

/** The anatomy reference: plain Name/description events. */
export const anatomyItems: TimelineItem[] = [
  {
    id: "1",
    dateTime: "2026-09-10T09:30:00Z",
    actorId: "jane",
    actorName: "Name",
    eventType: "comment",
    description: "description",
    marker: { initials: "NA", size: "large" },
    customContent: <TextBlock />,
  },
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `anatomy-${index}`,
    dateTime: `2026-09-1${index + 1}T10:00:00Z`,
    actorId: index % 2 === 0 ? "jane" : "john",
    actorName: index % 2 === 0 ? "Name" : "John Doe",
    eventType: index % 2 === 0 ? "comment" : "approval",
    description: "description",
    marker: { size: "small" as const },
  })),
  {
    id: "anatomy-last",
    dateTime: "2026-09-16T08:00:00Z",
    actorId: "jane",
    actorName: "Name",
    eventType: "approval",
    description: "description",
    marker: { initials: "NA", size: "large" },
  },
];

/** The marker-combination reference: large per actor run, medium per
 * type run, small for the rest. */
export const combinationItems: TimelineItem[] = [
  {
    id: "combo-1",
    dateTime: "2026-09-11T09:00:00Z",
    actorId: "jane",
    actorName: "Jane Doe",
    eventType: "comment",
    description: "opened the discussion",
    marker: { initials: "NA", size: "large" },
  },
  {
    id: "combo-2",
    dateTime: "2026-09-11T10:00:00Z",
    actorId: "jane",
    actorName: "Jane Doe",
    eventType: "comment",
    description: "replied to a comment",
    marker: { size: "small" },
  },
  {
    id: "combo-3",
    dateTime: "2026-09-12T11:00:00Z",
    actorId: "jane",
    actorName: "Jane Doe",
    eventType: "approval",
    description: "approved the change",
    marker: { size: "medium" },
  },
  {
    id: "combo-4",
    dateTime: "2026-09-12T12:00:00Z",
    actorId: "jane",
    actorName: "Jane Doe",
    eventType: "approval",
    description: "linked a related proposal",
    marker: { size: "small" },
  },
  {
    id: "combo-5",
    dateTime: "2026-09-13T09:00:00Z",
    actorId: "john",
    actorName: "John Doe",
    eventType: "deploy",
    description: "deployed to production",
    marker: { initials: "JD", size: "large" },
  },
  {
    id: "combo-6",
    dateTime: "2026-09-13T10:00:00Z",
    actorId: "john",
    actorName: "John Doe",
    eventType: "deploy",
    description: "rolled back the deployment",
    marker: { size: "medium" },
  },
];

// ── Filter options (for the Header subcomponent stories) ───────────────────

/** Actor filter options inferred from the merge-proposal items. */
export const actorFilterOptions = buildFilterOptions(
  mergeProposalItems,
  (item) => item.actorId,
  (item) => item.actorName,
);

/** Event filter options inferred from the merge-proposal items. */
export const eventFilterOptions = buildFilterOptions(
  mergeProposalItems,
  (item) => item.eventType,
  (item) => item.eventLabel,
);
