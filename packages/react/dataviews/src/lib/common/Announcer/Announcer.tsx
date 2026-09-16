import {
  Fragment,
  memo,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { CLEAR_DELAY_MS, COALESCE_DELAY_MS } from "./constants.js";
import type { AnnouncerProps, AnnouncerTopic } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds data-views-announcer";

/** One announcement in the region: the messages spoken together, under their own key. */
type Announcement = {
  readonly key: number;
  readonly messages: readonly ReactNode[];
};

/** One message waiting to be spoken, and the topic it stands for, if any. */
type Waiting = {
  readonly message: ReactNode;
  readonly topic: AnnouncerTopic | undefined;
};

/**
 * One root's announcer: a polite live region, there before it speaks, drawing
 * nothing. It carries outcomes that have no place on screen to be read from —
 * a sort's new order, a column moved or hidden, a refusal no control shows —
 * and never what a status region already says in its own place.
 *
 * Messages said in the same moment are spoken as one announcement: the first
 * starts a short wait, and everything said before it ends is added to the
 * region together, as one new node. Within that moment the same words are
 * said once — the same string, that is; a message carrying elements is kept
 * as often as it is said, since two of those cannot be compared by what they
 * read as — and a message under a topic replaces what stood under it. Every
 * announcement is a new node, and a live region reads the nodes added to it,
 * so the same words said in two moments are read twice without altering
 * them. Each node leaves the region a while after it was spoken, which a
 * reader does not hear.
 *
 * It holds what it says itself, so speaking renders the region and nothing of
 * the root. Unmounting drops what is waiting and what is shown.
 *
 * @note Impure: schedules timers to speak and to clear, released on unmount.
 */
function Announcer({ ref }: AnnouncerProps): ReactElement {
  const [said, setSaid] = useState<readonly Announcement[]>([]);
  // What has been said since the wait began, not yet spoken.
  const waiting = useRef<Waiting[]>([]);
  const scheduled = useRef<Set<ReturnType<typeof setTimeout>> | null>(null);
  // Built on the first render that needs it: a set built every render would
  // be thrown away unread.
  scheduled.current ??= new Set<ReturnType<typeof setTimeout>>();
  const timers = scheduled.current;
  const nextKey = useRef(0);

  useEffect(() => {
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      timers.clear();
      waiting.current = [];
    };
  }, [timers]);

  /** Run `task` after `delay`, forgetting the timer once it has run. */
  const schedule = useCallback(
    (task: () => void, delay: number): void => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        task();
      }, delay);
      timers.add(timer);
    },
    [timers],
  );

  const speak = useCallback((): void => {
    const messages = waiting.current.map(({ message }) => message);
    waiting.current = [];
    const key = nextKey.current;
    nextKey.current += 1;
    setSaid((previous) => [...previous, { key, messages }]);
    schedule(() => {
      setSaid((previous) => previous.filter((shown) => shown.key !== key));
    }, CLEAR_DELAY_MS);
  }, [schedule]);

  const announce = useCallback(
    (message: ReactNode, topic?: AnnouncerTopic): void => {
      const queued = waiting.current;
      // A topic has one latest answer: what stood under it is replaced.
      const kept =
        topic === undefined
          ? queued
          : queued.filter((said) => said.topic !== topic);
      // The same words twice in one moment are the same announcement. Only
      // strings: a message carrying elements is two different nodes however
      // alike they read, so it is kept as often as it is said.
      const repeated =
        typeof message === "string" &&
        kept.some((waits) => waits.message === message);
      waiting.current = repeated ? kept : [...kept, { message, topic }];
      if (queued.length === 0) {
        schedule(speak, COALESCE_DELAY_MS);
      }
    },
    [schedule, speak],
  );
  useImperativeHandle(ref, () => ({ announce }), [announce]);

  return (
    <div
      className={componentCssClassName}
      aria-live="polite"
      aria-relevant="additions"
    >
      {said.map(({ key, messages }) => (
        <p key={key}>
          {messages.map((message, at) => (
            // Positional: an announcement's messages never move once spoken.
            // biome-ignore lint/suspicious/noArrayIndexKey: an announcement is never reordered
            <Fragment key={at}>
              {at === 0 ? null : " "}
              {message}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

export default memo(Announcer);
