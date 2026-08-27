/**
 * The static shell-completion templates — one emitter per shell, all fed by
 * the same completion model.
 *
 * The three exports are the domain: each takes the model and returns the text
 * of a script `setup completions` writes to disk. They are grouped because
 * they are interchangeable answers to one question — which shell is this — and
 * because they must stay in step: a fact the model carries has to be
 * expressible in all three, so a change to one is a change to all three.
 *
 * What the barrel does NOT expose is the rendering layer underneath
 * (`shared.ts`): the per-verb views, the token allowlist re-assertion, the
 * name/flag list derivations. Those exist so the scripts cannot disagree about
 * structure, and they are safe only in the emit context they were built for —
 * every token they return has been re-checked against the safety allowlist on
 * its way into script text. Offering them across the domain boundary would
 * offer a way to compose that text without that check, which is the one thing
 * this domain exists to make impossible.
 */

export { bashScript } from "./bash.js";
export { fishScript } from "./fish.js";
export { zshScript } from "./zsh.js";
