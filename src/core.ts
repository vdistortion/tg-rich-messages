// Shared node model, rendering primitives, and escaping utilities.

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

export type LabelType = 'a' | 'A' | 'i' | 'I' | '1';
export interface ListItemMeta {
  content: Inline | BlockContent;
  checkbox?: boolean;
  checked?: boolean;
  value?: number;
  type?: LabelType;
}

interface BlockMeta {
  children?: readonly BlockNode[];
  items?: readonly ListItemMeta[];
  rows?: number;
}

export function isInlineNode(v: unknown): v is InlineNode {
  return typeof v === 'object' && v !== null && (v as any)[KIND] === 'inline';
}
export function isBlockNode(v: unknown): v is BlockNode {
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
export const escapeAttr = escapeText;

// reverse of escapeText, used only for length estimation in validate()
const UNESC: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};
export function stripTagsToText(html: string): string {
  const noTags = html.replace(/<[^>]*>/g, '');
  return noTags.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => UNESC[m] ?? m);
}

// ----- renderers -----------------------------------------------------------
export function renderInline(content: Inline): string {
  if (typeof content === 'string') return escapeText(content);
  if (typeof content === 'number') return escapeText(String(content));
  if (Array.isArray(content)) return content.map(renderInline).join('');
  if (isInlineNode(content)) return content.render();
  throw new TgRichError(`Invalid inline content: ${String(content)}`);
}
export function renderFlow(content: Inline | BlockContent): string {
  if (Array.isArray(content)) return content.map((c) => renderFlow(c as any)).join('');
  if (isBlockNode(content)) return content.render();
  return renderInline(content as Inline);
}
export function inline(render: () => string): InlineNode {
  return { [KIND]: 'inline', render };
}
export function block(render: () => string, meta?: BlockMeta): BlockNode {
  return { [KIND]: 'block', render, _meta: meta };
}
export function wrap(name: string, content: Inline): InlineNode {
  return inline(() => `<${name}>${renderInline(content)}</${name}>`);
}
