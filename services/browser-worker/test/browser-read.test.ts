import { afterAll, beforeAll, expect, it } from "vitest";
import fs from "node:fs";
import http from "node:http";
import type { BrowserContext } from "playwright";
import { BrowserSession } from "../src/browser-session.js";

let requests = 0;
const server = http.createServer((req, res) => {
  requests++;
  res.setHeader("Content-Type", "text/html");
  if (req.url === "/frame") { res.end("<p>Embedded article text.</p>"); return; }
  res.end(`<title>Research fixture</title><nav>Navigation only <a href="/menu">Menu</a></nav>
    <main><h1>Full biography</h1><p>Paragraph without any clickable elements. ${"More detail. ".repeat(30)}</p>
    <ul><li>First achievement</li></ul><table><tr><th>Year</th><th>Event</th></tr><tr><td>2002</td><td>Champion</td></tr></table>
    <a href="/source?token=PRIVATE_TOKEN&amp;q=biography">Original source</a>
    <p style="opacity:0">TRANSPARENT_SENTINEL</p><p hidden>HIDDEN_SENTINEL</p><div aria-hidden="true">ARIA_SENTINEL</div><div style="display:none">CSS_SENTINEL</div>
    <input value="INPUT_SECRET"><input type=password value="PASSWORD_SECRET"><textarea>TEXTAREA_SECRET</textarea>
    <div contenteditable="true">EDITABLE_SECRET</div><select><option>SELECT_SECRET</option></select>
    <details><summary>Expand details</summary><p>CLOSED_SENTINEL</p></details>
    <div id="dynamic"></div><div id="shadow"></div><button id="more">Load more</button>
    </main><iframe src="/frame"></iframe><iframe style="opacity:0" srcdoc="<p>TRANSPARENT_FRAME_SENTINEL</p>"></iframe><iframe aria-hidden="true" srcdoc="<p>FRAME_HIDDEN_SENTINEL</p>"></iframe>
    <script>document.querySelector('#dynamic').textContent='JavaScript-rendered paragraph.';
    document.querySelector('#shadow').attachShadow({mode:'open'}).innerHTML='<p>Shadow article text.</p>';
    document.querySelector('#more').onclick=()=>document.querySelector('main').insertAdjacentHTML('beforeend','<p>Newly loaded paragraph.</p>');</script>`);
});
const profileDir = fs.mkdtempSync("/tmp/law-read-test-");
const session = new BrowserSession({ profileDir });
const page = () => (session as unknown as { context: BrowserContext }).context.pages()[0]!;
beforeAll(async () => {
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  await session.start();
  await session.navigate(`http://127.0.0.1:${(server.address() as { port: number }).port}/`);
  await page().waitForLoadState("networkidle");
});
afterAll(async () => { await session.close(); await new Promise<void>(r => server.close(() => r())); fs.rmSync(profileDir, { recursive: true, force: true }); });

it("reads rendered paragraphs, tables, dynamic content and frames without fetching again or exporting fields", async () => {
  const before = requests;
  const read = await session.read();
  expect(read.content).toContain("Paragraph without any clickable elements.");
  expect(read.content).toContain("More detail. ".repeat(20).trim());
  for (const text of ["# Full biography", "First achievement", "2002", "Champion", "JavaScript-rendered paragraph.", "Shadow article text.", "Embedded article text."]) expect(read.content).toContain(text);
  for (const text of ["PRIVATE_TOKEN", "_SENTINEL", "_SECRET", "Navigation only", "insertAdjacentHTML"]) expect(read.content).not.toContain(text);
  expect(read.content).toContain("q=biography");
  expect(read.truncated).toBe(false);
  expect(requests).toBe(before);
  expect((await session.read({ scope: "page" })).content).toContain("Navigation only");
});
it("captures newly expanded content on the next read", async () => {
  const before = await session.read();
  await page().locator("#more").click();
  const after = await session.read();
  expect(before.content).not.toContain("Newly loaded paragraph.");
  expect(after.content).toContain("Newly loaded paragraph.");
});
it("bounds huge captures, reports truncation and never includes raw HTML or Markdown image syntax", async () => {
  await page().locator("main").evaluate(el => { el.textContent = '<script>bad()</script> ![image](https://example.com/tracker) ' + 'Long text. '.repeat(30000); });
  const read = await session.read();
  expect(read.content.length).toBeLessThanOrEqual(200_000);
  expect(read.truncated).toBe(true);
  expect(read.content).not.toContain("<script>");
  expect(read.content).not.toContain("![image]");
  expect(read.warnings.join(" ")).toMatch(/limit/);
});
