const { test, expect } = require("@playwright/test");

async function mountBuilder(page, options = {}) {
  const sdkBase = process.env.CI
    ? "https://api.leerpretpark.nl/api"
    : "http://127.0.0.1:47111/api";
  const manifestResponse = await page.request.get(`${sdkBase}/sdk/manifest.json`);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  // Laad de component geïsoleerd via dezelfde dependencygraph als productie.
  await page.goto("/style.css");
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addStyleTag({ url: "/style.css" });
  await page.addScriptTag({ url: `${sdkBase}/sdk/sdk-loader/loader.js?v=${manifest.version}` });
  await page.evaluate(async ({ sdkBase, manifest }) => {
    await window.LeerpretSDK.Loader.create({ base: sdkBase, manifest }).load(["lego-renderer", "lego-builder"]);
  }, { sdkBase, manifest });
  await page.addScriptTag({ url: "/screen-interaction-manifest.js" });
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

async function placeTutorialAt(page, x, y, z, width = 2, depth = 4) {
  await page.evaluate(({ x, y, z, width, depth }) => {
    const board = document.querySelector(".builder-board");
    const rect = board.getBoundingClientRect();
    const projected = window.LegoTowerRenderer.iso(x + width / 2, y + depth / 2, 0.22 + z * 0.78 + 0.04);
    const svgX = 170 + projected[0] * 2;
    const svgY = 62 + projected[1] * 2;
    board.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      button: 0,
      clientX: rect.left + svgX / 520 * rect.width,
      clientY: rect.top + svgY / 420 * rect.height
    }));
  }, { x, y, z, width, depth });
}

test.describe("LEGO-rotatie en klantkwaliteit", () => {
  test("tutorial vraagt rotatie en toont hulp bij juiste plek met verkeerde richting", async ({ page }) => {
    await mountBuilder(page);
    const board = page.locator(".builder-board");
    const selectedFoundationBrick = page.locator('[data-piece-type="yellow_8"]');

    await selectedFoundationBrick.click();
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().rotated)).toBe(true);
    await selectedFoundationBrick.click();
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().rotated)).toBe(false);

    await board.click({ position: { x: 20, y: 20 } });
    await board.click({ position: { x: 20, y: 20 } });
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(2);

    await placeTutorialAt(page, 2, 1, 1);
    await expect(page.locator(".builder-rotation-help")).toBeVisible();
    await expect(page.locator(".builder-feedback")).toContainText("juiste plek");
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(2);
    await page.locator("[data-rotate-from-help]").click();
    await expect(page.locator(".builder-rotation-help")).toBeHidden();
    await placeTutorialAt(page, 1, 2, 1, 4, 2);
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

  test("voorraadbouw laat een vrij blok terug in zijn LEGO-bak leggen", async ({ page }) => {
    await mountBuilder(page);
    await page.evaluate(() => {
      window.LegoBuilder.prepareStockTutorial("B");
      window.LegoBuilder.setStockTutorialInventory({
        blue_8: 2,
        yellow_4: 1,
        green_4: 1
      });
    });

    await expect(page.locator(".builder-inventory-bin")).toHaveCount(3);
    await placeTutorialAt(page, 1, 1, 0, 2, 4);
    await placeTutorialAt(page, 3, 1, 0, 2, 4);
    await page.locator('[data-piece-type="yellow_4"]').click();
    await placeTutorialAt(page, 2, 2, 1, 2, 2);
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(3);

    const dragToBin = async (brickIndex, pieceType) => {
      const brick = page.locator(`[data-builder-brick-index="${brickIndex}"]`);
      const bin = page.locator(`[data-piece-type="${pieceType}"]`);
      const faces = brick.locator("polygon");
      expect(await faces.count()).toBeGreaterThan(0);
      const brickBox = await faces.nth(0).boundingBox();
      const binBox = await bin.boundingBox();
      expect(brickBox).not.toBeNull();
      expect(binBox).not.toBeNull();
      const grabX = brickBox.x + brickBox.width / 2;
      const grabY = brickBox.y + brickBox.height / 2;
      await page.mouse.move(grabX, grabY);
      await page.mouse.down();
      await page.mouse.move(binBox.x + binBox.width / 2, binBox.y + binBox.height / 2, { steps: 8 });
      await expect(brick).toHaveClass(/is-dragging/);
      await expect(bin).toHaveClass(/is-return-target/);
      await page.mouse.up();
    };

    await dragToBin(2, "yellow_4");
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(2);
    await expect.poll(() => page.evaluate(() => (
      window.LegoBuilder.getSnapshot().availableStock.yellow_4
    ))).toBe(1);
    await expect(page.locator(".builder-feedback")).toContainText("teruggelegd");
  });

  test("parallelle productie accepteert het witte blok op een volgende torenlaag", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => (
      window.LogisticsGameEngine
      && window.LogisticsGameUI
      && window.LeerpretSDK?.components?.["lego-builder"]?.logic
    ));
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
