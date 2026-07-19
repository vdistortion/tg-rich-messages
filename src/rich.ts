// =====================================================================================
// tg-rich-messages: platform-independent builder for Telegram Rich Messages (HTML mode)
// =====================================================================================

export class TgRichError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TgRichError';
  }
}

// ----- node model ----------------------------------------------------------
const KIND = Symbol('tgrich.kind');

export interface InlineNode {
  readonly [KIND]: 'inline';
  render(): string;
}
export interface BlockNode {
  readonly [KIND]: 'block';
  render(): string;
  readonly _meta?: BlockMeta;
}

export type Inline = string | number | InlineNode | readonly Inline[];
export type BlockContent = BlockNode | readonly BlockContent[];

interface BlockMeta {
  children?: readonly BlockNode[];
  items?: readonly ListItemMeta[];
  rows?: number;
}

interface ListItemMeta {
  content: Inline | BlockContent;
  checkbox?: boolean;
  checked?: boolean;
  value?: number;
  type?: LabelType;
}

function isInlineNode(v: unknown): v is InlineNode {
  return typeof v === 'object' && v !== null && (v as any)[KIND] === 'inline';
}
function isBlockNode(v: unknown): v is BlockNode {
  return typeof v === 'object' && v !== null && (v as any)[KIND] === 'block';
}

// ----- escaping (always-safe subset) ---------------------------------------
const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
export function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]);
}
const escapeAttr = escapeText;

// reverse of escapeText, used only for length estimation in validate()
const UNESC: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};
function stripTagsToText(html: string): string {
  const noTags = html.replace(/<[^>]*>/g, '');
  return noTags.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => UNESC[m] ?? m);
}

// ----- renderers -----------------------------------------------------------
function renderInline(content: Inline): string {
  if (typeof content === 'string') return escapeText(content);
  if (typeof content === 'number') return escapeText(String(content));
  if (Array.isArray(content)) return content.map(renderInline).join('');
  if (isInlineNode(content)) return content.render();
  throw new TgRichError(`Invalid inline content: ${String(content)}`);
}
function renderFlow(content: Inline | BlockContent): string {
  if (Array.isArray(content)) return content.map((c) => renderFlow(c as any)).join('');
  if (isBlockNode(content)) return content.render();
  return renderInline(content as Inline);
}
function inline(render: () => string): InlineNode {
  return { [KIND]: 'inline', render };
}
function block(render: () => string, meta?: BlockMeta): BlockNode {
  return { [KIND]: 'block', render, _meta: meta };
}
function wrap(name: string, content: Inline): InlineNode {
  return inline(() => `<${name}>${renderInline(content)}</${name}>`);
}

// ----- inline builders (RichText.*) ----------------------------------------
export const bold = (t: Inline) => wrap('b', t);
export const italic = (t: Inline) => wrap('i', t);
export const underline = (t: Inline) => wrap('u', t);
export const strike = (t: Inline) => wrap('s', t);
export const code = (t: Inline) => wrap('code', t);
export const marked = (t: Inline) => wrap('mark', t);
export const sub = (t: Inline) => wrap('sub', t);
export const sup = (t: Inline) => wrap('sup', t);
export const spoiler = (t: Inline) => wrap('tg-spoiler', t);
export const br = () => inline(() => '<br>');
export const unsafeRawInline = (input: string) => inline(() => input);

export const link = (t: Inline, url: string) =>
  inline(() => `<a href="${escapeAttr(url)}">${renderInline(t)}</a>`);
export const email = (t: Inline, address: string) =>
  inline(() => `<a href="mailto:${escapeAttr(address)}">${renderInline(t)}</a>`);
export const phone = (t: Inline, number: string) =>
  inline(() => `<a href="tel:${escapeAttr(number)}">${renderInline(t)}</a>`);
export const userMention = (t: Inline, userId: number | string) =>
  inline(() => `<a href="tg://user?id=${escapeAttr(String(userId))}">${renderInline(t)}</a>`);

export const emoji = (emojiId: string, alt: string) =>
  inline(() => `<tg-emoji emoji-id="${escapeAttr(emojiId)}">${escapeText(alt)}</tg-emoji>`);
