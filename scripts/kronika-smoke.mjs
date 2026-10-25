import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

async function smoke(label, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByText("Klepni a pokračuj").waitFor({ timeout: 45000 });
  await page.getByText("Klepni a pokračuj").click();

  const menuBook = page.getByRole("button", { name: /Kronika Kopidlna/ });
  await menuBook.waitFor({ timeout: 10000 });
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
  await page.getByRole("button", { name: "Pokračovat" }).waitFor();
  assert.deepEqual(errors, [], label + ": no uncaught browser errors expected");
  console.log("OK", label, "kronika v menu i během pauzy");
  await context.close();
}

try {
  await smoke("mobil", { width: 390, height: 844 });
  await smoke("desktop", { width: 1280, height: 800 });
} finally {
  await browser.close();
}
