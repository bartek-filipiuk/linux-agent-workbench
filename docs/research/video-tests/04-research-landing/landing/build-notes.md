# Build notes — After Dark

## Files produced
- `index.html` — full page markup (single page, no build step)
- `styles.css` — all styling, including `@font-face` declarations for the two supplied local fonts
- `script.js` — vanilla JS for the sky-comparison slider and the checklist progress/reset (no dependencies)
- `assets/fonts/Outfit.ttf`, `assets/fonts/DMSans.ttf` — the supplied local fonts, self-hosted and referenced with relative paths only (no CDN, no Google Fonts link)
- `build-notes.md` — this file

No frameworks, bundlers, external scripts, analytics, or network calls are used. All internal asset references (`styles.css`, `script.js`, `assets/fonts/...`) are relative paths, verified to work with a plain static file server (see below) and expected to work equally under `file://`.

## Content sourcing
- All factual claims are paraphrased from the four sources in `research.md` (NASA Science ×2, National Park Service, DarkSky International/Illuminating Engineering Society — 3 distinct publishers), each linked inline where used and again in the bibliography section.
- The three "before you go outside" tips are original short paraphrases (39–43 words each, well under the 150-word cap), each with one inline source link.
- The five lighting principles are paraphrased from the DarkSky/IES source only, with one shared source link.
- No fabricated statistics, forecasts, testimonials, or booking/email-collection UI were added, per the brief.
- Footer explicitly disclaims affiliation with NASA, NPS, and DarkSky International.

## Font substitution (disclosed)
The brief asked for a "characterful serif headline font," but the two fonts actually supplied in `assets/fonts/` (Outfit and DM Sans) are both sans-serif — there is no serif file in the workspace. I did not fabricate or download a substitute. Instead I used **Outfit** as the display/headline face (it has enough personality at large sizes to read as "characterful") and **DM Sans** for body text, and I'm noting this substitution here rather than silently claiming a serif was used. If a serif file is later added to `assets/fonts/`, swapping the `--serif` custom property in `styles.css` is a one-line change.

## Interaction notes
- **Checklist**: 5 real `<input type="checkbox">` + `<label>` pairs (native keyboard/screen-reader support for free), a live progress count (`aria-live="polite"`), and a reset button that unchecks all and returns focus to the first item. Checking/unchecking works with plain HTML even if JS fails; only the numeric count and reset button depend on `script.js`.
- **Sky comparison slider**: a native `<input type="range">`, labelled via `<label for>`, with `aria-describedby` pointing at a live status line that also updates `aria-valuetext`. Two hand-built SVG illustrations (dark sky / light-polluted sky) are layered and revealed with `clip-path` driven by the slider's `input` event. Explicitly labeled in the copy as a schematic illustration, not a calibrated simulation, and not tied to any real date/location. Without JS the two illustrations still render at their fixed 50/50 CSS split — nothing is hidden or blank.
- No form pretends to submit anything; there is no `<form>` element on the page at all.

## Validation actually performed in this session
All of the following were run directly in this workspace (commands and output are reproducible from the same directory):
1. **HTML tag balance / duplicate IDs / single-`h1` check** — wrote a small Python script using `html.parser.HTMLParser` to walk `index.html`'s tag stack; confirmed zero unclosed/mismatched tags, zero duplicate `id` attributes (25 unique ids), and exactly one `<h1>`.
2. **Inline SVG well-formedness** — extracted all three `<svg>...</svg>` blocks from `index.html` and parsed each with `xml.etree.ElementTree`; all three parse as valid XML.
3. **JS syntax** — ran `node --check script.js`; passed with no errors.
4. **CSS brace balance** — counted `{`/`}` in `styles.css` (98/98, matched) as a basic sanity check; not a full CSS parse.
5. **Asset resolution over HTTP** — served the workspace with `python3 -m http.server` and `curl`'d `index.html`, `styles.css`, `script.js`, and both `.ttf` files; all returned HTTP 200, confirming the relative paths resolve correctly from a static file server.
6. **Word counts** — counted words in each of the three tip paraphrases programmatically (43, 39, 43 words) to confirm they're under the 150-word-per-source cap in the brief.
7. **Font file sanity check** — verified both `.ttf` files start with the correct TrueType magic bytes (`00 01 00 00`) and are non-trivial in size (110 KB / 240 KB), i.e. not empty or corrupted placeholders.
8. **Color contrast (WCAG 2.1)** — computed relative luminance and contrast ratios in Python for every foreground/background text pairing used in `styles.css` (ink/ivory, copper/ivory, copper/ink, ivory-dim/ink, etc.). The initial copper-on-ivory pairing (`#c69263` on `#f5f0e3`) came out at 2.40:1, which fails AA for text at the sizes used (eyebrow labels, progress count, default link color). I introduced a darker `--copper-deep` (`#8a5a34`, 5.14:1 on ivory) for all copper text on light backgrounds, and kept the lighter `--copper` for copper text/links already on dark backgrounds (6.38:1 on ink) and for non-text uses (borders, button fill, accent color). All checked text pairings now clear 4.5:1 (several clear 5.6:1+; large headings/buttons clear 3:1+ where applicable).

## What was NOT tested (explicit limitations)
- **No real browser or screenshot testing was performed.** I do not have a browser or screenshot tool available in this environment, so I have not visually confirmed layout, the hero split composition, the slider's clip-path animation, focus-ring appearance, or exact rendering of the two local fonts. The checks above are static/programmatic (markup structure, syntax, contrast math, HTTP status), not a rendered visual review.
- No automated axe-core / Lighthouse / WAVE accessibility audit was run — only manual reasoning plus the contrast math in item 8 above.
- No testing at the specific 390px / 1440px breakpoints was done in an actual viewport; the responsive rules (`clamp()` for type, a single `min-width: 900px` breakpoint for the hero split, `min-width: 760px`/`700px` breakpoints for grids, and percentage/`max-width`-based containers with no fixed pixel widths beyond `max-width`) were written to avoid horizontal overflow by construction, but this has not been visually confirmed.
- No cross-browser testing (this was authored and checked in a Linux CLI environment only).
- No spelling/grammar linter was run beyond manual proofreading.

## Follow-up: external review pass (third invocation)
The earlier two invocations (initial build + first follow-up) each hit their turn limits before finishing every requested edit. This third, external review pass fixed the remaining item: the checklist's "at least twenty minutes" dark-adaptation figure was unsupported precision not backed by any of the cited sources, so it was replaced with the softer, source-agnostic "Give your eyes time to adjust to the dark before judging the sky." No claim that dark adaptation is "instantly lost" was found in the current markup/CSS/JS, and no eyebrow/kicker paragraphs above headings exist in the current HTML (dead `.eyebrow` CSS rules remain in `styles.css` but are unused and harmless). The hero CTA button is already `display: inline-block` inside a flex column on desktop, so it was already content-width, not full-width; no change was needed there. Re-ran `node --check script.js` only (see below) — did not re-run the full validation suite from earlier sections.

## Known simplifications
- The night-sky and horizon illustration (hero) and the two comparison illustrations are original, hand-coded inline SVG — schematic star fields and a simplified Big Dipper asterism, explicitly not a real/date-accurate sky map, consistent with the brief.
- The Milky Way band, moon phase, and star placements in all illustrations are decorative approximations for mood, not astronomically positioned.
