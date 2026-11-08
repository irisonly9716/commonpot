// Renders each screen in docs/design/mockup.html to a PNG next to it (issue #5).
// Usage: node scripts/render-mockups.mjs   (needs the Playwright browsers: npx playwright install chromium)
import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const designDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../docs/design",
);
const page_url = pathToFileURL(path.join(designDir, "mockup.html")).href;

// One PNG per screen: [element id in mockup.html, file name].
const screens = [
  ["home", "group-home.png"],
  ["add", "add-expense-equal.png"],
  ["exact", "add-expense-exact.png"],
  ["settle", "settle-up.png"],
  ["insights", "insights.png"],
];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
for (const [id, file] of screens) {
  await page.goto(`${page_url}#${id}`);
  await page.locator(`#${id}`).screenshot({ path: path.join(designDir, file) });
  console.log("wrote", file);
}
await browser.close();
