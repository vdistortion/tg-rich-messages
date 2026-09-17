import { escapeText, escapeAttr, inline, renderInline, wrap, Inline, InlineNode } from './core.js';

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

// buttons --------------------------------------------------------------------
export type RichButtonType =
  | 'url'
  | 'callback_data'
  | 'web_app'
  | 'login_url'
  | 'switch_inline_query'
  | 'switch_inline_query_current_chat'
  | 'switch_inline_query_chosen_chat'
  | 'copy_text'
  | 'disabled';
export type RichButtonStyle = 'danger' | 'success' | 'primary' | 'link';
export interface ButtonOptions {
  type: RichButtonType;
  style?: RichButtonStyle;
  url?: string;
  data?: string;
  forwardText?: string;
  requestWriteAccess?: boolean;
  query?: string;
  text?: string;
  allowUserChats?: boolean;
  allowBotChats?: boolean;
  allowGroupChats?: boolean;
  allowChannelChats?: boolean;
}
function buttonAttrs(options: ButtonOptions): string {
  const attrs: string[] = [`type="${options.type}"`];
  const add = (name: string, value: string | undefined) => {
    if (value !== undefined) attrs.push(`${name}="${escapeAttr(value)}"`);
  };
  if (options.style) add('style', options.style);
  add('url', options.url);
  add('data', options.data);
  add('forward-text', options.forwardText);
  add('query', options.query);
  add('text', options.text);
  for (const [key, attr] of [
    ['requestWriteAccess', 'request-write-access'],
    ['allowUserChats', 'allow-user-chats'],
    ['allowBotChats', 'allow-bot-chats'],
    ['allowGroupChats', 'allow-group-chats'],
    ['allowChannelChats', 'allow-channel-chats'],
  ] as const) {
    if (options[key]) attrs.push(attr);
  }
  return attrs.join(' ');
}
export const button = (content: Inline, options: ButtonOptions) =>
  inline(() => `<tg-button ${buttonAttrs(options)}>${renderInline(content)}</tg-button>`);
