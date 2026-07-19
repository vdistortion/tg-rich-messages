import { describe, it, expect } from 'vitest';
import {
  // inline
  bold,
  italic,
  underline,
  strike,
  code,
  marked,
  sub,
  sup,
  spoiler,
  br,
  unsafeRawInline,
  link,
  email,
  phone,
  userMention,
  emoji,
  dateTime,
  math,
  anchorLink,
  reference,
  referenceLink,
  escapeText,
  // block
  paragraph,
  p,
  heading,
  pre,
  footer,
  divider,
  mathBlock,
  anchor,
  list,
  blockquote,
  pullquote,
  details,
  map,
  table,
  // media
  photo,
  video,
  animation,
  audio,
  voice,
  collage,
  slideshow,
  // doc
  doc,
  fmtRich,
  RichDocument,
  TgRichError,
  BlockNode,
  BlockContent,
} from '../src/rich.js';

describe('escapeText', () => {
  it('escapes the 5 special chars', () => {
    expect(escapeText(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
  it('leaves safe text intact', () => {
    expect(escapeText('Привет, мир 123')).toBe('Привет, мир 123');
  });
});

describe('inline builders', () => {
  it('basic wrappers', () => {
    expect(bold('a').render()).toBe('<b>a</b>');
    expect(italic('a').render()).toBe('<i>a</i>');
    expect(underline('a').render()).toBe('<u>a</u>');
    expect(strike('a').render()).toBe('<s>a</s>');
    expect(code('a').render()).toBe('<code>a</code>');
    expect(marked('a').render()).toBe('<mark>a</mark>');
    expect(sub('a').render()).toBe('<sub>a</sub>');
    expect(sup('a').render()).toBe('<sup>a</sup>');
    expect(spoiler('a').render()).toBe('<tg-spoiler>a</tg-spoiler>');
  });

  it('nested inline + arrays + numbers', () => {
    expect(bold(['x ', italic('y'), ' ', 42]).render()).toBe('<b>x <i>y</i> 42</b>');
  });

  it('escapes content', () => {
    expect(bold('<x>').render()).toBe('<b>&lt;x&gt;</b>');
  });

  it('links and mentions escape attributes', () => {
    expect(link('t', 'https://t.me/?a=1&b=2').render()).toBe(
      '<a href="https://t.me/?a=1&amp;b=2">t</a>',
    );
    expect(email('m', 'u@e.com').render()).toBe('<a href="mailto:u@e.com">m</a>');
    expect(phone('c', '+1').render()).toBe('<a href="tel:+1">c</a>');
    expect(userMention('@a', 123).render()).toBe('<a href="tg://user?id=123">@a</a>');
  });

  it('emoji / dateTime / math', () => {
    expect(emoji('555', '👍').render()).toBe('<tg-emoji emoji-id="555">👍</tg-emoji>');
    expect(dateTime('soon', 1647531900, 'wDT').render()).toBe(
      '<tg-time unix="1647531900" format="wDT">soon</tg-time>',
    );
    expect(math('x^2').render()).toBe('<tg-math>x^2</tg-math>');
  });

  it('anchors and references', () => {
    expect(anchorLink('top').render()).toBe('<a href="#">top</a>');
    expect(anchorLink('go', 'c1').render()).toBe('<a href="#c1">go</a>');
    expect(reference('r', 'n1').render()).toBe('<tg-reference name="n1">r</tg-reference>');
    expect(referenceLink('r', 'n1').render()).toBe('<a href="#n1">r</a>');
  });

  it('br', () => {
    expect(br().render()).toBe('<br>');
    expect(blockquote(['line1', br(), 'line2']).render()).toBe(
      '<blockquote>line1<br>line2</blockquote>',
    );
  });

  it('unsafeRawInline returns input as is', () => {
    expect(unsafeRawInline('<b>x</b> & y').render()).toBe('<b>x</b> & y');
    expect(paragraph([unsafeRawInline('<i>a</i>'), ' & ', bold('<')]).render()).toBe(
      '<p><i>a</i> &amp; <b>&lt;</b></p>',
    );
  });
});

describe('block builders', () => {
  it('paragraph / p alias', () => {
    expect(paragraph('hi').render()).toBe('<p>hi</p>');
    expect(p).toBe(paragraph);
  });

  it('heading valid + out of range', () => {
    expect(heading(1, 'h').render()).toBe('<h1>h</h1>');
    expect(heading(6, 'h').render()).toBe('<h6>h</h6>');
    expect(() => heading(0, 'h')).toThrow(TgRichError);
    expect(() => heading(7, 'h')).toThrow(TgRichError);
    expect(() => heading(1.5, 'h')).toThrow(TgRichError);
  });

  it('pre with and without language', () => {
    expect(pre('a<b>').render()).toBe('<pre>a&lt;b&gt;</pre>');
    expect(pre('x', 'python').render()).toBe('<pre><code class="language-python">x</code></pre>');
  });

  it('footer / divider / mathBlock / anchor', () => {
    expect(footer('f').render()).toBe('<footer>f</footer>');
    expect(divider().render()).toBe('<hr/>');
    expect(mathBlock('E=mc^2').render()).toBe('<tg-math-block>E=mc^2</tg-math-block>');
    expect(anchor('c1').render()).toBe('<a name="c1"></a>');
  });
});

describe('list', () => {
  it('unordered, plain items', () => {
    expect(list(['a', 'b']).render()).toBe('<ul><li>a</li><li>b</li></ul>');
  });
  it('ordered with options', () => {
    expect(list(['a'], { ordered: true, start: 7, type: 'a', reversed: true }).render()).toBe(
      '<ol start="7" type="a" reversed><li>a</li></ol>',
    );
  });
  it('per-item value/type', () => {
    expect(list([{ content: 'x', value: 7, type: 'i' }]).render()).toBe(
      '<ul><li value="7" type="i">x</li></ul>',
    );
  });
  it('checkboxes', () => {
    expect(list([{ content: 'x', checkbox: true, checked: true }]).render()).toBe(
      '<ul><li><input type="checkbox" checked>x</li></ul>',
    );
    expect(list([{ content: 'y', checkbox: true }]).render()).toBe(
      '<ul><li><input type="checkbox">y</li></ul>',
    );
  });
  it('block content inside item', () => {
    expect(list([{ content: paragraph('x') }]).render()).toBe('<ul><li><p>x</p></li></ul>');
  });
});

describe('quotes', () => {
  it('blockquote inline + credit', () => {
    expect(blockquote('q', 'me').render()).toBe('<blockquote>q<cite>me</cite></blockquote>');
  });
  it('blockquote with block content', () => {
    expect(blockquote([paragraph('a'), paragraph('b')]).render()).toBe(
      '<blockquote><p>a</p><p>b</p></blockquote>',
    );
  });
  it('pullquote', () => {
    expect(pullquote('q', 'me').render()).toBe('<aside>q<cite>me</cite></aside>');
  });
});

describe('media', () => {
  it('plain photo', () => {
    expect(photo('https://x/a.jpg').render()).toBe('<img src="https://x/a.jpg"/>');
  });
  it('photo with spoiler', () => {
    expect(photo('https://x/a.jpg', { spoiler: true }).render()).toBe(
      '<img src="https://x/a.jpg" tg-spoiler/>',
    );
  });
  it('photo with caption + credit wraps in figure', () => {
    expect(photo('https://x/a.jpg', { caption: 'Cap', credit: 'Cred' }).render()).toBe(
      '<figure><img src="https://x/a.jpg"/><figcaption>Cap<cite>Cred</cite></figcaption></figure>',
    );
  });
  it('video / animation / audio / voice tags', () => {
    expect(video('u').render()).toBe('<video src="u"></video>');
    expect(animation('u').render()).toBe('<video src="u"></video>');
    expect(audio('u').render()).toBe('<audio src="u"></audio>');
    expect(voice('u').render()).toBe('<audio src="u"></audio>');
  });
  it('collage / slideshow', () => {
    expect(
      collage([{ url: 'a.jpg' }, { url: 'b.mp4', type: 'video' }], { caption: 'C' }).render(),
    ).toBe(
      '<tg-collage><img src="a.jpg"/><video src="b.mp4"></video><figcaption>C</figcaption></tg-collage>',
    );
    expect(slideshow([{ url: 'a.jpg' }]).render()).toBe(
      '<tg-slideshow><img src="a.jpg"/></tg-slideshow>',
    );
  });
});

describe('table', () => {
  it('basic with header row', () => {
    expect(table([[{ content: 'H', header: true }], [{ content: 'v' }]]).render()).toBe(
      '<table><tr><th>H</th></tr><tr><td>v</td></tr></table>',
    );
  });
  it('shorthand inline cell', () => {
    expect(table([['a', 'b']]).render()).toBe('<table><tr><td>a</td><td>b</td></tr></table>');
  });
  it('cell attributes + empty cell', () => {
    expect(
      table([
        [{ content: bold('42'), align: 'right', colspan: 2, rowspan: 3, valign: 'top' }, {}],
      ]).render(),
    ).toBe(
      '<table><tr><td colspan="2" rowspan="3" align="right" valign="top"><b>42</b></td><td></td></tr></table>',
    );
  });
  it('options: bordered, striped, caption', () => {
    expect(table([['x']], { bordered: true, striped: true, caption: 'Cap' }).render()).toBe(
      '<table bordered striped><caption>Cap</caption><tr><td>x</td></tr></table>',
    );
  });
  it('throws on >20 columns (plain)', () => {
    const row = Array.from({ length: 21 }, () => 'c');
    expect(() => table([row])).toThrow(TgRichError);
  });
  it('throws on >20 columns via colspan', () => {
    const row = Array.from({ length: 11 }, () => ({ content: 'c', colspan: 2 }));
    expect(() => table([row])).toThrow(TgRichError);
  });
});

describe('details / map', () => {
  it('details open/closed', () => {
    expect(details('S', 'C').render()).toBe('<details><summary>S</summary>C</details>');
    expect(details('S', paragraph('C'), { open: true }).render()).toBe(
      '<details open><summary>S</summary><p>C</p></details>',
    );
  });
  it('map valid', () => {
    expect(map(41.9, 12.5, 14).render()).toBe('<tg-map lat="41.9" long="12.5" zoom="14"/>');
  });
  it('map with caption', () => {
    expect(map(41.9, 12.5, 14, { caption: 'M' }).render()).toBe(
      '<figure><tg-map lat="41.9" long="12.5" zoom="14"/><figcaption>M</figcaption></figure>',
    );
  });
  it('map throws on bad zoom / non-finite coords', () => {
    expect(() => map(1, 1, 12)).toThrow(TgRichError);
    expect(() => map(1, 1, 21)).toThrow(TgRichError);
    expect(() => map(NaN, 1, 14)).toThrow(TgRichError);
  });
});

describe('doc / RichDocument', () => {
  it('flattens nested arrays', () => {
    const d = doc(paragraph('a'), [paragraph('b'), [paragraph('c')]]);
    expect(d.toHTML()).toBe('<p>a</p><p>b</p><p>c</p>');
    expect(d.blocks.length).toBe(3);
  });
  it('toInputRichMessage', () => {
    const d = doc(paragraph('x'));
    expect(d.toInputRichMessage()).toEqual({ html: '<p>x</p>' });
    expect(d.toInputRichMessage({ isRtl: true, skipEntityDetection: true })).toEqual({
      html: '<p>x</p>',
      is_rtl: true,
      skip_entity_detection: true,
    });
  });
});

describe('validate', () => {
  it('passes under limits', () => {
    expect(() => doc(paragraph('hello')).validate()).not.toThrow();
  });
  it('counts code points, not bytes (cyrillic must pass)', () => {
    // 20000 cyrillic chars = 40000 bytes but 20000 code points -> under 32768 chars
    const d = doc(paragraph('ы'.repeat(20000)));
    expect(() => d.validate()).not.toThrow();
  });
  it('throws when char limit exceeded', () => {
    const d = doc(paragraph('a'.repeat(32769)));
    expect(() => d.validate()).toThrow(TgRichError);
  });
  it('media count limit', () => {
    const ok = doc(Array.from({ length: 50 }, () => photo('u.jpg')));
    expect(() => ok.validate()).not.toThrow();
    const bad = doc(Array.from({ length: 51 }, () => photo('u.jpg')));
    expect(() => bad.validate()).toThrow(TgRichError);
  });
  it('returns this for chaining', () => {
    const d = doc(paragraph('x'));
    expect(d.validate()).toBe(d);
  });

  // block count and depth tests
  it('allows exactly 500 blocks', () => {
    const blocks = Array.from({ length: 500 }, () => paragraph('x'));
    expect(() => doc(...blocks).validate()).not.toThrow();
  });
  it('throws on 501 blocks', () => {
    const blocks = Array.from({ length: 501 }, () => paragraph('x'));
    expect(() => doc(...blocks).validate()).toThrow(TgRichError);
  });
  it('counts list items as separate blocks', () => {
    // list (1) + 3 items = 4 blocks
    const d = doc(list(['a', 'b', 'c']));
    expect(() => d.validate()).not.toThrow();
    // 1 list + 500 items = 501 blocks
    const many = Array.from({ length: 500 }, (_, i) => `item${i}`);
    expect(() => doc(list(many)).validate()).toThrow(TgRichError);
  });
  it('counts nested blocks inside list items', () => {
    // list (1) + item (1) + paragraph inside (1) = 3 blocks
    const d = doc(list([{ content: paragraph('deep') }]));
    expect(() => d.validate()).not.toThrow();
  });
  it('throws on depth > 16 with blockquote chain', () => {
    let inner: BlockContent = paragraph('deep');
    for (let i = 0; i < 16; i++) {
      inner = blockquote(inner);
    }
    // depth: first blockquote = 2, last = 17 → error
    expect(() => doc(inner as BlockNode).validate()).toThrow(TgRichError);
  });
  it('allows depth exactly 16', () => {
    let inner: BlockContent = paragraph('ok');
    for (let i = 0; i < 15; i++) {
      inner = blockquote(inner);
    }
    expect(() => doc(inner as BlockNode).validate()).not.toThrow();
  });
  it('counts table rows as blocks', () => {
    const rows = Array.from({ length: 20 }, () => ['cell']);
    expect(() => doc(table(rows)).validate()).not.toThrow();
    const manyRows = Array.from({ length: 500 }, () => ['cell']);
    // 1 table + 500 rows = 501 blocks
    expect(() => doc(table(manyRows)).validate()).toThrow(TgRichError);
  });
});

describe('fmtRich', () => {
  it('wraps inline into a paragraph and collapses whitespace', () => {
    const d = fmtRich`
      ${bold('Hello')} ${italic('world')}!
    `;
    expect(d.toHTML()).toBe('<p><b>Hello</b> <i>world</i>!</p>');
  });
  it('block interrupts paragraph grouping', () => {
    const d = fmtRich`Intro ${heading(2, 'Title')} after`;
    expect(d.toHTML()).toBe('<p>Intro</p><h2>Title</h2><p>after</p>');
  });
  it('ignores null / undefined / false', () => {
    const d = fmtRich`a ${null} ${undefined} ${false} b`;
    expect(d.toHTML()).toBe('<p>a b</p>');
  });
  it('merges nested RichDocument', () => {
    const inner = doc(paragraph('inner'));
    const d = fmtRich`before ${inner} ${bold('after')}`;
    expect(d.toHTML()).toBe('<p>before</p><p>inner</p><p><b>after</b></p>');
  });
  it('drops empty/whitespace-only paragraphs', () => {
    expect(fmtRich`   `.toHTML()).toBe('');
  });
});

describe('snapshot: complex document', () => {
  it('renders the README example consistently', () => {
    const message = doc(
      heading(1, 'Quarterly Report'),
      paragraph([bold('Team'), ' achieved ', italic('record'), ' growth.']),
      divider(),
      list([
        { content: 'Revenue +20%', checkbox: true, checked: true },
        { content: code('New product launch'), checkbox: false },
      ]),
      table(
        [
          [
            { content: 'Metric', header: true },
            { content: 'Value', header: true },
          ],
          [{ content: 'Speed' }, { content: bold('42'), align: 'right' }],
        ],
        { bordered: true, striped: true, caption: 'Key metrics' },
      ),
    );
    expect(message.toHTML()).toMatchSnapshot();
  });
});
