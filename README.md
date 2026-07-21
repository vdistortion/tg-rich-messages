# tg-rich-messages

Platform-independent TypeScript builder for Telegram Rich Messages (HTML mode).

This library is compatible with **Telegram Bot API version 10.2** ([official API documentation](https://core.telegram.org/bots/api)).  
Generates valid Telegram HTML for the [Rich Messages API](https://core.telegram.org/bots/api#rich-messages).  
Fully typed, zero dependencies, tree-shakeable.

## Features

- All inline formatting: bold, italic, underline, strikethrough, spoiler, code, marked, sub, sup, line breaks, unsafeRawInline, links, anchors, references, custom emoji, date/time, math.
- All block elements: paragraphs, headings (1–6), preformatted code (with language), footers, dividers, math blocks, anchors, lists (ordered/unordered with full options, checkboxes), blockquotes, pullquotes, tables (with alignment, spanning, borders, stripes, captions), details (expandable blocks), maps, collages, slideshows.
- Media blocks: photo, video, animation, audio, voice – all with optional spoiler, caption and credit (`<figure>`/`<figcaption>`/`<cite>`).
- Document builder: `doc()` collects blocks, `toHTML()` renders the final string, `toInputRichMessage()` returns the `InputRichMessage` object ready to pass to `sendRichMessage`.
- Template literal `fmtRich` for natural mixing of text, inline elements and blocks with automatic paragraph grouping.
- Validation: checks text length (≤ 32768 UTF-8 code points, approximate), media count (≤ 50), total number of blocks (≤ 500), and maximum nesting depth (≤ 16).
- Zero runtime dependencies; TypeScript-first with full type safety.

## Installation

```shell
npm install tg-rich-messages
```

## Quick Start

```ts
import { doc, bold, italic, paragraph, heading, list, code, fmtRich } from 'tg-rich-messages';

// Build a document
const message = doc(
  heading(1, 'Welcome'),
  paragraph([bold('Hello'), ' ', italic('world'), '!']),
  list(
    [
      'First item',
      { content: code('code example'), checkbox: true, checked: true },
      { content: 'Ordered item', value: 7, type: 'a' },
    ],
    { ordered: true, start: 7 },
  ),
);

// Render to HTML
const html = message.toHTML();

// Get InputRichMessage payload for sendRichMessage
const payload = message.toInputRichMessage({
  isRtl: false,
  skipEntityDetection: true,
});

console.log(payload);
// { html: "<h1>Welcome</h1><p><b>Hello</b> <i>world</i>!</p>...", skip_entity_detection: true }
```

Using tagged template literal:

```ts
import { fmtRich, bold, italic, code } from 'tg-rich-messages';

const message = fmtRich`
  ${bold`Hello`} ${italic`world`}!
  Here is some ${code`inline code`}.
`;

console.log(message.toHTML());
```

## API Reference

### Inline Builders (return `InlineNode`)

All accept `Inline` content: strings, numbers, other inline nodes, or arrays of them.

| Function                       | HTML output                                | Notes                                      |
| ------------------------------ | ------------------------------------------ | ------------------------------------------ |
| `bold(text)`                   | `<b>…</b>`                                 |                                            |
| `italic(text)`                 | `<i>…</i>`                                 |                                            |
| `underline(text)`              | `<u>…</u>`                                 |                                            |
| `strike(text)`                 | `<s>…</s>`                                 |                                            |
| `spoiler(text)`                | `<tg-spoiler>…</tg-spoiler>`               |                                            |
| `code(text)`                   | `<code>…</code>`                           |                                            |
| `marked(text)`                 | `<mark>…</mark>`                           |                                            |
| `sub(text)`                    | `<sub>…</sub>`                             |                                            |
| `sup(text)`                    | `<sup>…</sup>`                             |                                            |
| `br()`                         | `<br>`                                     | line break                                 |
| `unsafeRawInline(input)`       | as-is                                      | not escaped, should use trusted HTML input |
| `link(text, url)`              | `<a href="…">…</a>`                        | URL is escaped                             |
| `email(text, address)`         | `<a href="mailto:…">…</a>`                 |                                            |
| `phone(text, number)`          | `<a href="tel:…">…</a>`                    |                                            |
| `userMention(text, userId)`    | `<a href="tg://user?id=…">…</a>`           |                                            |
| `emoji(emojiId, alt)`          | `<tg-emoji emoji-id="…">alt</tg-emoji>`    |                                            |
| `dateTime(text, unix, format)` | `<tg-time unix="…" format="…">…</tg-time>` | format like `wDT`                          |
| `math(latex)`                  | `<tg-math>…</tg-math>`                     |                                            |
| `anchorLink(text, name?)`      | `<a href="#…">…</a>`                       | empty name = top                           |
| `reference(text, name)`        | `<tg-reference name="…">…</tg-reference>`  |                                            |
| `referenceLink(text, name)`    | `<a href="#…">…</a>`                       | links to reference                         |

### Block Builders (return `BlockNode`)

| Function                           | HTML output                                                      | Notes                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `paragraph(text)` / `p(text)`      | `<p>…</p>`                                                       |                                                                                          |
| `heading(level, text)`             | `<h1>…</h1>` … `<h6>…</h6>`                                      | level 1–6                                                                                |
| `pre(text, language?)`             | `<pre><code class="language-…">…</code></pre>` or `<pre>…</pre>` |                                                                                          |
| `footer(text)`                     | `<footer>…</footer>`                                             |                                                                                          |
| `divider()`                        | `<hr/>`                                                          |                                                                                          |
| `mathBlock(latex)`                 | `<tg-math-block>…</tg-math-block>`                               |                                                                                          |
| `anchor(name)`                     | `<a name="…"></a>`                                               | standalone anchor                                                                        |
| `blockquote(content, credit?)`     | `<blockquote>…<cite>…</cite></blockquote>`                       | content can be inline or block                                                           |
| `pullquote(text, credit?)`         | `<aside>…<cite>…</cite></aside>`                                 |                                                                                          |
| `list(items, options?)`            | `<ul>…</ul>` or `<ol>…</ol>` with `<li>`                         | supports `ordered`, `start`, `type`, `reversed`, `value`, `checkbox`, `checked` per item |
| `details(summary, content, opts?)` | `<details [open]>…</details>`                                    | content can be inline or block                                                           |
| `table(rows, options?)`            | `<table [bordered] [striped]><caption>…</caption>…</table>`      | cells: `content`, `header`, `colspan`, `rowspan`, `align`, `valign`                      |
| `map(lat, long, zoom, opts?)`      | `<tg-map lat="…" long="…" zoom="…"/>`                            | optionally wrapped in `<figure>`                                                         |

### Media Builders

| Function                  | HTML                                                                            | Notes                           |
| ------------------------- | ------------------------------------------------------------------------------- | ------------------------------- |
| `photo(url, opts?)`       | `<img src="…" [tg-spoiler]/>` or `<figure>…<figcaption>…</figcaption></figure>` |                                 |
| `video(url, opts?)`       | `<video src="…" [tg-spoiler]></video>` or `<figure>…`                           |                                 |
| `animation(url, opts?)`   | same as `video`                                                                 |                                 |
| `audio(url, opts?)`       | `<audio src="…"></audio>` or `<figure>…`                                        |                                 |
| `voice(url, opts?)`       | same as `audio`                                                                 |                                 |
| `collage(items, opts?)`   | `<tg-collage>…<figcaption>…</figcaption></tg-collage>`                          | items: `{url, type?, spoiler?}` |
| `slideshow(items, opts?)` | `<tg-slideshow>…<figcaption>…</figcaption></tg-slideshow>`                      |                                 |

> `animation` renders as `<video>` and `voice` as `<audio>`; Telegram picks the actual type from the URL/MIME, so use `.gif`/`.mp4` for animation and `.ogg` for voice.

### Document

```ts
class RichDocument {
  constructor(blocks: BlockNode[]);
  get blocks(): readonly BlockNode[];
  toHTML(): string;
  validate(): this; // throws TgRichError on limits violation
  toInputRichMessage(opts?: DocumentOptions): InputRichMessage;
}

type DocumentOptions = {
  isRtl?: boolean;
  skipEntityDetection?: boolean;
};
```

### `doc(...content: BlockContent[]): RichDocument`

Accepts a flat list of blocks or nested arrays of blocks.

### `fmtRich` tagged template

```ts
function fmtRich(strings: TemplateStringsArray, ...values: FmtValue[]): RichDocument;

type FmtValue = Inline | BlockContent | RichDocument | null | undefined | false;
```

Template literal that:

- automatically wraps inline sequences into paragraphs
- collapses multiple spaces/newlines into single space within paragraphs
- ignores `null`, `undefined`, `false`
- accepts `RichDocument` to merge multiple documents

### Error handling

`TgRichError` is thrown on invalid input (e.g., heading size out of range, too many table columns, map zoom out of range).

### Escaping

Exported `escapeText(str: string): string` – escapes `&`, `<`, `>`, `"`, `'`. Used internally.

Use `unsafeRawInline(input)` only with trusted HTML, it inserts `input` as-is with no escaping.

## Validation Limits

The built-in `validate()` checks:

- Total text (excluding tags) must not exceed **32768 UTF-8 characters** (counted as Unicode code points; approximate, since entities/tags are stripped heuristically).
- Total media attachments (img, video, audio) must not exceed **50**.
- Total number of blocks must not exceed **500** (including nested blocks, list items, and table rows).
- Maximum nesting depth must not exceed **16**.

## Building a Complex Message

```ts
import {
  doc,
  heading,
  paragraph,
  bold,
  italic,
  code,
  list,
  blockquote,
  divider,
  photo,
  table,
  fmtRich,
  link,
  spoiler,
  userMention,
} from 'tg-rich-messages';

const message = doc(
  heading(1, 'Quarterly Report'),
  paragraph([bold('Team'), ' achieved ', italic('record'), ' growth.']),

  divider(),

  heading(2, 'Highlights'),
  list([
    { content: 'Revenue +20%', checkbox: true, checked: true },
    { content: code('New product launch'), checkbox: false },
    { content: 'Opened 3 new markets' },
  ]),

  blockquote(
    [paragraph('The best quarter ever.'), paragraph('Special thanks to the engineering team.')],
    'CEO',
  ),

  heading(2, 'Visuals'),
  photo('https://example.com/chart.jpg', {
    caption: 'Revenue chart',
    credit: 'Finance dept',
    spoiler: false,
  }),

  heading(2, 'Metrics'),
  table(
    [
      [
        { content: 'Metric', header: true },
        { content: 'Value', header: true },
      ],
      [{ content: 'Speed' }, { content: bold('42'), align: 'right' }],
      [{ content: 'Status' }, { content: spoiler('ready'), align: 'center' }],
    ],
    { bordered: true, striped: true, caption: 'Key metrics' },
  ),

  paragraph([
    'Visit ',
    link('our website', 'https://example.com'),
    ' or mention ',
    userMention('@admin', 123456789),
  ]),
);

console.log(message.toHTML());
```

## Using with Telegram Bot API

```ts
// Example with node-fetch
await fetch(`https://api.telegram.org/bot${TOKEN}/sendRichMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: CHAT_ID,
    rich_message: message.toInputRichMessage({ skipEntityDetection: false }),
  }),
});
```

## TypeScript Configuration

The library is written in TypeScript and ships with type declarations. No additional setup needed.

## Contributing & Roadmap

- [ ] Add `<tg-thinking>` support for draft messages.

Pull requests welcome!

> ⭐ Like this tool? Give it a star on [GitHub](https://github.com/vdistortion/tg-rich-messages) – it helps others discover the project!
