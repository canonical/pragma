/**
 * What `contains` means, as fixtures every executor runs: the local array
 * source, and each mock endpoint the stories stand in for. One table, so a
 * source cannot claim the operator and mean something else by it.
 *
 * The rule the cases pin: a string value holds the operand once both are
 * folded — normalised to NFC, lowercased without a locale, final sigma read
 * as sigma, and normalised to NFC again. The operand is literal — `%`, `_`,
 * `\` and `.` are characters to look for, never a pattern, which a backend
 * matching with `LIKE` must escape — and nothing is trimmed. A letter is
 * never expanded into another spelling of it, so `ß` holds no `ss`. A value
 * that is not a string, absent or null holds nothing.
 *
 * Evidence over this corpus only: passing it does not prove an executor
 * right for every string.
 */

import type { ContainsCase, ContainsRecord } from "./types.js";

/** The records every case looks through. */
export const CONTAINS_RECORDS: readonly ContainsRecord[] = [
  { id: "web-lower", name: "web-01.example.com" },
  { id: "web-upper", name: "WEB-02.EXAMPLE.COM" },
  { id: "api", name: "api.example.com" },
  { id: "percent", name: "50% full" },
  { id: "digits", name: "5050 full" },
  { id: "underscore", name: "disk_a" },
  { id: "any-character", name: "diskXa" },
  { id: "backslash", name: "back\\slash" },
  { id: "composed", name: "École" },
  { id: "decomposed", name: "école normale" },
  { id: "sharp-s", name: "Straße" },
  { id: "cjk", name: "日本語テキスト" },
  { id: "greek", name: "ΟΔΟΣΤΡΩΜΑ" },
  { id: "t-diaeresis", name: "T̈" },
  { id: "deseret", name: "\u{10400}" },
  { id: "padded", name: "  padded  " },
  { id: "empty", name: "" },
  { id: "number", name: 42 },
  { id: "null", name: null },
  { id: "absent" },
];

/** Every operand the table asks for, with what holds it. */
export const CONTAINS_CASES: readonly ContainsCase[] = [
  {
    operand: "web",
    matches: ["web-lower", "web-upper"],
    pins: "ASCII case folds",
  },
  {
    operand: "WEB-0",
    matches: ["web-lower", "web-upper"],
    pins: "an uppercase operand folds too",
  },
  {
    operand: "example.com",
    matches: ["web-lower", "web-upper", "api"],
    pins: "a substring anywhere in the value",
  },
  {
    operand: ".",
    matches: ["web-lower", "web-upper", "api"],
    pins: "a dot is a dot, never any character",
  },
  {
    operand: "50%",
    matches: ["percent"],
    pins: "a percent sign is literal, never a run of characters",
  },
  {
    operand: "%",
    matches: ["percent"],
    pins: "a lone percent sign matches only itself",
  },
  {
    operand: "k_a",
    matches: ["underscore"],
    pins: "an underscore is literal, never one character",
  },
  {
    operand: "\\",
    matches: ["backslash"],
    pins: "the escape character is literal",
  },
  {
    operand: "école",
    matches: ["composed", "decomposed"],
    pins: "non-ASCII case folds, composed or not",
  },
  {
    operand: "ÉCOLE",
    matches: ["composed", "decomposed"],
    pins: "a decomposed uppercase operand finds composed text",
  },
  {
    operand: "straße",
    matches: ["sharp-s"],
    pins: "a sharp s holds itself",
  },
  {
    operand: "strasse",
    matches: [],
    pins: "a letter is never expanded into another spelling",
  },
  {
    operand: "本語",
    matches: ["cjk"],
    pins: "text without case is matched exactly",
  },
  {
    operand: "ΟΔΟΣ",
    matches: ["greek"],
    pins: "a word ending in capital sigma is found inside a longer word",
  },
  {
    operand: "σ",
    matches: ["greek"],
    pins: "a capital sigma holds a lowercase sigma wherever it falls",
  },
  {
    operand: "ẗ",
    matches: ["t-diaeresis"],
    pins: "a lowercase letter composes where its uppercase could not",
  },
  {
    operand: "\u{10428}",
    matches: ["deseret"],
    pins: "case folds beyond the basic plane",
  },
  {
    operand: "  ",
    matches: ["padded"],
    pins: "spaces are looked for, never trimmed",
  },
  {
    operand: "42",
    matches: [],
    pins: "a number is not text, so holds none",
  },
  {
    operand: "null",
    matches: [],
    pins: "a null value holds nothing, not even its own spelling",
  },
  {
    operand: "undefined",
    matches: [],
    pins: "an absent value holds nothing, not even its own spelling",
  },
];
