import chalk from "chalk";
import { BOX, DOMAIN_COLORS } from "../../constants.js";
import { truncateText } from "../../helpers/index.js";

/**
 * Build a bordered card string for a single lookup result.
 *
 * Uses double-line box-drawing characters for the border. The title
 * renders in the domain's instance color. When a badge is present
 * (e.g., "[1 of 2]"), it appears right-aligned in the header.
 * Every body line is wrapped with `║` side borders.
 *
 * @param title - Card title for the header bar.
 * @param domain - Domain name for color lookup.
 * @param bodyLines - Pre-formatted body lines to wrap with borders.
 * @param termWidth - Terminal width in columns.
 * @param badge - Optional right-aligned badge text (e.g., "[1 of 2]").
 * @returns A fully bordered card as a single string.
 */
export default function buildCard(
  title: string,
  domain: string,
  bodyLines: readonly string[],
  termWidth: number,
  badge?: string,
): string {
  const innerWidth = Math.max(termWidth - 4, 20);
  const colors = DOMAIN_COLORS[domain];
  const colorFn = resolveChalkColor(colors?.instanceFg);

  const badgeText = badge ? ` ${badge}` : "";
  const maxTitleWidth = innerWidth - badgeText.length;
  const displayTitle = truncateText(title, maxTitleWidth);
  const titlePad = innerWidth - displayTitle.length - badgeText.length;

  const topBorder = `${BOX.topLeft}${BOX.horizontal.repeat(innerWidth + 2)}${BOX.topRight}`;
  const badgePart = badge ? chalk.dim(badgeText) : "";
  const titleLine = `${BOX.vertical} ${chalk.bold(colorFn(displayTitle))}${" ".repeat(Math.max(titlePad, 0))}${badgePart} ${BOX.vertical}`;
  const divider = `${BOX.dividerLeft}${BOX.dividerHorizontal.repeat(innerWidth + 2)}${BOX.dividerRight}`;
  const bottomBorder = `${BOX.bottomLeft}${BOX.horizontal.repeat(innerWidth + 2)}${BOX.bottomRight}`;

  const expandedLines = bodyLines.flatMap((line) => line.split("\n"));
  const borderedBody = expandedLines.map((line) => {
    const visibleWidth = stripAnsi(line).length;
    const pad = Math.max(innerWidth - visibleWidth, 0);
    return `${BOX.vertical} ${line}${" ".repeat(pad)} ${BOX.vertical}`;
  });

  return [topBorder, titleLine, divider, ...borderedBody, bottomBorder].join(
    "\n",
  );
}

function resolveChalkColor(
  colorName: string | undefined,
): (text: string) => string {
  if (!colorName) return (text) => text;
  const fn = chalk[colorName as keyof typeof chalk];
  return typeof fn === "function"
    ? (fn as (text: string) => string)
    : (text) => text;
}

/**
 * Strip ANSI escape codes from a string to measure visible width.
 */
function stripAnsi(text: string): string {
  return text.replace(
    // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escapes
    /\x1b\[[0-9;]*m/g,
    "",
  );
}
