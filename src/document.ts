import {
  BlockContent,
  BlockNode,
  Inline,
  TgRichError,
  block,
  isBlockNode,
  isInlineNode,
  renderInline,
  stripTagsToText,
} from './core.js';
import { extractBlocks, paragraph } from './blocks.js';

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
    const media = (html.match(/<(img|video|audio|tg-document)\b/g) || []).length;
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
