#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ICONS_DIR = join(__dirname, "../", "icons");

// Icons that should not be standardized
const IGNORED_ICONS = new Set([
  "email",
  "facebook",
  "github",
  "github-dark",
  "instagram",
  "rss",
  "x",
  "x-dark",
  "youtube",
]);

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

  // Extract and preserve mask elements, clip-path elements, and clip-path attributes
  const preservedElements: Array<{
    placeholder: string;
    content: string;
  }> = [];

  // Mask elements
  content = content.replace(/<mask[^>]*>[\s\S]*?<\/mask>/gi, (match) => {
    const placeholder = `__PRESERVED_${preservedElements.length}__`;
    preservedElements.push({ placeholder, content: match });
    return placeholder;
  });

  // clipPath elements
  content = content.replace(
    /<clipPath[^>]*>[\s\S]*?<\/clipPath>/gi,
    (match) => {
      const placeholder = `__PRESERVED_${preservedElements.length}__`;
      preservedElements.push({ placeholder, content: match });
      return placeholder;
    },
  );

  // clip-path attributes
  content = content.replace(/clip-path\s*=\s*["'][^"']*["']/gi, (match) => {
    const placeholder = `__PRESERVED_${preservedElements.length}__`;
    preservedElements.push({ placeholder, content: match });
    return placeholder;
  });

  // Replace color fills with currentColor
  content = content
    // Only replace fill attributes that are not "none"
    .replace(/fill="(?!none")[^"]*"/g, 'fill="currentColor"');

  // Restore all preserved content
  preservedElements.forEach(({ placeholder, content: preservedContent }) => {
    content = content.replace(placeholder, preservedContent);
  });

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
    // Has <g> but no id - add id while preserving existing attributes
    newInnerContent = innerContent.replace(
      /<g([^>]*)>/i,
      (_, attributes) => `<g${attributes} id="${iconName}">`,
    );
  } else {
    // Already has <g> with id - replace only the id while preserving other attributes
    newInnerContent = innerContent.replace(
      /<g([^>]*?)id="[^"]*"([^>]*?)>/i,
      (_, beforeId, afterId) => `<g${beforeId}id="${iconName}"${afterId}>`,
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
  const svgFiles = readdirSync(ICONS_DIR)
    .filter((file: string) => file.endsWith(".svg"))
    .filter((file: string) => !IGNORED_ICONS.has(basename(file, ".svg")))
    .map((file: string) => join(ICONS_DIR, file));

  for (const svg of svgFiles) {
    console.log(`Processing ${svg}...`);
    standardizeSvg(svg);
  }

  console.log("Done standardizing icons!");
}

processAllIcons();
