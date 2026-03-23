// TODO: Remove hardcoded locale when i18n implemented
const locale = "en-US";

export const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, {
  numeric: "auto",
  style: "long",
});

export const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
  dateStyle: "short",
  timeStyle: "short",
});
