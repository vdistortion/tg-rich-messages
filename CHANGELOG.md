# Changelog

## 0.4.0 — 2026-08-24

### Added

- Added `thinking()` for the `<tg-thinking>` placeholder used by `sendRichMessageDraft`.
- Bot API 10.3 support for inline buttons (`button()`), button rows (`buttonRow()`), expandable blockquotes, compact tables, and document media (`document()`).
- Document media is included in `validate()` attachment counting.

---

## 0.3.0 — 2026-07-20

### Added

- New inline element `unsafeRawInline(input: string)` that inserts raw HTML as‑is, without escaping (for use with trusted content only).

---

## 0.2.0 — 2026-06-16

### Added

- Extended `validate()` with two new checks:
  - Total block count limit (max **500** blocks, including nested blocks, list items, and table rows).
  - Maximum nesting depth limit (max **16**).
- Added optional `_meta` field to `BlockNode` to store metadata (children, list items, row count) for accurate counting.
- Internal utilities `normalizeItem` and `extractBlocks` for unified handling of list items and block extraction.
- New tests covering block count, nesting depth, list items, and table rows.

---

## 0.1.0 — 2026-06-16

### Added

- Initial release.
- All inline elements: `bold`, `italic`, `underline`, `strike`, `spoiler`, `code`, `marked`, `sub`, `sup`, `br`, `link`, `email`, `phone`, `userMention`, `emoji`, `dateTime`, `math`, `anchorLink`, `reference`, `referenceLink`.
- All block elements: `paragraph`, `heading`, `pre`, `footer`, `divider`, `mathBlock`, `anchor`, `list`, `blockquote`, `pullquote`, `details`, `map`, `table`.
- Media elements: `photo`, `video`, `animation`, `audio`, `voice`, `collage`, `slideshow`.
- Document builder `doc()`, `toHTML()` method, and `toInputRichMessage()` conversion.
- Tagged template literal `fmtRich` with automatic paragraph grouping.
- Basic validation: text length (≤ 32768 chars) and media count (≤ 50).
- Full TypeScript typings, zero dependencies, tree‑shakeable.
- Exported `escapeText()` function for escaping special characters.
