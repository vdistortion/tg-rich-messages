import {
  BlockContent,
  BlockNode,
  Inline,
  InlineNode,
  LabelType,
  ListItemMeta,
  TgRichError,
  block,
  escapeAttr,
  escapeText,
  renderFlow,
  renderInline,
  isBlockNode,
  isInlineNode,
} from './core.js';
import { captionMarkup } from './media.js';

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
export const thinking = (text: Inline) =>
  block(() => `<tg-thinking>${renderInline(text)}</tg-thinking>`);
export const anchor = (name: string) => block(() => `<a name="${escapeAttr(name)}"></a>`);

// list ----------------------------------------------------------------------
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
export function extractBlocks(content: Inline | BlockContent): BlockNode[] {
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

export interface BlockquoteOptions {
  expandable?: boolean;
}
export function blockquote(
  content: Inline | BlockContent,
  credit?: Inline,
  options: BlockquoteOptions = {},
): BlockNode {
  const children = extractBlocks(content);
  return block(
    () => {
      const c = credit !== undefined ? `<cite>${renderInline(credit)}</cite>` : '';
      return `<blockquote${options.expandable ? ' expandable' : ''}>${renderFlow(content)}${c}</blockquote>`;
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

export interface ButtonRowOptions {
  align?: 'left' | 'center' | 'right';
}
export function buttonRow(
  buttons: readonly InlineNode[],
  options: ButtonRowOptions = {},
): BlockNode {
  return block(() => {
    const align = options.align ? ` align="${options.align}"` : '';
    return `<tg-button-row${align}>${buttons.map((b) => b.render()).join('')}</tg-button-row>`;
  });
}

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
  compact?: boolean;
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
      if (options.compact) attrs.push('compact');
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
