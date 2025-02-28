/* @canonical/generator-ds 0.9.0-experimental.4 */
import { Temporal } from "@js-temporal/polyfill";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RelativeTimeProps } from "./types.js";

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
  updateLive = true,
}: RelativeTimeProps): React.ReactElement => {
  const [relativeTime, setRelativeTime] = useState("");
  const intervalRef = useRef<number>(null);

  // Convert the input time to a Temporal.Instant
  const getInstant = useCallback(() => {
    if (time instanceof Temporal.Instant) {
      return time;
    }
    if (time instanceof Date) {
      return Temporal.Instant.fromEpochMilliseconds(time.getTime());
    }
    try {
      return Temporal.Instant.from(time);
    } catch (e) {
      console.error(
        "Invalid time string (ISO string or Date object expected):",
        time
      );
      return null;
    }
  }, [time]);

  const calculateRelativeTime = useCallback(() => {
    const instant = getInstant();
    if (!instant) {
      return "Invalid date";
    }
    const now = Temporal.Now.instant();
    const deltaSeconds = instant.epochSeconds - now.epochSeconds;
    const absDeltaSeconds = Math.abs(deltaSeconds);

    if (absDeltaSeconds < nowThreshold) {
      return "now";
    }

    const timeZone = Temporal.Now.timeZoneId() || "UTC";
    const instantZDT = instant.toZonedDateTimeISO(timeZone);
    const nowZDT = now.toZonedDateTimeISO(timeZone);
    const diff = instantZDT.since(nowZDT, { largestUnit: "years" });

    const units = [
      "years",
      "months",
      "days",
      "hours",
      "minutes",
      "seconds",
    ] satisfies Intl.RelativeTimeFormatUnit[];

    let rtfUnit: Intl.RelativeTimeFormatUnit = "seconds";
    let rtfValue = 0;

    for (const unit of units) {
      const value = diff[unit];
      if (value !== 0) {
        rtfUnit = unit;
        rtfValue = value;
        break;
      }
    }

    if (rtfValue === 0) {
      return "now";
    }

    const formatter =
      relativeTimeFormat ||
      new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    return formatter.format(rtfValue, rtfUnit);
  }, []);

  const getOptimalUpdateInterval = useCallback(() => {
    const instant = getInstant();
    // no point in updating if the time is invalid
    if (!instant) return null;

    const now = Temporal.Now.instant();
    const duration = instant.since(now).total({ unit: "second" });

    if (duration < 60) return 1000; // 1 second for less than a minute ago
    if (duration < 3600) return 60000; // 1 minute for less than an hour ago
    if (duration < 86400) return 3600000; // 1 hour for less than a day ago
    return 86400000; // 1 day for anything older
  }, []);

  const updateTime = useCallback(() => {
    setRelativeTime(calculateRelativeTime());
  }, [calculateRelativeTime]);

  useEffect(() => {
    // initial calculation
    updateTime();

    if (!updateLive) return;

    const updateInterval = getOptimalUpdateInterval();
    if (!updateInterval) return;

    // SSR check
    if (typeof window === "undefined") return;

    intervalRef.current = window.setInterval(updateTime, updateInterval);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [updateLive, getOptimalUpdateInterval, updateTime]);

  return (
    <time
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      title={time.toLocaleString()}
      dateTime={time.toString()}
    >
      {relativeTime}
    </time>
  );
};

export default RelativeTime;