export const dateTime = (t: Inline, unix: number, format: string) =>
  inline(
    () => `<tg-time unix="${unix}" format="${escapeAttr(format)}">${renderInline(t)}</tg-time>`,
  );
export const math = (latex: string) => inline(() => `<tg-math>${escapeText(latex)}</tg-math>`);

export const anchorLink = (t: Inline, anchorName = '') =>
  inline(() => `<a href="#${escapeAttr(anchorName)}">${renderInline(t)}</a>`);
export const reference = (t: Inline, name: string) =>
  inline(() => `<tg-reference name="${escapeAttr(name)}">${renderInline(t)}</tg-reference>`);
export const referenceLink = (t: Inline, name: string) =>
  inline(() => `<a href="#${escapeAttr(name)}">${renderInline(t)}</a>`);

// ----- block builders (RichBlock.*) ----------------------------------------
export const paragraph = (t: Inline) => block(() => `<p>${renderInline(t)}</p>`);
export const p = paragraph;

export function heading(level: number, t: Inline): BlockNode {
  if (!Number.isInteger(level) || level < 1 || level > 6)
    throw new TgRichError('Heading level must be an integer 1..6');
  return block(() => `<h${level}>${renderInline(t)}</h${level}>`);
}
export function pre(text: string, language?: string): BlockNode {
  return block(() =>
    language
      ? `<pre><code class="language-${escapeAttr(language)}">${escapeText(text)}</code></pre>`
      : `<pre>${escapeText(text)}</pre>`,
  );
}
export const footer = (t: Inline) => block(() => `<footer>${renderInline(t)}</footer>`);
export const divider = () => block(() => `<hr/>`);
export const mathBlock = (latex: string) =>
  block(() => `<tg-math-block>${escapeText(latex)}</tg-math-block>`);
export const anchor = (name: string) => block(() => `<a name="${escapeAttr(name)}"></a>`);

// list ----------------------------------------------------------------------
type LabelType = 'a' | 'A' | 'i' | 'I' | '1';
export interface ListItem {
  content: Inline | BlockContent;
  checkbox?: boolean;
  checked?: boolean;
  value?: number;
  type?: LabelType;
}
export type ListItemInput = Inline | BlockContent | ListItem;
export interface ListOptions {
  ordered?: boolean;
  start?: number;
  reversed?: boolean;
  type?: LabelType;
}

function isListItem(v: any): v is ListItem {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    !isInlineNode(v) &&
    !isBlockNode(v) &&
    'content' in v
  );
}
function normalizeItem(input: ListItemInput): ListItemMeta {
  if (isListItem(input)) return input;
  return { content: input as Inline | BlockContent };
}

export function list(items: readonly ListItemInput[], options: ListOptions = {}): BlockNode {
  const itemMetas = items.map(normalizeItem);
  return block(
    () => {
      const tag = options.ordered ? 'ol' : 'ul';
      const attrs: string[] = [];
      if (options.ordered) {
        if (options.start !== undefined) attrs.push(`start="${options.start}"`);
        if (options.type) attrs.push(`type="${options.type}"`);
        if (options.reversed) attrs.push('reversed');
      }
      const open = attrs.length ? `<${tag} ${attrs.join(' ')}>` : `<${tag}>`;
      return `${open}${itemMetas.map(renderListItemMeta).join('')}</${tag}>`;
    },
    { items: itemMetas },
  );
}
function renderListItemMeta(it: ListItemMeta): string {
  const attrs: string[] = [];
  if (it.value !== undefined) attrs.push(`value="${it.value}"`);
  if (it.type) attrs.push(`type="${it.type}"`);
  const open = attrs.length ? `<li ${attrs.join(' ')}>` : '<li>';
  let inner = '';
  if (it.checkbox)
    inner += it.checked ? '<input type="checkbox" checked>' : '<input type="checkbox">';
  return `${open}${inner}${renderFlow(it.content)}</li>`;
}

