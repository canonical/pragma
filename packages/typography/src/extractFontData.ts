#!/usr/bin/env bun

import { readFileSync } from "node:fs";
// @ts-expect-error – no types for opentype by default
import * as opentype from "opentype.js";

const baselineHeight = 0.5;
let cssLineHeight = 1.2;

const fontPath = process.argv[2];
const showAll = process.argv.includes("--all");

if (!fontPath) {
  console.error(
    "Usage: calculate-nudges <path-to-font.ttf> [cssLineHeight] [--all]",
  );
  process.exit(1);
}

// Determine cssLineHeight only if --all is passed
if (showAll) {
  const cssLineHeightArg = process.argv[3];
  cssLineHeight = cssLineHeightArg ? Number(cssLineHeightArg) : cssLineHeight;
}

function extractFontData(
  fontPath: string,
  cssLineHeight: number,
  showAll: boolean,
): void {
  const fontBuffer = readFileSync(fontPath);
  const font = opentype.parse(fontBuffer.buffer);

  if (!font) {
    console.error("Could not parse the font.");
    process.exit(1);
  }

  // Destructure font metrics
  const { ascender, descender, unitsPerEm } = font;

  // Prepare metrics object for the table
  const metrics: Record<string, number> = {
    ascender,
    descender,
    unitsPerEm,
  };

  // If --all is provided, calculate additional metrics
  if (showAll) {
    const naturalLineHeight = ascender - descender;
    const lineHeightScale = naturalLineHeight / unitsPerEm;
    const ascenderScale = ascender / unitsPerEm;
    const baselinePos = (cssLineHeight - lineHeightScale) / 2 + ascenderScale;
    const topNudge = baselineHeight - (baselinePos % baselineHeight);

    metrics.cssLineHeight = cssLineHeight;
    metrics.naturalLineHeight = naturalLineHeight;
    metrics.lineHeightScale = lineHeightScale;
    metrics.ascenderScale = ascenderScale;
    metrics.baselinePos = baselinePos;
    metrics.topNudge = topNudge;
  }

  // Display CSS variables
  console.log(
    "Add the following variables to your CSS and follow the instructions in the README:",
  );
  console.log(`:root {
  --ascender: ${ascender};
  --descender: ${descender};
  --units-per-em: ${unitsPerEm};
}`);

  // Display table with all metrics if --all is provided
  if (showAll) {
    console.log("\nAll Metrics given a line height of", cssLineHeight);
    console.table(metrics);
  }
}

extractFontData(fontPath, cssLineHeight, showAll);
