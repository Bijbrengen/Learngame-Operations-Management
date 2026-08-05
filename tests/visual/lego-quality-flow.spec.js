const { test, expect } = require("@playwright/test");

async function mountBuilder(page, options = {}) {
  await page.goto("/");
  await page.waitForFunction(() => (
    window.LegoBuilder
    && Object.keys(window.LegoBuilder.getCatalog()).length >= 3
  ));
  await page.evaluate(({ mode, randomValue }) => {
    document.body.className = "";
    document.body.innerHTML = '<main id="builder-quality-test"></main>';
    window.__builderDeliveries = [];
    window.LegoBuilder.mount(document.getElementById("builder-quality-test"), {
      onDelivered: delivery => window.__builderDeliveries.push(delivery)
    });
    if (mode) {
      window.LegoBuilder.setCustomerDecision({
        mode,
        tolerance: 0.3,
        random: () => randomValue
      });
    }
  }, options);
}

test.describe("LEGO-rotatie en klantkwaliteit", () => {
  test("tutorial vereist dat het rode lange blok handmatig wordt gedraaid", async ({ page }) => {
    await mountBuilder(page);
    const board = page.locator(".builder-board");

    await board.click({ position: { x: 240, y: 220 } });
    await board.click({ position: { x: 240, y: 220 } });
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(2);
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().rotated)).toBe(false);

    await board.click({ position: { x: 240, y: 220 } });
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(2);
    await expect(page.locator(".builder-feedback")).toContainText("transparante hulpblok");

    await page.locator(".builder-rotate").click();
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().rotated)).toBe(true);
    await board.click({ position: { x: 240, y: 220 } });
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(3);

    const missing = await page.evaluate(() => (
      window.LEARNGameInteractionManifest.validate("lego_tutorial")
    ));
    expect(missing).toEqual([]);
  });

  test("menselijke klant beslist zelf over een afwijkende levering", async ({ page }) => {
    await mountBuilder(page, { mode: "human", randomValue: 0 });
    await page.evaluate(() => window.LegoBuilder.startFreeBuild("A"));
    await page.locator(".builder-deliver").click();

    await expect(page.locator(".builder-customer-decision")).toBeVisible();
    await page.locator("[data-customer-accept]").click();
    const delivery = await page.evaluate(() => window.__builderDeliveries.at(-1));
    expect(delivery.accepted).toBe(true);
    expect(delivery.correct).toBe(false);
    await expect(page.locator(".builder-feedback")).toContainText("contextafhankelijk");
  });

  test("agent past de ingestelde tolerantiekans toe", async ({ page }) => {
    await mountBuilder(page, { mode: "agent", randomValue: 0.9 });
    await page.evaluate(() => window.LegoBuilder.startFreeBuild("A"));
    await page.locator(".builder-deliver").click();

    const delivery = await page.evaluate(() => window.__builderDeliveries.at(-1));
    expect(delivery.accepted).toBe(false);
    expect(delivery.customerDecisionMode).toBe("agent");
    await expect(page.locator(".builder-feedback")).toContainText("weigert");
  });
});