// quotes --------------------------------------------------------------------
/** Extracts a flat list of BlockNode from Inline | BlockContent */
function extractBlocks(content: Inline | BlockContent): BlockNode[] {
  if (Array.isArray(content)) {
    const result: BlockNode[] = [];
    for (const c of content) {
      if (Array.isArray(c)) {
        result.push(...extractBlocks(c));
      } else if (isBlockNode(c)) {
        result.push(c);
      }
    }
    return result;
  }
  if (isBlockNode(content)) {
    return [content];
  }
  return [];
}

export function blockquote(content: Inline | BlockContent, credit?: Inline): BlockNode {
  const children = extractBlocks(content);
  return block(
    () => {
      const c = credit !== undefined ? `<cite>${renderInline(credit)}</cite>` : '';
      return `<blockquote>${renderFlow(content)}${c}</blockquote>`;
    },
    { children },
  );
}
export function pullquote(text: Inline, credit?: Inline): BlockNode {
  return block(() => {
    const c = credit !== undefined ? `<cite>${renderInline(credit)}</cite>` : '';
    return `<aside>${renderInline(text)}${c}</aside>`;
  });
}

// media ---------------------------------------------------------------------
export interface MediaOptions {
  caption?: Inline;
  credit?: Inline;
  spoiler?: boolean;
}
function mediaElement(tag: 'img' | 'video' | 'audio', url: string, spoiler?: boolean): string {
  const sp = spoiler ? ' tg-spoiler' : '';
  return tag === 'img'
    ? `<img src="${escapeAttr(url)}"${sp}/>`
    : `<${tag} src="${escapeAttr(url)}"${sp}></${tag}>`;
}
function captionMarkup(opts: MediaOptions): string {
  const cap = opts.caption !== undefined ? renderInline(opts.caption) : '';
  const cred = opts.credit !== undefined ? `<cite>${renderInline(opts.credit)}</cite>` : '';
  return `<figcaption>${cap}${cred}</figcaption>`;
}
function mediaBlock(
  tag: 'img' | 'video' | 'audio',
  url: string,
  opts: MediaOptions = {},
): BlockNode {
  return block(() => {
    const el = mediaElement(tag, url, opts.spoiler);
    if (opts.caption === undefined && opts.credit === undefined) return el;
    return `<figure>${el}${captionMarkup(opts)}</figure>`;
  });
}
export const photo = (url: string, opts?: MediaOptions) => mediaBlock('img', url, opts);
export const video = (url: string, opts?: MediaOptions) => mediaBlock('video', url, opts);
export const animation = (url: string, opts?: MediaOptions) => mediaBlock('video', url, opts);
export const audio = (url: string, opts?: MediaOptions) => mediaBlock('audio', url, opts);
export const voice = (url: string, opts?: MediaOptions) => mediaBlock('audio', url, opts);

// collage / slideshow -------------------------------------------------------
export interface GalleryItem {
  url: string;
  type?: 'photo' | 'video';
  spoiler?: boolean;
}
export interface GalleryOptions {
  caption?: Inline;
  credit?: Inline;
}
function gallery(
  tag: 'tg-collage' | 'tg-slideshow',
  items: readonly GalleryItem[],
  opts: GalleryOptions = {},
): BlockNode {
  return block(() => {
    const els = items
      .map((it) => mediaElement(it.type === 'video' ? 'video' : 'img', it.url, it.spoiler))
      .join('');
    const cap = opts.caption !== undefined || opts.credit !== undefined ? captionMarkup(opts) : '';
    return `<${tag}>${els}${cap}</${tag}>`;
  });
}
export const collage = (i: readonly GalleryItem[], o?: GalleryOptions) =>
  gallery('tg-collage', i, o);
export const slideshow = (i: readonly GalleryItem[], o?: GalleryOptions) =>
  gallery('tg-slideshow', i, o);

