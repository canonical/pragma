import type React from "react";
import type { ComponentProps } from "react";
import { useMemo } from "react";
import { withTooltip } from "../../../../component/Tooltip/index.js";
import type {
  DateTimeProps,
  DateTimeStaticOwnProps,
  DateTimeStaticProps,
  DateTimeToggleProps,
} from "./types.js";
import "./styles.css";

const componentCssClassName = "ds timeline-datetime";

type TimeContentProps = Omit<
  ComponentProps<"time">,
  "children" | "dateTime"
> & {
  display: React.ReactNode;
  iso: string;
};

const TimeContent = ({ display, iso, ...rest }: TimeContentProps) => (
  <time dateTime={iso} {...rest}>
    {display}
  </time>
);

/**
 * Timeline.DateTime subcomponent — when the event occurred. Hover shows the
 * alternate format; the toggleable variant switches the format for all
 * events on click.
 *
 * @implements ds:global.subcomponent.timeline-event
 */
const DateTime = (props: DateTimeProps): React.ReactElement => {
  const {
    iso,
    alternate,
    showTooltip = true,
    toggleable,
    className,
    children: display,
    ...rest
  } = props;
  const classes = [componentCssClassName, className].filter(Boolean).join(" ");
  const isToggle = toggleable === true;

  const Tipped = useMemo(
    () => withTooltip(TimeContent, alternate, { distance: "6px" }),
    [alternate],
  );

  if (isToggle) {
    const { onToggle, pressed, ...buttonRest } = rest as DateTimeToggleProps;
    const timeNode = showTooltip ? (
      <Tipped iso={iso} display={display} className="value" />
    ) : (
      <TimeContent iso={iso} display={display} className="value" />
    );
    return (
      <button
        type="button"
        {...buttonRest}
        className={classes}
        aria-pressed={pressed}
        onClick={onToggle}
      >
        {timeNode}
      </button>
    );
  }

  // The Event passes the toggle props unconditionally; they must not reach <time>.
  const {
    onToggle: _onToggle,
    pressed: _pressed,
    ...timeRest
  } = rest as DateTimeToggleProps;
  const timeProps = timeRest as Omit<
    DateTimeStaticProps,
    keyof DateTimeStaticOwnProps
  >;
  return showTooltip ? (
    <Tipped {...timeProps} iso={iso} display={display} className={classes} />
  ) : (
    <TimeContent
      {...timeProps}
      iso={iso}
      display={display}
      className={classes}
    />
  );
};

DateTime.displayName = "Timeline.DateTime";

export default DateTime;
