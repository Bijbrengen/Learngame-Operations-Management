const { test, expect } = require("./fixtures");

async function loadIsolatedLegoComponents(page) {
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
}

async function mountBuilder(page, options = {}) {
  await loadIsolatedLegoComponents(page);
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

async function dragPlacedBrickToBin(page, brickIndex, pieceType) {
  const brick = page.locator(`[data-builder-brick-index="${brickIndex}"]`);
  const bin = page.locator(`[data-piece-type="${pieceType}"]`);
  const face = brick.locator("polygon").first();
  const brickBox = await face.boundingBox();
  const binBox = await bin.boundingBox();
  expect(brickBox).not.toBeNull();
  expect(binBox).not.toBeNull();
  await page.mouse.move(brickBox.x + brickBox.width / 2, brickBox.y + brickBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(binBox.x + binBox.width / 2, binBox.y + binBox.height / 2, { steps: 8 });
  await expect(brick).toHaveClass(/is-dragging/);
  await expect(bin).toHaveClass(/is-return-target/);
  await page.mouse.up();
}

async function dragPaletteToTutorialAt(page, pieceType, x, y, z, width, depth) {
  await page.evaluate(({ pieceType, x, y, z, width, depth }) => {
    const source = document.querySelector(`[data-piece-type="${pieceType}"]`);
    const board = document.querySelector(".builder-board");
    const rect = board.getBoundingClientRect();
    const projected = window.LegoTowerRenderer.iso(x + width / 2, y + depth / 2, 0.22 + z * 0.78 + 0.04);
    const clientX = rect.left + (170 + projected[0] * 2) / 520 * rect.width;
    const clientY = rect.top + (62 + projected[1] * 2) / 420 * rect.height;
    const transfer = new DataTransfer();
    source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: transfer }));
    board.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer, clientX, clientY }));
  }, { pieceType, x, y, z, width, depth });
}

