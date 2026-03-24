import type { HTMLAttributes } from "react";

/** Valid keyboard key identifiers */
type LetterKey =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";

type DigitKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type FunctionKey =
  | "f1"
  | "f2"
  | "f3"
  | "f4"
  | "f5"
  | "f6"
  | "f7"
  | "f8"
  | "f9"
  | "f10"
  | "f11"
  | "f12";

type ModifierKey =
  | "shift"
  | "ctrl"
  | "alt"
  | "cmd"
  | "option"
  | "capslock"
  | "meta";

type ActionKey = "enter" | "tab" | "space" | "backspace" | "delete" | "escape";

type NavigationKey =
  | "up"
  | "down"
  | "left"
  | "right"
  | "home"
  | "end"
  | "pageup"
  | "pagedown";

export type Key =
  | LetterKey
  | DigitKey
  | FunctionKey
  | ModifierKey
  | ActionKey
  | NavigationKey;

export interface KeyboardKeyProps extends HTMLAttributes<HTMLElement> {
  /** The keyboard key to display */
  keyValue: Key;
}
