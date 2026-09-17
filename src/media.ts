import { BlockNode, Inline, block, escapeAttr, renderInline } from './core.js';

// media ---------------------------------------------------------------------
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
export function captionMarkup(opts: MediaOptions): string {
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
export function document(url: string, opts: MediaOptions = {}): BlockNode {
  return block(() => {
    const el = `<tg-document src="${escapeAttr(url)}"></tg-document>`;
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