test.describe("LEGO-rotatie en klantkwaliteit", () => {
  test("tutorial vraagt rotatie en toont hulp bij juiste plek met verkeerde richting", async ({ page }) => {
    await mountBuilder(page);
    const board = page.locator(".builder-board");
    const selectedFoundationBrick = page.locator('[data-piece-type="yellow_8"]');

    const tutorialPieces = page.locator(".builder-palette-item");
    await expect(tutorialPieces).not.toHaveCount(0);
    await expect(page.locator('.builder-inventory-bin[data-inventory-bin-mode="tutorial"]'))
      .toHaveCount(await tutorialPieces.count());
    for (const pieceType of ["red_8", "yellow_8", "blue_8", "green_4"]) {
      const bin = page.locator(`[data-piece-type="${pieceType}"] .builder-inventory-bin`);
      await expect(bin).toBeVisible();
      await expect(bin.locator(".builder-inventory-bin-shelf")).toHaveCount(1);
      await expect(bin.locator(".builder-inventory-bin-stock.is-upper .lego-part-3d")).toHaveCount(3);
      await expect(bin.locator(".builder-inventory-bin-stock.is-lower .lego-part-3d")).toHaveCount(3);
    }

    await page.evaluate(() => {
      document.addEventListener("keydown", event => {
        if (event.key.toLowerCase() === "r") event.stopPropagation();
      });
    });
    await page.keyboard.press("r");
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().rotated)).toBe(true);
    await expect(selectedFoundationBrick).toHaveAttribute("aria-label", /gedraaid 90 graden/);
    await page.keyboard.press("R");
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().rotated)).toBe(false);

    await selectedFoundationBrick.click();
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().rotated)).toBe(true);
    await selectedFoundationBrick.click();
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().rotated)).toBe(false);

    await board.click({ position: { x: 20, y: 20 } });
    await board.click({ position: { x: 20, y: 20 } });
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(2);

    await dragPlacedBrickToBin(page, 1, "yellow_8");
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(1);
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().tutorialStep)).toBe(0);
    await expect(page.locator(".builder-feedback")).toContainText("teruggelegd");
    await board.click({ position: { x: 20, y: 20 } });
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(2);

    await placeTutorialAt(page, 2, 1, 1);
    await expect(page.locator(".builder-rotation-help")).toBeVisible();
    await expect(page.locator(".builder-feedback")).toContainText("juiste plek");
    await expect.poll(() => page.evaluate(() => window.LegoBuilder.getSnapshot().bricks.length)).toBe(2);
    await page.locator("[data-rotate-from-help]").click();
    await expect(page.locator(".builder-rotation-help")).toBeHidden();
    await dragPaletteToTutorialAt(page, "red_8", 1, 2, 1, 4, 2);
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
    await loadIsolatedLegoComponents(page);
    await page.addScriptTag({ url: "/logistics-process.js" });
    await page.addScriptTag({ url: "/logistics-game-engine.js?v=20260824.1" });
    await page.addScriptTag({ url: "/logistics-game-ui.js?v=20260825.2" });
    await page.evaluate(() => {
      document.body.className = "";
      document.body.innerHTML = '<main id="parallel-layer-test"></main>';
      const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
        playMode: "digital",
        productionProcesses: ["parallel"]
      });
      engine.started = true;
      engine.humanRoleId = "pd1";
      engine.setHumanRoles(["pd1"], { emit: false });
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
    for (const partId of ["yellow_8", "yellow_8"]) {
      await page.locator(`[data-sim-drag-part="${partId}"]`).click();
      await clickMarkedTarget();
    }
    await page.locator('[data-sim-drag-part="red_8"]').click();
    await page.keyboard.press("r");
    await clickMarkedTarget();

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

  test("Toren B gebruikt R-rotatie en legt twee blauwe 2x4-blokken zonder overlap", async ({ page }, testInfo) => {
    await loadIsolatedLegoComponents(page);
    await page.addScriptTag({ url: "/logistics-process.js" });
    await page.addScriptTag({ url: "/logistics-game-engine.js?v=20260824.1" });
    await page.addScriptTag({ url: "/logistics-game-ui.js?v=20260825.2" });
    await page.evaluate(() => {
      document.body.className = "";
      document.body.innerHTML = '<main id="tower-b-rotation-test"></main>';
      const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
        playMode: "digital",
        productionProcesses: ["parallel"]
      });
      engine.started = true;
      engine.humanRoleId = "pd1";
      engine.setHumanRoles(["pd1"], { emit: false });
      engine.orders.set("tower-b-order", {
        id: "tower-b-order",
        productId: "B",
        quantity: 1,
        dueAt: Date.now() + 300000,
        productionRoute: "parallel",
        productionDepartment: "pd1"
      });
      engine.roleRuntime.pd1.state = window.LogisticsGameEngine.ROLE_STATES.AWAITING_PLAYER;
      engine.roleRuntime.pd1.activeOrderId = "tower-b-order";
      const controller = window.LogisticsGameUI.mount(
        document.getElementById("tower-b-rotation-test"),
        { engine }
      );
      window.__towerBRotation = { engine, controller };
    });

    const dragRotation = await page.evaluate(() => {
      const source = document.querySelector('[data-sim-drag-part="blue_8"]');
      const board = document.querySelector("[data-sim-builder-board]");
      const mount = document.getElementById("tower-b-rotation-test");
      const transfer = new DataTransfer();
      const inventoryBefore = source.innerHTML;
      source.dispatchEvent(new DragEvent("dragstart", {
        bubbles: true,
        dataTransfer: transfer,
        clientX: 180,
        clientY: 220
      }));
      board.dispatchEvent(new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
        clientX: 420,
        clientY: 330
      }));
      const flight = document.querySelector(".sim-digital-drag-flight");
      const flightBefore = flight?.innerHTML;
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "r", bubbles: true, cancelable: true }));
      const rotatedWithKey = flight?.dataset.rotated === "true" && flight.innerHTML !== flightBefore;
      const inventoryStayedPut = source.innerHTML === inventoryBefore;
      mount.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 80 }));
      const restoredWithWheel = flight?.dataset.rotated === "false";
      source.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: transfer }));
      return {
        rotatedWithKey,
        inventoryStayedPut,
        restoredWithWheel,
        flightRemoved: !document.querySelector(".sim-digital-drag-flight")
      };
    });
    expect(dragRotation).toEqual({
      rotatedWithKey: true,
      inventoryStayedPut: true,
      restoredWithWheel: true,
      flightRemoved: true
    });

    const targetFootprints = await page.evaluate(() => {
      const { engine, controller } = window.__towerBRotation;
      return controller.digitalBuildState(engine.playerTask()).targets.slice(0, 2);
    });
    expect(targetFootprints).toEqual([
      expect.objectContaining({ type: "blue_8", x: 1, y: 1, width: 2, depth: 4, z: 0 }),
      expect.objectContaining({ type: "blue_8", x: 3, y: 1, width: 2, depth: 4, z: 0 })
    ]);

    const clickMarkedTarget = () => page.locator(".sim-inline-builder-board").evaluate(board => {
      const target = board.querySelector(".sim-builder-target polygon").getBoundingClientRect();
      board.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        clientX: target.x + target.width / 2,
        clientY: target.y + target.height / 2
      }));
    });

    for (let index = 0; index < 2; index += 1) {
      await page.locator('[data-sim-drag-part="blue_8"]').click();
      const initialBrickMarkup = await page.locator('[data-sim-drag-part="blue_8"] .lego-part-3d').innerHTML();
      await page.keyboard.press("r");
      await expect(page.locator('[data-sim-drag-part="blue_8"] .sim-rotation-badge')).toBeVisible();
      await expect.poll(() => page.locator('[data-sim-drag-part="blue_8"] .lego-part-3d').innerHTML())
        .not.toBe(initialBrickMarkup);
      await clickMarkedTarget();
      await expect(page.locator("body")).toContainText("Draai dit blok 90 graden met R");

      await page.keyboard.press("r");
      await expect(page.locator('[data-sim-drag-part="blue_8"] .sim-rotation-badge')).toBeHidden();
      await clickMarkedTarget();
      await expect.poll(() => page.evaluate(() => (
        window.__towerBRotation.controller.selectedParts.blue_8 || 0
      ))).toBe(index + 1);
    }

    const placedBlue = await page.evaluate(() => {
      const { engine, controller } = window.__towerBRotation;
      return controller.digitalBuildState(engine.playerTask()).placed
        .filter(brick => brick.type === "blue_8");
    });
    expect(placedBlue).toHaveLength(2);
    expect(placedBlue[0].x + placedBlue[0].width).toBeLessThanOrEqual(placedBlue[1].x);
    await page.locator(".sim-inline-builder-board").screenshot({
      path: testInfo.outputPath("tower-b-blue-foundation.png")
    });

    for (const partId of ["yellow_4", "green_4"]) {
      await page.locator(`[data-sim-drag-part="${partId}"]`).click();
      await clickMarkedTarget();
    }
    await expect(page.locator(".sim-inline-builder-status strong")).toHaveText("1 van 1 torens gebouwd");
    await page.locator(".sim-inline-builder-board").screenshot({
      path: testInfo.outputPath("tower-b-complete.png")
    });
  });
});
