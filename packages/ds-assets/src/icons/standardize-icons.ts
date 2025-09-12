#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Get the directory containing SVG icons
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ICONS_DIR = join(__dirname, "../../", "icons");

/**
 * Standardizes an SVG file to meet the following requirements:
 * 1. Each SVG has a viewBox of 16x16
 * 2. Each SVG has a <g> element with the icon name as id
 * 3. All fill colors are set to currentColor
 * @param filePath Path to the SVG file
 */
function standardizeSvg(filePath: string): void {
  const iconName = basename(filePath, ".svg");
  let content = readFileSync(filePath, "utf-8");

  content = content
    // Replace or add viewBox
    .replace(/viewBox="[^"]*"/g, 'viewBox="0 0 16 16"')
    // Replace specific color fills with currentColor
    .replace(/fill="#[A-Fa-f0-9]{6}"/g, 'fill="currentColor"')
    .replace(/fill="#[A-Fa-f0-9]{3}"/g, 'fill="currentColor"')
    .replace(/fill="black"/g, 'fill="currentColor"')
    .replace(/fill="white"/g, 'fill="currentColor"')
    .replace(/fill="rgb\([^)]+\)"/g, 'fill="currentColor"')
    // Remove fill="none"
    .replace(/fill="none"/g, "")
    // Remove background rect elements
    .replace(/<rect width="16" height="16" fill="white"\/>/g, "");

  // Ensure SVG is wrapped in a <g> element with the icon name as id
  if (!/<g.*>/i.test(content)) {
    // Extract the content between <svg> and </svg>
    const svgContentMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    const innerContent = svgContentMatch ? svgContentMatch[1].trim() : "";

    // Create new SVG with proper grouping
    content = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <g id="${iconName}">
    ${innerContent}
  </g>
</svg>`;
  }

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
