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
  if (id === "insights") await checkTrendBars(page);
  await page.locator(`#${id}`).screenshot({ path: path.join(designDir, file) });
  console.log("wrote", file);
}
await browser.close();

/**
 * The 6-month bars must be drawn in proportion to their amounts. Percentage
 * heights silently collapse to equal bars inside a grid row, so measure what
 * was actually rendered and fail if it does not match the numbers.
 */
async function checkTrendBars(page) {
  const bars = await page.$$eval(".trend .bar-v", (els) =>
    els.map((el) => ({
      value: Number(el.getAttribute("data-value")),
      height: el.getBoundingClientRect().height,
    })),
  );
  if (bars.length === 0) throw new Error("No trend bars found");
  const tallest = Math.max(...bars.map((b) => b.height));
  const largest = Math.max(...bars.map((b) => b.value));
  for (const bar of bars) {
    const expected = bar.value / largest;
    const actual = bar.height / tallest;
    if (!(Math.abs(expected - actual) <= 0.02)) {
      throw new Error(
        `Trend bar for $${bar.value} is ${(actual * 100).toFixed(0)}% of the tallest, expected ${(expected * 100).toFixed(0)}%`,
      );
    }
  }
}
