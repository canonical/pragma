import chalk from "chalk";

function formatHeading(text: string): string {
  return chalk.bold.underline(text);
}

function formatField(label: string, value: string): string {
  return `${chalk.dim(label)} ${value}`;
}

function formatList(items: string[], bullet = "-"): string {
  return items.map((item) => `  ${bullet} ${item}`).join("\n");
}

function formatSection(heading: string, body: string): string {
  return `${formatHeading(heading)}\n${body}`;
}

export { formatField, formatHeading, formatList, formatSection };
