# Measurements

What the boundary costs, measured rather than assumed, so that the README's "not guaranteed" section quotes numbers with their method. Re-measure on every release of `@canonical/styles` and record the result here; never turn these into a CI assertion, because timings are not deterministic across machines (pragma constitution XII).

## Method

Chromium 151.0.7922.137, one fresh browser context per run, timings from the Chrome DevTools Protocol `Performance.RecalcStyleDuration` counter (style only; layout is a separate counter and was 0 for the toggles). A forced recalculation is a class added to `<body>` followed by a read of `offsetHeight`; `RecalcStyleCount` confirmed exactly one recalculation per toggle. Pages: `layers.css`, Vanilla 4.58 compiled from its Sass entry inside `@layer vanilla`, a five-rule scoped stand-in for pragma's element layers, `adapter.css`, `<html class="site comfortable light">`, and N elements inside one `.ds` root as `div > (p, input, span)` units. Sanity check on every run: without the boundary the input inside `.ds` computes Vanilla's `width: 1280px; min-width: 128px`; with it `204px / 0px`.

Caveats that must travel with every number below: a flat, uniform DOM shares the matched-properties cache maximally; the pragma stand-in was five rules where the real `@canonical/styles` is hundreds, which raises the pragma-only baseline and lowers the relative Vanilla overhead; one machine; run-to-run spread of about ±40 percent.

## Results, 2026-09-04

Medians of 7, milliseconds. "shipped" is `adapter.css` as published; "none" is the same page with the boundary block deleted; "narrow" is the boundary without its pseudo-element selectors; "pragma-only" is pragma's CSS alone with no Vanilla and no adapter.

| Page | Initial style | Neutral re-cascade (`body.probe { --probe: 1 }` in `app`) | Vanilla theme toggle (`is-dark` on `<body>`) |
|---|---|---|---|
| 10,000 elements, shipped | 162 [113–223] | 155 [101–275] | 184 [115–267] |
| 10,000 elements, none | 163 [143–556] | 158 [120–493] | 318 [204–621] |
| 10,000 elements, narrow | 165 [137–181] | 175 [147–269] | 181 [125–365] |
| 10,000 elements, pragma-only | 115 [78–217] | 112 [80–198] | 105 [67–198] |
| 30,000 elements, shipped | 445 [381–950] | 470 [342–600] | 523 [329–633] |
| 30,000 elements, none | 449 [353–614] | 481 [391–571] | 967 [725–1095] |
| 30,000 elements, narrow | 432 [328–613] | 463 [362–623] | 519 [474–783] |
| 30,000 elements, pragma-only | 332 [232–599] | 238 [222–450] | 291 [170–429] |

## Reading

- The boundary rule itself costs nothing measurable: shipped against none differs by −1 to −2 percent on initial style and on a neutral re-cascade, inside the spread.
- A Vanilla theme toggle is 42 to 46 percent cheaper with the boundary, because Vanilla's `var(--vf-*)` declarations inside the territory are reverted instead of re-resolved.
- A mixed page costs 34 to 41 percent more than a pragma-only page on initial style, with or without the boundary. That overhead is Vanilla's 14,099 lines of selectors being matched against every element in the territory; no adapter removes it, and it ends when Vanilla does.
- The pseudo-element selectors are free: shipped against narrow is inside noise in every cell, because Vanilla's `*::before, *::after { box-sizing: inherit }` already makes both pseudo styles resolve for every element.
- Chromium exposes 475 longhands, so `all: revert` expands to about 470 declarations per element and per pseudo-element.
