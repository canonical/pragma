const locale = "en-US";

export const defaultDateTimeFormatter = new Intl.DateTimeFormat(locale, {
  dateStyle: "short",
  timeStyle: "short",
});
