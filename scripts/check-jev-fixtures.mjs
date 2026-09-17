import { chromium } from "../services/browser-worker/node_modules/playwright/index.mjs";
import { startFixtures, scenarios } from "./jev-fixtures.mjs";
import { pathToFileURL } from "node:url";

export async function checkFixtures(url) {
  const browser = await chromium.launch(); const errors = [];
  try {
    for (const task of scenarios) {
      const context = await browser.newContext(); const page = await context.newPage();
      page.on("pageerror", error => errors.push(`${task.id}: ${error.message}`));
      await page.goto(`${url}/${task.id}`);
      let resultPage = page;
      switch (task.id) {
        case "search": await page.getByLabel("Search catalog").fill("blue notebook"); await page.getByRole("button", { name: "Search", exact: true }).click(); break;
        case "filters": await page.getByLabel("Category").selectOption("Books"); await page.getByLabel("In stock").check(); await page.getByRole("button", { name: "Apply filters" }).click(); break;
        case "autocomplete": await page.getByLabel("Destination", { exact: true }).fill("Paris"); await page.getByRole("button", { name: "Paris, France" }).click(); break;
        case "form": await page.getByLabel("Name", { exact: true }).fill("Ada"); await page.getByLabel("Department").selectOption("Research"); await page.getByRole("button", { name: "Preview" }).click(); break;
        case "navigation": await page.getByRole("link", { name: "Documentation" }).click(); await page.getByRole("link", { name: "Installation guide" }).click(); break;
        case "tabs": { const opened = context.waitForEvent("page"); await page.getByRole("link", { name: "Open reference" }).click(); resultPage = await opened; await resultPage.waitForLoadState(); break; }
        case "scroll": await page.getByRole("button", { name: "More details" }).click(); break;
        case "disclosure": await page.locator("summary").filter({ hasText: "Shipping" }).click(); break;
      }
      if (!(await resultPage.locator("body").innerText()).includes(task.expected)) errors.push(`${task.id}: fixture cannot reach expected result`);
      await context.close();
    }
  } finally { await browser.close(); }
  if (errors.length) throw new Error(errors.join("\n"));
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const site = await startFixtures();
  try { await checkFixtures(site.url); console.log("All 8 fixtures reach their independently specified result."); } finally { await site.close(); }
}
