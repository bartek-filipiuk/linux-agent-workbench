import { expect, it } from "vitest";
import fs from "node:fs";
import http from "node:http";
import { BrowserSession } from "../src/browser-session.js";

it("presents the configured locale and time zone to sites, including the Accept-Language header", async () => {
  let acceptLanguage = "";
  const server = http.createServer((req, res) => { acceptLanguage = String(req.headers["accept-language"] ?? ""); res.setHeader("Content-Type", "text/html"); res.end("<title>Locale fixture</title>"); });
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  const profile = fs.mkdtempSync("/tmp/law-browser-locale-");
  const s = new BrowserSession({ profileDir: profile, locale: "pl-PL", timeZone: "Europe/Warsaw" });
  try {
    await s.start();
    await s.navigate(`http://127.0.0.1:${(server.address() as { port: number }).port}/`);
    expect(acceptLanguage.startsWith("pl-PL")).toBe(true);
    const page = (s as unknown as { active: { page: { evaluate(s: string): Promise<unknown> } } }).active.page;
    expect(await page.evaluate("navigator.language + ' ' + Intl.DateTimeFormat().resolvedOptions().timeZone")).toBe("pl-PL Europe/Warsaw");
  } finally { await s.close(); await new Promise<void>(r => server.close(() => r())); fs.rmSync(profile, { recursive: true, force: true }); }
}, 30000);
