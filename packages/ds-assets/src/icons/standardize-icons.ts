#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ICONS_DIR = join(__dirname, "../../", "icons");

/**
 * Standardizes an SVG file to meet the following requirements:
 * 1. Each SVG has a <g> element with the icon name as id
 * 2. All fill colors are set to currentColor
 *
 * Future considerations:
 * - Standardize viewBox to 16x16 (requires path scaling)
 * - Remove background rect elements
 *
 * @param filePath Path to the SVG file
 */
function standardizeSvg(filePath: string): void {
  const iconName = basename(filePath, ".svg");
  let content = readFileSync(filePath, "utf-8");

  content = content
    // Replace color fills with currentColor
    .replace(/fill="#[A-Fa-f0-9]{6}"/g, 'fill="currentColor"')
    .replace(/fill="#[A-Fa-f0-9]{3}"/g, 'fill="currentColor"')
    .replace(/fill="black"/g, 'fill="currentColor"')
    .replace(/fill="white"/g, 'fill="currentColor"')
    .replace(/fill="rgb\([^)]+\)"/g, 'fill="currentColor"')
    .replace(/fill="none"/g, "");

  // Extract the content between <svg> and </svg>
  const svgContentMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  const innerContent = svgContentMatch ? svgContentMatch[1].trim() : "";

  const svgAttributesMatch = content.match(/<svg([^>]*)>/i);
  let existingAttributes = svgAttributesMatch ? svgAttributesMatch[1] : "";

  const hasXmlns = /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(
    existingAttributes,
  );
  if (!hasXmlns) {
    existingAttributes += ' xmlns="http://www.w3.org/2000/svg"';
  }

  const hasGroupWithId = /<g[^>]*id="[^"]*"[^>]*>/i.test(content);

  let newInnerContent: string;
  if (!/<g.*>/i.test(content)) {
    // No <g> tag at all - wrap everything in a new <g>
    newInnerContent = `  <g id="${iconName}">
    ${innerContent}
  </g>`;
  } else if (!hasGroupWithId) {
    // Has <g> but no id - replace first <g> with one that has an id
    newInnerContent = innerContent.replace(
      /<g([^>]*)>/i,
      `<g id="${iconName}"$1>`,
    );
  } else {
    // Already has <g> with id - replace the id
    newInnerContent = innerContent.replace(
      /<g[^>]*id="[^"]*"[^>]*>/i,
      `<g id="${iconName}">`,
    );
  }

  content = `<?xml version="1.0" encoding="UTF-8"?>
<svg${existingAttributes}>
  ${newInnerContent}
</svg>`;

  writeFileSync(filePath, content, "utf-8");
}

/**
 * Process all SVG files in the icons directory
 */
function processAllIcons(): void {
  8;
  const svgFiles = readdirSync(ICONS_DIR)
    .filter((file: string) => file.endsWith(".svg"))
    .map((file: string) => join(ICONS_DIR, file));

  for (const svg of svgFiles) {
    // Skip if there's a corresponding -dark.svg file
    if (
      svg.endsWith("-dark.svg") ||
      existsSync(svg.replace(".svg", "-dark.svg"))
    ) {
      continue;
    }
    console.log(`Processing ${svg}...`);
    standardizeSvg(svg);
  }

  console.log("Done standardizing icons!");
}

processAllIcons();
