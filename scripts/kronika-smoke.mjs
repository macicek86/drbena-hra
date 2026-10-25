import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

async function smoke(label, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  page.on("console", (msg) => { if (msg.type() === "error") errors.push("console: " + msg.text()); });
  const response = await page.goto(BASE, { waitUntil: "domcontentloaded" });
  console.log("Loaded", label, page.url(), response?.status(), await page.title());
  try {
    await page.getByText("Klepni a pokračuj").waitFor({ timeout: 18000 });
  } catch (error) {
    console.log("DIAGNOSTIC", label, JSON.stringify({ title: await page.title(), body: (await page.locator("body").innerText()).slice(0, 1500), errors, url: page.url() }));
    throw error;
  }
  await page.getByText("Klepni a pokračuj").click();

  const menuBook = page.getByRole("button", { name: /Kronika Kopidlna/ });
  await menuBook.waitFor({ timeout: 10000 });
  // The main menu must be centered and entirely visible without scrolling.
  await page.waitForTimeout(100);
  const layout = await page.evaluate(() => {
    const menu = document.querySelector(".menu-fit");
    const section = menu?.querySelector("section");
    if (!menu || !section) return null;
    const rect = section.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      center: (rect.top + rect.bottom) / 2,
      viewportHeight: menu.clientHeight,
      menuFont: parseFloat(getComputedStyle(menu).fontSize),
      overflowY: getComputedStyle(menu).overflowY,
      scrollable: menu.scrollHeight > menu.clientHeight + 1,
    };
  });
  assert.ok(layout, label + ": main menu must be rendered");
  assert.equal(layout.overflowY, "hidden", label + ": menu must not scroll");
  assert.equal(layout.scrollable, false, label + ": menu must not overflow");
  assert.ok(layout.top >= -1 && layout.bottom <= layout.viewportHeight + 1, label + ": menu must fit on screen");
  assert.ok(Math.abs(layout.center - layout.viewportHeight / 2) < 4, label + ": menu must be centered");
  if (label === "malý notebook") assert.ok(layout.menuFont >= 11, label + ": menu must not be miniature");
  console.log("FIT", label, JSON.stringify(layout));
  assert.match(await menuBook.innerText(), /0\/60/);
  await menuBook.click();

  const book = page.getByRole("heading", { name: "Kronika", exact: true });
  await book.waitFor({ timeout: 10000 });
  await page.getByText("0 z 60", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Zavřít kroniku" }).click();
  await menuBook.waitFor();

  await page.getByRole("button", { name: "Vyrazit" }).click();
  await page.getByRole("button", { name: "Pauza" }).waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Pauza" }).click();
  await page.getByRole("heading", { name: "Pauza" }).waitFor();
  await page.getByRole("button", { name: "Kronika 0/60" }).click();
  await book.waitFor();
  await page.getByRole("button", { name: "Zavřít kroniku" }).click();
  await page.getByRole("heading", { name: "Pauza" }).waitFor();
  assert.deepEqual(errors, [], label + ": no uncaught browser errors expected");
  console.log("OK", label, "kronika v menu i během pauzy");
  await context.close();
}

try {
  await smoke("mobil", { width: 390, height: 844 });
  await smoke("malý mobil", { width: 360, height: 640 });
  await smoke("malý notebook", { width: 1024, height: 600 });
  await smoke("notebook", { width: 1366, height: 768 });
  await smoke("desktop", { width: 1280, height: 800 });
} finally {
  await browser.close();
}
