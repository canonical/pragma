import { useCallback, useEffect, useMemo, useState } from "react";
import type { TimelineDateTimeFormatProps } from "../types.js";
import { formatRelative } from "../utils/formatRelative.js";

type DateTimeMode = "absolute" | "relative";

type FormattedDateTime = {
  /** Text in the active format. */
  display: string;
  /** Text in the alternate format (tooltip). */
  alternate: string;
};

type UseDateTimeFormatsResult = {
  mode: DateTimeMode;
  toggle: () => void;
  toggleable: boolean;
  tooltip: boolean;
  /** Format an ISO timestamp into display + alternate text. */
  format: (iso: string) => FormattedDateTime;
};

const ABSOLUTE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function defaultFormatAbsolute(iso: string, locale: string): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) {
    return "";
  }
  let formatter = ABSOLUTE_FORMATTERS.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    ABSOLUTE_FORMATTERS.set(locale, formatter);
  }
  return formatter.format(timestamp);
}

/**
 * DateTime format state for the Timeline: absolute by default, relative as
 * the secondary format; one shared mode for all events.
 */
export function useDateTimeFormats(
  config: TimelineDateTimeFormatProps | undefined,
): UseDateTimeFormatsResult {
  const {
    formatAbsolute,
    formatRelative: formatRelativeProp,
    toggleable = true,
    tooltip = true,
  } = config ?? {};
  const [mode, setMode] = useState<DateTimeMode>("absolute");
  // "en" until mounted: keeps the SSR hydration render clean.
  const [locale, setLocale] = useState("en");
  useEffect(() => {
    setLocale(navigator.language);
  }, []);

  const toggle = useCallback(() => {
    if (toggleable) {
      setMode((current) => (current === "absolute" ? "relative" : "absolute"));
    }
  }, [toggleable]);

  const absolute = useCallback(
    (iso: string) =>
      formatAbsolute
        ? formatAbsolute(iso, locale)
        : defaultFormatAbsolute(iso, locale),
    [formatAbsolute, locale],
  );

  const relative = useCallback(
    (iso: string) => {
      const now = Date.now();
      return formatRelativeProp
        ? formatRelativeProp(iso, now, locale)
        : formatRelative(iso, now, locale);
    },
    [formatRelativeProp, locale],
  );

  const format = useMemo(
    () =>
      (iso: string): FormattedDateTime => {
        if (mode === "relative") {
          const display = relative(iso);
          return {
            display: display || absolute(iso),
            alternate: absolute(iso),
          };
        }
        const display = absolute(iso);
        return {
          display,
          alternate: relative(iso) || display,
        };
      },
    [mode, absolute, relative],
  );

  return { mode, toggle, toggleable, tooltip, format };
}
