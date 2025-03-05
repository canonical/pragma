/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { Temporal } from "@js-temporal/polyfill";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RelativeTimeProps } from "./types.js";
import {
  humanTimeFormatter,
  optimalUpdateInterval,
  parseInstant,
} from "./utils/index.js";

const componentCssClassName = "ds relative-time";

/**
 * The RelativeTime component displays timestamps in a human-readable relative format (like "2 hours ago" or "in 3 days").
 *
 * It features automatic live updates with interval optimization based on time distance, configurable "now" threshold,
 * and renders as proper semantic HTML using the <time> element. The component leverages the Temporal API for calculations and Intl.RelativeTimeFormat for localization.
 */
const RelativeTime = ({
  id,
  className,
  style,
  time,
  relativeTimeFormat,
  nowThreshold = 10,
  disableLiveUpdate = false,
  nowKeyword = "now",
  invalidDateKeyword = "invalid date",
}: RelativeTimeProps): React.ReactElement => {
  const [relativeTime, setRelativeTime] = useState("");
  const [localeTimeString, setLocaleTimeString] = useState("");
  const [stringTime, setStringTime] = useState("");

  const intervalRef = useRef<number>(null);
  const instantTime: Temporal.Instant | null = useMemo(() => {
    try {
      return parseInstant(time);
    } catch (error) {
      console.error(error);
      return null;
    }
  }, [time]);

  const updateRelativeTime = useCallback(() => {
    if (instantTime === null) {
      setRelativeTime(invalidDateKeyword);
      setLocaleTimeString("");
      setStringTime("");
      return null;
    }
    const timeFormatter =
      relativeTimeFormat ||
      new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    setRelativeTime(
      humanTimeFormatter(instantTime, {
        nowThreshold,
        nowKeyword,
        relativeTimeFormat: timeFormatter,
      }),
    );
    setLocaleTimeString(instantTime.toLocaleString());
    setStringTime(instantTime.toString());
  }, [
    instantTime,
    relativeTimeFormat,
    nowThreshold,
    nowKeyword,
    invalidDateKeyword,
  ]);

  useEffect(() => {
    // initial calculation
    updateRelativeTime();

    if (disableLiveUpdate || instantTime === null) return;

    const updateInterval = optimalUpdateInterval(instantTime);

    // SSR check
    if (typeof window === "undefined") return;

    intervalRef.current = window.setInterval(
      updateRelativeTime,
      updateInterval,
    );

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [instantTime, disableLiveUpdate, updateRelativeTime]);

  return (
    <time
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      title={localeTimeString}
      dateTime={stringTime}
    >
      {relativeTime}
    </time>
  );
};

export default RelativeTime;