// table ---------------------------------------------------------------------
export interface TableCell {
  content?: Inline;
  header?: boolean;
  colspan?: number;
  rowspan?: number;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
}
export type TableCellInput = Inline | TableCell;
export interface TableOptions {
  bordered?: boolean;
  striped?: boolean;
  caption?: Inline;
}
function isTableCell(v: any): v is TableCell {
  return (
    typeof v === 'object' && v !== null && !Array.isArray(v) && !isInlineNode(v) && !isBlockNode(v)
  );
}
export function table(
  rows: readonly (readonly TableCellInput[])[],
  options: TableOptions = {},
): BlockNode {
  const maxCols = rows.reduce<number>((m, r) => {
    const cols = r.reduce<number>(
      (sum, cell) => sum + (isTableCell(cell) && cell.colspan ? cell.colspan : 1),
      0,
    );
    return Math.max(m, cols);
  }, 0);
  if (maxCols > 20) throw new TgRichError(`Table has ${maxCols} columns (max 20)`);
  return block(
    () => {
      const attrs: string[] = [];
      if (options.bordered) attrs.push('bordered');
      if (options.striped) attrs.push('striped');
      const open = attrs.length ? `<table ${attrs.join(' ')}>` : '<table>';
      const caption =
        options.caption !== undefined ? `<caption>${renderInline(options.caption)}</caption>` : '';
      const body = rows.map((row) => `<tr>${row.map(renderCell).join('')}</tr>`).join('');
      return `${open}${caption}${body}</table>`;
    },
    { rows: rows.length },
  );
}
function renderCell(cell: TableCellInput): string {
  const c: TableCell = isTableCell(cell) ? cell : { content: cell as Inline };
  const tag = c.header ? 'th' : 'td';
  const attrs: string[] = [];
  if (c.colspan) attrs.push(`colspan="${c.colspan}"`);
  if (c.rowspan) attrs.push(`rowspan="${c.rowspan}"`);
  if (c.align) attrs.push(`align="${c.align}"`);
  if (c.valign) attrs.push(`valign="${c.valign}"`);
  const open = attrs.length ? `<${tag} ${attrs.join(' ')}>` : `<${tag}>`;
  return `${open}${c.content !== undefined ? renderInline(c.content) : ''}</${tag}>`;
}

// details / map -------------------------------------------------------------
export function details(
  summary: Inline,
  content: Inline | BlockContent,
  opts: { open?: boolean } = {},
): BlockNode {
  const children = extractBlocks(content);
  return block(
    () =>
      `${opts.open ? '<details open>' : '<details>'}<summary>${renderInline(summary)}</summary>${renderFlow(content)}</details>`,
    { children },
  );
}
export interface MapOptions {
  caption?: Inline;
  credit?: Inline;
}
export function map(lat: number, long: number, zoom: number, opts: MapOptions = {}): BlockNode {
  if (!Number.isFinite(lat) || !Number.isFinite(long))
    throw new TgRichError('Map lat/long must be finite numbers');
  if (!Number.isInteger(zoom) || zoom < 13 || zoom > 20)
    throw new TgRichError('Map zoom must be an integer 13..20');
  return block(() => {
    const el = `<tg-map lat="${lat}" long="${long}" zoom="${zoom}"/>`;
    if (opts.caption === undefined && opts.credit === undefined) return el;
    return `<figure>${el}${captionMarkup(opts)}</figure>`;
  });
}

// document + payload --------------------------------------------------------
export interface InputRichMessage {
  html?: string;
  markdown?: string;
  is_rtl?: boolean;
  skip_entity_detection?: boolean;
}
export interface DocumentOptions {
  isRtl?: boolean;
  skipEntityDetection?: boolean;
}
const LIMITS = { textChars: 32768, blocks: 500, media: 50, maxDepth: 16 };

