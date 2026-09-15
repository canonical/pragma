import { memo, type ReactElement, useImperativeHandle, useState } from "react";
import { REPEAT_MARK } from "./constants.js";
import describeColumnChange from "./describeColumnChange.js";
import type { AnnouncementProps, ColumnAnnouncement } from "./types.js";

const componentCssClassName = "ds data-table-announcement";

/**
 * What the table last said of a change to its columns: a polite live region,
 * there before it speaks, drawing nothing. A live region rather than a status
 * role, so it leaves the status row's announcement alone; what a change to
 * the columns did has no place on screen to be read from.
 *
 * It holds what it says itself, so saying something renders the region and
 * nothing of the table. Every other announcement ends in a no-break space:
 * the text a live region holds must change to be read again, so the same
 * words said twice are said twice.
 */
function Announcement({ ref }: AnnouncementProps): ReactElement {
  const [said, setSaid] = useState<{
    readonly subject: ColumnAnnouncement;
    readonly repeats: number;
  } | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      announce(subject) {
        setSaid((previous) => ({
          subject,
          repeats: (previous?.repeats ?? 0) + 1,
        }));
      },
    }),
    [],
  );
  return (
    <span
      className={componentCssClassName}
      aria-live="polite"
      aria-atomic="true"
    >
      {said === null ? null : (
        <>
          {describeColumnChange(said.subject)}
          {said.repeats % 2 === 0 ? REPEAT_MARK : ""}
        </>
      )}
    </span>
  );
}

export default memo(Announcement);
