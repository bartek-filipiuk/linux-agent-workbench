import type { Frame, Page } from "playwright";
import { ProtocolError, type BrowserReadInput, type BrowserReadResult } from "@law/protocol";

// Fixed code executed in the current document. No fetch, arbitrary expressions, HTML export or form values.
const READ_SCRIPT = String.raw`({ scope, maxChars }) => {
  const visible = el => {
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.opacity !== '0' && s.visibility !== 'hidden' && s.visibility !== 'collapse'
      && !el.hidden && el.getAttribute('aria-hidden') !== 'true';
  };
  const candidates = [...document.querySelectorAll('main,[role="main"],article')];
  const root = scope === 'main' ? candidates.find(el => {
    for (let p = el; p; p = p.parentElement) if (!visible(p)) return false;
    return el.getClientRects().length > 0;
  }) || document.body : document.body;
  const parts = []; let chars = 0, nodes = 0, truncated = false;
  const append = s => {
    const remaining = maxChars - chars;
    if (s.length > remaining) truncated = true;
    const part = s.slice(0, Math.max(0, remaining)); parts.push(part); chars += part.length;
  };
  const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[\\\x60*_\[\]]/g, c => String.fromCharCode(92) + c);
  const safeLink = value => {
    try {
      const u = new URL(value, document.baseURI);
      if (!['http:', 'https:'].includes(u.protocol)) return '';
      u.username = ''; u.password = '';
      for (const k of [...u.searchParams.keys()]) if (/token|secret|password|credential|session|^code$|^key$|signature/i.test(k)) u.searchParams.delete(k);
      u.hash = '';
      return u.href.slice(0, 4096).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/</g, '%3C').replace(/>/g, '%3E');
    } catch { return ''; }
  };
  const walk = (node, depth = 0) => {
    if (chars >= maxChars || ++nodes > 20000 || depth > 100) { truncated = true; return; }
    if (node.nodeType === Node.TEXT_NODE) { const raw = node.nodeValue || ''; if (raw.length > maxChars - chars) truncated = true; append(escape(raw.slice(0, maxChars - chars).replace(/\s+/g, ' '))); return; }
    if (!(node instanceof Element)) return;
    const tag = node.tagName.toLowerCase();
    if (['script','style','noscript','template','input','textarea','select','option','button','iframe','canvas','svg'].includes(tag)
      || node.isContentEditable || ['textbox','combobox'].includes(node.getAttribute('role')) || !visible(node)) return;
    const style = getComputedStyle(node);
    if (style.display !== 'contents' && !node.getClientRects().length) return;
    const block = /^(h[1-6]|p|div|section|article|main|header|footer|aside|nav|ul|ol|li|blockquote|pre|table|tr)$/.test(tag);
    if (block) append('\n');
    if (/^h[1-6]$/.test(tag)) append('#'.repeat(Number(tag[1])) + ' ');
    if (tag === 'li') append('- ');
    if (tag === 'br') append('\n');
    if (tag === 'td' || tag === 'th') append(' | ');
    const link = tag === 'a' ? safeLink(node.getAttribute('href') || '') : '';
    if (link) append('[');
    if (tag === 'img') append(escape(node.getAttribute('alt') || ''));
    // Traverse the rendered shadow tree (including assigned slots), not hidden light DOM duplicates.
    const children = tag === 'slot' && node.assignedNodes().length ? node.assignedNodes() : (node.shadowRoot || node).childNodes;
    for (const child of children) {
      if (tag === 'details' && !node.open && child.nodeName !== 'SUMMARY') continue;
      walk(child, depth + 1);
      if (chars >= maxChars || nodes > 20000) break;
    }
    if (link) append('](' + link + ')');
    if (block) append('\n');
  };
  if (root) walk(root);
  return { content: parts.join('').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), truncated };
}`;

export function sourceUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.username = ""; url.password = ""; url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/token|secret|password|credential|session|^code$|^key$|signature/i.test(key)) url.searchParams.delete(key);
    return url.href.slice(0, 4096);
  } catch { return ""; }
}

export async function readPage(page: Page, pageId: string, input: BrowserReadInput, maxChars = 200_000): Promise<BrowserReadResult> {
  const url = page.url();
  if (!sourceUrl(url)) throw new ProtocolError("INVALID_INPUT", "Open an HTTP or HTTPS page before reading");
  const warnings = ["Loaded rendered content only; scroll or expand the page and read again for lazy-loaded content. Form fields and hidden content are excluded."];
  const capturedAt = new Date().toISOString();
  const title = (await page.title()).slice(0, 1000);
  const sections: string[] = [];
  let remaining = Math.min(200_000, Math.max(1000, maxChars)), truncated = false;
  const frames = page.frames();
  if (frames.length > 16) { truncated = true; warnings.push("Frame limit reached (16)."); }
  for (const frame of frames.slice(0, 16)) {
    if (remaining < 1000) { truncated = true; break; }
    const main = frame === page.mainFrame();
    if (!main) {
      let rendered = true;
      for (let parent: Frame | null = frame; parent && parent !== page.mainFrame(); parent = parent.parentFrame()) {
        const element = await parent.frameElement().catch(() => null);
        if (!element) { rendered = false; break; }
        try {
          if (!await element.isVisible() || !await element.evaluate(el => {
            let node = el;
            while (node) {
              if (node.ownerDocument.defaultView?.getComputedStyle(node).opacity === "0") return false;
              if (node.matches('[aria-hidden="true"],[hidden],input,textarea,select,[contenteditable="true"],[role="textbox"]')) return false;
              node = node.parentElement || (node.getRootNode() as { host: typeof el }).host;
            }
            return true;
          })) { rendered = false; break; }
        } finally { await element.dispose(); }
      }
      if (!rendered) continue;
    }
    try {
      const frameUrl = frame.url();
      const prefix = main ? "" : `Embedded frame (${sourceUrl(frameUrl) || "embedded document"}):\n`;
      if (remaining <= prefix.length + 2) { truncated = true; break; }
      const data = await frame.evaluate(`(${READ_SCRIPT})(${JSON.stringify({ scope: input.scope ?? "main", maxChars: remaining - prefix.length - 2 })})`) as { content: string; truncated: boolean };
      if (frame.url() !== frameUrl) throw new Error("Frame changed during capture");
      if (data.content) {
        const section = prefix + data.content;
        sections.push(section.slice(0, remaining)); remaining -= Math.min(section.length + 2, remaining);
      }
      truncated ||= data.truncated;
    } catch (error) {
      if (main) throw error;
      truncated = true;
      warnings.push("An embedded frame could not be read; this capture is incomplete.");
    }
  }
  if (page.url() !== url) throw new ProtocolError("STALE_OBSERVATION", "Page navigated while reading; read again");
  if (truncated) warnings.push("Capture incomplete: a limit was reached (200,000 characters, 16 frames, 20,000 nodes per frame, depth 100) or a frame was unavailable.");
  const content = sections.join("\n\n").slice(0, 200_000);
  if (!content) warnings.push("No readable text found; try scope=page, wait for content, or inspect a screenshot.");
  return { pageId, url: sourceUrl(url), title, capturedAt, content, truncated, warnings };
}