export class RichDocument {
  constructor(private readonly _blocks: readonly BlockNode[]) {}
  get blocks(): readonly BlockNode[] {
    return this._blocks;
  }
  toHTML(): string {
    return this._blocks.map((b) => b.render()).join('');
  }
  validate(): this {
    const html = this.toHTML();
    // Telegram limit is in UTF-8 characters (code points), not bytes.
    // This is an approximation: tags are stripped and basic entities are decoded.
    const chars = [...stripTagsToText(html)].length;
    if (chars > LIMITS.textChars)
      throw new TgRichError(`text is ${chars} characters (max ${LIMITS.textChars})`);
    const media = (html.match(/<(img|video|audio)\b/g) || []).length;
    if (media > LIMITS.media)
      throw new TgRichError(`${media} media attachments (max ${LIMITS.media})`);

    // block count and depth
    let totalBlocks = 0;
    const walk = (nodes: readonly BlockNode[], depth: number) => {
      for (const node of nodes) {
        totalBlocks++;
        if (depth > LIMITS.maxDepth) {
          throw new TgRichError(`Nesting depth ${depth} exceeds limit ${LIMITS.maxDepth}`);
        }
        const meta = node._meta;
        if (meta) {
          if (meta.children) {
            walk(meta.children, depth + 1);
          }
          if (meta.items) {
            for (const item of meta.items) {
              totalBlocks++; // list item is a separate block
              if (depth + 1 > LIMITS.maxDepth) {
                throw new TgRichError(
                  `Nesting depth ${depth + 1} exceeds limit ${LIMITS.maxDepth}`,
                );
              }
              const itemBlocks = extractBlocks(item.content);
              if (itemBlocks.length > 0) {
                walk(itemBlocks, depth + 2); // nesting inside the list item
              }
            }
          }
          if (meta.rows !== undefined) {
            totalBlocks += meta.rows; // table rows
          }
        }
      }
    };
    walk(this._blocks, 1);
    if (totalBlocks > LIMITS.blocks) {
      throw new TgRichError(`Total blocks ${totalBlocks} exceeds limit ${LIMITS.blocks}`);
    }
    return this;
  }
  toInputRichMessage(opts: DocumentOptions = {}): InputRichMessage {
    const msg: InputRichMessage = { html: this.toHTML() };
    if (opts.isRtl) msg.is_rtl = true;
    if (opts.skipEntityDetection) msg.skip_entity_detection = true;
    return msg;
  }
}
export function doc(...content: BlockContent[]): RichDocument {
  const blocks: BlockNode[] = [];
  const add = (c: BlockContent) =>
    Array.isArray(c) ? c.forEach(add) : blocks.push(c as BlockNode);
  content.forEach(add);
  return new RichDocument(blocks);
}

// fmtRich`` -----------------------------------------------------------------
export type FmtValue = Inline | BlockContent | RichDocument | null | undefined | false;
export function fmtRich(strings: TemplateStringsArray, ...values: FmtValue[]): RichDocument {
  const blocks: BlockNode[] = [];
  let buffer: Inline[] = [];
  const flush = () => {
    const buf = buffer;
    buffer = [];
    // coalesce consecutive strings so whitespace collapses across skipped values
    const merged: Inline[] = [];
    for (const part of buf) {
      const prev = merged[merged.length - 1];
      if (typeof part === 'string' && typeof prev === 'string') {
        merged[merged.length - 1] = prev + part;
      } else {
        merged.push(part);
      }
    }
    const norm: Inline[] = merged.map((part) =>
      typeof part === 'string' ? part.replace(/\s+/g, ' ') : part,
    );
    if (norm.length && typeof norm[0] === 'string') norm[0] = (norm[0] as string).replace(/^ /, '');
    const last = norm.length - 1;
    if (norm.length && typeof norm[last] === 'string')
      norm[last] = (norm[last] as string).replace(/ $/, '');
    const cleaned = norm.filter((part) => !(typeof part === 'string' && part === ''));
    const hasContent = cleaned.some(
      (part) =>
        isInlineNode(part) ||
        typeof part === 'number' ||
        (typeof part === 'string' && part.trim() !== ''),
    );
    if (hasContent) blocks.push(paragraph(cleaned));
  };
  const push = (v: FmtValue) => {
    if (v === null || v === undefined || v === false) return;
    if (Array.isArray(v)) {
      (v as readonly FmtValue[]).forEach(push);
      return;
    }
    if (v instanceof RichDocument) {
      flush();
      v.blocks.forEach((b) => blocks.push(b));
      return;
    }
    if (isBlockNode(v)) {
      flush();
      blocks.push(v);
      return;
    }
    buffer.push(v as Inline);
  };
  for (let i = 0; i < strings.length; i++) {
    if (strings[i] !== '') buffer.push(strings[i]);
    if (i < values.length) push(values[i]);
  }
  flush();
  return new RichDocument(blocks);
}
