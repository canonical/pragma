export const LETTER_KEYS = {
  a: "A",
  b: "B",
  c: "C",
  d: "D",
  e: "E",
  f: "F",
  g: "G",
  h: "H",
  i: "I",
  j: "J",
  k: "K",
  l: "L",
  m: "M",
  n: "N",
  o: "O",
  p: "P",
  q: "Q",
  r: "R",
  s: "S",
  t: "T",
  u: "U",
  v: "V",
  w: "W",
  x: "X",
  y: "Y",
  z: "Z",
} as const;

export const FUNCTION_KEYS = {
  f1: "F1",
  f2: "F2",
  f3: "F3",
  f4: "F4",
  f5: "F5",
  f6: "F6",
  f7: "F7",
  f8: "F8",
  f9: "F9",
  f10: "F10",
  f11: "F11",
  f12: "F12",
} as const;

export const ACTION_KEYS = {
  tab: "Tab",
  space: "Space",
  backspace: "Backspace",
  delete: "Del",
  escape: "Esc",
  enter: "↵",
} as const;

export const MODIFIER_KEYS = {
  shift: "Shift",
  ctrl: "Ctrl",
  alt: "Alt",
  cmd: "Cmd",
  option: "Option",
  meta: "Meta",
  capslock: "Caps Lock",
} as const;

export const NAVIGATION_KEYS = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  home: "Home",
  end: "End",
  pageup: "PgUp",
  pagedown: "PgDn",
} as const;

/** All key display labels, derived from individual key groups */
export const KEY_LABELS = {
  ...LETTER_KEYS,
  ...FUNCTION_KEYS,
  ...ACTION_KEYS,
  ...MODIFIER_KEYS,
  ...NAVIGATION_KEYS,
} as const;

/** Accessible labels for keys whose label is a symbol */
export const ARIA_LABELS: Partial<Record<keyof typeof KEY_LABELS, string>> = {
  enter: "Enter",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
} as const;
