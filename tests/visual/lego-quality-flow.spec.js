const { test, expect } = require("@playwright/test");

async function mountBuilder(page, options = {}) {
  const sdkBase = process.env.CI
    ? "https://api.leerpretpark.nl/api"
    : "http://127.0.0.1:47111/api";
  const sdkResponse = await page.request.get(
    `${sdkBase}/sdk/lego-builder/logic.js?bypass-tunnel-reminder=true`
  );
  expect(sdkResponse.ok()).toBe(true);
  const sdkBody = await sdkResponse.text();
  // Laad de component geïsoleerd. Zo is deze suite niet afhankelijk van de
  // asynchrone SDK-bootstrap en service-workerstatus van de volledige app.
  await page.goto("/style.css");
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addStyleTag({ url: "/style.css" });
  await page.addScriptTag({ content: sdkBody });
  await page.addScriptTag({ url: "/screen-interaction-manifest.js" });
  await page.addScriptTag({ url: "/lego-tower-renderer.js" });
  await page.addScriptTag({ url: "/lego-builder.js" });
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
  test("tutorial lijnt blokken zonder precieze plaatsing of handmatige rotatie uit", async ({ page }) => {
    await mountBuilder(page);
    const board = page.locator(".builder-board");

    await board.click({ position: { x: 20, y: 20 } });
    await board.click({ position: { x: 20, y: 20 } });
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(2);
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().rotated)).toBe(false);

    await board.click({ position: { x: 20, y: 20 } });
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(3);
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().tutorialStep)).toBe(2);
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().rotated)).toBe(false);

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

  test("parallelle productie accepteert het witte blok op een volgende torenlaag", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.LogisticsGameEngine && window.LogisticsGameUI);
    await page.evaluate(() => {
      document.body.className = "";
      document.body.innerHTML = '<main id="parallel-layer-test"></main>';
      const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
        playMode: "digital",
        productionProcesses: ["parallel"]
      });
      engine.started = true;
      engine.humanRoleId = "pd1";
      engine.orders.set("parallel-order", {
        id: "parallel-order",
        productId: "A",
        quantity: 1,
        dueAt: Date.now() + 300000,
        productionRoute: "parallel",
        productionDepartment: "pd1"
      });
      engine.roleRuntime.pd1.state = window.LogisticsGameEngine.ROLE_STATES.AWAITING_PLAYER;
      engine.roleRuntime.pd1.activeOrderId = "parallel-order";
      window.__parallelLayerController = window.LogisticsGameUI.mount(
        document.getElementById("parallel-layer-test"),
        { engine }
      );
    });

    const clickMarkedTarget = () => page.locator(".sim-inline-builder-board").evaluate(board => {
      const target = board.querySelector(".sim-builder-target polygon").getBoundingClientRect();
      board.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        clientX: target.x + target.width / 2,
        clientY: target.y + target.height / 2
      }));
    });
    for (const partId of ["yellow_8", "yellow_8", "red_8"]) {
      await page.locator(`[data-sim-drag-part="${partId}"]`).click();
      await clickMarkedTarget();
    }

    await expect(page.locator("body")).not.toContainText(
      "Alle torens voor deze order zijn al opgebouwd"
    );
    await page.locator('[data-sim-drag-part="white_4"]').click();
    await clickMarkedTarget();

    await expect.poll(() => page.evaluate(() => (
      window.__parallelLayerController.selectedParts.white_4
    ))).toBe(1);
    await expect(page.locator(".sim-inline-builder-status strong")).toHaveText("1 van 1 torens gebouwd");
  });
});
