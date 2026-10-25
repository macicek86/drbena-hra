import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const sizes = [
  ["malý mobil", 320, 480],
  ["mobil na šířku", 667, 375],
  ["mobil", 390, 844],
  ["malý notebook", 1024, 600],
  ["notebook", 1366, 768],
  ["desktop", 1280, 800],
];

async function assertPanelFits(page, name, mode) {
  const overlay = page.locator(`[data-fit-overlay="${mode}"]`);
  await overlay.waitFor();
  await page.waitForTimeout(120);
  const m = await overlay.evaluate((el) => {
    const wrap = el.querySelector("[data-fit-content]");
    const panel = wrap?.querySelector("section");
    if (!wrap || !panel) return null;
    const frame = el.getBoundingClientRect();
    const area = wrap.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    return {
      zoom: Number(getComputedStyle(wrap).zoom),
      top: p.top,
      bottom: p.bottom,
      left: p.left,
      right: p.right,
      frameTop: frame.top,
      frameBottom: frame.bottom,
      frameLeft: frame.left,
      frameRight: frame.right,
      panelOverflow: panel.scrollHeight > panel.clientHeight + 1,
      contentOverflow: wrap.scrollHeight > wrap.clientHeight + 1,
      overlayOverflow: getComputedStyle(el).overflowY,
    };
  });
  assert.ok(m, name + " " + mode + ": panel exists");
  assert.ok(m.zoom > 0 && m.zoom <= 1.001, name + " " + mode + ": scale is sensible");
  assert.ok(m.top >= m.frameTop - 1 && m.bottom <= m.frameBottom + 1, name + " " + mode + ": height fits");
  assert.ok(m.left >= m.frameLeft - 1 && m.right <= m.frameRight + 1, name + " " + mode + ": width fits");
  assert.equal(m.panelOverflow, false, name + " " + mode + ": no internal panel scrollbar");
  assert.equal(m.contentOverflow, false, name + " " + mode + ": no wrapper overflow");
  assert.equal(m.overlayOverflow, "hidden", name + " " + mode + ": no overlay scroll");
  console.log("FIT", name, mode, JSON.stringify(m));
}

try {
  for (const [name, width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("http://127.0.0.1:4174/scripts/panel-fit-fixture.html", { waitUntil: "domcontentloaded" });
    await assertPanelFits(page, name, "over");
    await page.getByTestId("add-row").click();
    await assertPanelFits(page, name + " extended", "over");
    await page.getByTestId("switch-mode").click();
    await assertPanelFits(page, name, "bonus");
    await page.getByTestId("add-row").click();
    await assertPanelFits(page, name + " extended", "bonus");
    assert.deepEqual(errors, [], name + ": no browser errors");
    await context.close();
  }
} finally {
  await browser.close();
}
