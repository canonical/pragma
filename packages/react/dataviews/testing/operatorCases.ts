/**
 * What each filter operator means, as fixtures every executor runs: the
 * local array source, and each mock endpoint the stories stand in for. One
 * table, so a source cannot claim an operator and mean something else by it.
 *
 * The rules the cases pin:
 *
 * - `contains` and `startsWith` look at a string value once it and the
 *   operand are folded — normalised to NFC, lowercased without a locale,
 *   final sigma read as sigma, and normalised to NFC again — for the operand
 *   anywhere in the value, or at its start. The operand is literal — `%`,
 *   `_`, `\` and `.` are characters to look for, never a pattern, which a
 *   backend matching with `LIKE` must escape — and nothing is trimmed. A
 *   letter is never expanded into another spelling of it, so `ß` holds no
 *   `ss`, and an accented letter is not its base letter.
 * - `isAny` holds a choice value — a string or a number — that is one of
 *   the operands; `isNone` one that is none of them, a value the options do
 *   not list included.
 * - No operator matches a value that is absent, null or of another type.
 *
 * Evidence over this corpus only: passing it does not prove an executor
 * right for every value.
 */

import type { OperatorCase, OperatorRecord } from "./types.js";

/** The records every case looks through. */
export const OPERATOR_RECORDS: readonly OperatorRecord[] = [
  { id: "web-lower", name: "web-01.example.com", status: "running" },
  { id: "web-upper", name: "WEB-02.EXAMPLE.COM", status: "failed" },
  { id: "api", name: "api.example.com", status: "pending" },
  { id: "percent", name: "50% full", status: "decommissioned" },
  { id: "digits", name: "5050 full", status: 42 },
  { id: "underscore", name: "disk_a", status: null },
  { id: "any-character", name: "diskXa", status: true },
  { id: "backslash", name: "back\\slash", status: "failed" },
  { id: "composed", name: "École" },
  { id: "decomposed", name: "école normale" },
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
export const OPERATOR_CASES: readonly OperatorCase[] = [
  {
    operator: "contains",
    operands: ["web"],
    matches: ["web-lower", "web-upper"],
    pins: "ASCII case folds",
  },
  {
    operator: "contains",
    operands: ["WEB-0"],
    matches: ["web-lower", "web-upper"],
    pins: "an uppercase operand folds too",
  },
  {
    operator: "contains",
    operands: ["example.com"],
    matches: ["web-lower", "web-upper", "api"],
    pins: "a substring anywhere in the value",
  },
  {
    operator: "contains",
    operands: ["."],
    matches: ["web-lower", "web-upper", "api"],
    pins: "a dot is a dot, never any character",
  },
  {
    operator: "contains",
    operands: ["50%"],
    matches: ["percent"],
    pins: "a percent sign is literal, never a run of characters",
  },
  {
    operator: "contains",
    operands: ["%"],
    matches: ["percent"],
    pins: "a lone percent sign matches only itself",
  },
  {
    operator: "contains",
    operands: ["k_a"],
    matches: ["underscore"],
    pins: "an underscore is literal, never one character",
  },
  {
    operator: "contains",
    operands: ["\\"],
    matches: ["backslash"],
    pins: "the escape character is literal",
  },
  {
    operator: "contains",
    operands: ["école"],
    matches: ["composed", "decomposed"],
    pins: "non-ASCII case folds, composed or not",
  },
  {
    operator: "contains",
    operands: ["ÉCOLE"],
    matches: ["composed", "decomposed"],
    pins: "a decomposed uppercase operand finds composed text",
  },
  {
    operator: "contains",
    operands: ["straße"],
    matches: ["sharp-s"],
    pins: "a sharp s holds itself",
  },
  {
    operator: "contains",
    operands: ["strasse"],
    matches: [],
    pins: "a letter is never expanded into another spelling",
  },
  {
    operator: "contains",
    operands: ["本語"],
    matches: ["cjk"],
    pins: "text without case is matched exactly",
  },
  {
    operator: "contains",
    operands: ["ΟΔΟΣ"],
    matches: ["greek"],
    pins: "a word ending in capital sigma is found inside a longer word",
  },
  {
    operator: "contains",
    operands: ["σ"],
    matches: ["greek"],
    pins: "a capital sigma holds a lowercase sigma wherever it falls",
  },
  {
    operator: "contains",
    operands: ["ẗ"],
    matches: ["t-diaeresis"],
    pins: "a lowercase letter composes where its uppercase could not",
  },
  {
    operator: "contains",
    operands: ["\u{10428}"],
    matches: ["deseret"],
    pins: "case folds beyond the basic plane",
  },
  {
    operator: "contains",
    operands: ["  "],
    matches: ["padded"],
    pins: "spaces are looked for, never trimmed",
  },
  {
    operator: "contains",
    operands: ["42"],
    matches: [],
    pins: "a number is not text, so holds none",
  },
  {
    operator: "contains",
    operands: ["null"],
    matches: [],
    pins: "a null value holds nothing, not even its own spelling",
  },
  {
    operator: "contains",
    operands: ["undefined"],
    matches: [],
    pins: "an absent value holds nothing, not even its own spelling",
  },
  {
    operator: "startsWith",
    operands: ["web"],
    matches: ["web-lower", "web-upper"],
    pins: "a value starts with the operand, ASCII case folded",
  },
  {
    operator: "startsWith",
    operands: ["WEB-0"],
    matches: ["web-lower", "web-upper"],
    pins: "an uppercase operand folds at the start too",
  },
  {
    operator: "startsWith",
    operands: ["example"],
    matches: [],
    pins: "text inside the value is not at its start",
  },
  {
    operator: "startsWith",
    operands: ["%"],
    matches: [],
    pins: "a leading percent sign is literal, never a run of characters",
  },
  {
    operator: "startsWith",
    operands: ["50%"],
    matches: ["percent"],
    pins: "a percent sign after the start is literal too",
  },
  {
    operator: "startsWith",
    operands: ["disk_"],
    matches: ["underscore"],
    pins: "an underscore is literal, never one character",
  },
  {
    operator: "startsWith",
    operands: ["back\\"],
    matches: ["backslash"],
    pins: "the escape character is literal",
  },
  {
    operator: "startsWith",
    operands: ["ÉCOLE"],
    matches: ["composed", "decomposed"],
    pins: "non-ASCII case folds at the start, composed or not",
  },
  {
    operator: "startsWith",
    operands: ["e"],
    matches: [],
    pins: "an accented letter is not its base letter",
  },
  {
    operator: "startsWith",
    operands: ["ΟΔΟΣ"],
    matches: ["greek"],
    pins: "a word ending in capital sigma starts a longer word",
  },
  {
    operator: "startsWith",
    operands: ["日本"],
    matches: ["cjk"],
    pins: "text without case is matched exactly at the start",
  },
  {
    operator: "startsWith",
    operands: ["  "],
    matches: ["padded"],
    pins: "leading spaces are looked for, never trimmed",
  },
  {
    operator: "startsWith",
    operands: ["4"],
    matches: [],
    pins: "a number is not text, so starts with none",
  },
  {
    operator: "isAny",
    operands: ["failed"],
    matches: ["web-upper", "backslash"],
    pins: "a value equal to the one operand",
  },
  {
    operator: "isAny",
    operands: ["running", "pending"],
    matches: ["web-lower", "api"],
    pins: "a value equal to any of the operands",
  },
  {
    operator: "isAny",
    operands: ["running", "failed", "pending"],
    matches: ["web-lower", "web-upper", "api", "backslash"],
    pins: "no value the options do not list, and no empty value",
  },
  {
    operator: "isNone",
    operands: ["failed"],
    matches: ["web-lower", "api", "percent", "digits"],
    pins: "a present value that is not the operand, unlisted ones included",
  },
  {
    operator: "isNone",
    operands: ["running", "failed", "pending"],
    matches: ["percent", "digits"],
    pins: "a value the options do not list is none of them",
  },
];
