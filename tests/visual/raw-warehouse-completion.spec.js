const { test, expect } = require("./fixtures");

test.use({ reducedMotion: "no-preference" });

test("Magazijn Grondstoffen legt losse onderdelen in een materiaalwagen zonder toren te bouwen", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.waitForFunction(() => (
    window.LogisticsGameEngine
    && window.LogisticsGameUI
    && window.IsometricLogisticsView
    && window.LEARNGameOMSimulator?.getSharedGameController?.()?.renderProcessFlow
    && window.LegoTowerRenderer?.renderSequence
    && window.LeerpretSDK?.components?.["lego-builder"]?.logic
  ));
  await page.evaluate(() => {
    const renderProcessFlow = window.LEARNGameOMSimulator.getSharedGameController().renderProcessFlow;
    document.body.className = "";
    document.body.innerHTML = '<main id="raw-warehouse-reference"></main>';

    const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
      random: () => 0,
      config: {
        initialOrderDelayMs: 999999999,
        orderIntervalMinMs: 999999999,
        orderIntervalMaxMs: 999999999,
        incidentChance: 0
      }
    });
    const controller = window.LogisticsGameUI.mount(
      document.getElementById("raw-warehouse-reference"),
      { engine, renderProcessFlow }
    );
    controller.start({
      humanRoleId: "srm",
      playMode: "digital",
      productionProcesses: ["sequential"]
    });
    const created = engine.generateOrder();
    const order = engine.orders.get(created.id);
    order.productId = "C";
    order.productName = engine.products.C.name;
    order.quantity = 2;
    Object.values(engine.roleRuntime).forEach(runtime => {
      runtime.queue = runtime.queue.filter(orderId => orderId !== created.id);
    });
    engine.beginRoleWork("srm", created.id, Date.now());
    controller.render();
    window.__rawWarehouseReference = { engine, controller };
  });

  const orderReference = page.locator("[data-sim-static-tower-reference]");
  await expect(orderReference).toBeVisible();
  await expect(page.locator(".sim-product-visual > strong")).toHaveText("Toren C");
  await expect(page.locator(".sim-product-visual > small").first()).toHaveText("2 exemplaren");
  await expect(orderReference.locator(".iso-brick")).toHaveCount(5);
  await expect(orderReference.locator('[class^="animated-tower-block-"]')).toHaveCount(0);
  const orderReferenceRendering = await orderReference.locator(".iso-brick").evaluateAll(parts => ({
    opacities: parts.map(part => getComputedStyle(part).opacity),
    animations: parts.map(part => getComputedStyle(part).animationName)
  }));
  expect(orderReferenceRendering.opacities).toEqual(["1", "1", "1", "1", "1"]);
  expect(orderReferenceRendering.animations).toEqual(["none", "none", "none", "none", "none"]);
  expect(await orderReference.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  const isometricCart = page.locator('.sim-isometric-transfer-map [data-cargo-kind="material_kits"]');
  await expect(isometricCart).toBeVisible();
  await expect(isometricCart).toHaveClass(/iso-cargo-material-cart/);
  await expect(isometricCart).toHaveAttribute("data-cargo-quantity", "2");
  await expect(isometricCart).toHaveAttribute("data-material-part-count", "0");
  await expect(isometricCart).toHaveAttribute("role", "img");
  expect(await isometricCart.getAttribute("aria-pressed")).toBeNull();
  await expect(isometricCart).toHaveAttribute("aria-label", /0 losse LEGO-onderdelen/);
  await expect(page.locator(".sim-isometric-transfer-map .iso-cargo-tower")).toHaveCount(0);
  const stage = page.locator("[data-sim-virtual-stage]");
  const stageEngineCart = stage.locator("[data-lego-material-cart]");
  const isometricEngineCart = isometricCart.locator("[data-lego-material-cart]");
  const stageAction = page.locator("[data-sim-stage-drop-action]");
  await expect(stage).toHaveAttribute("data-sim-material-cart", "");
  await expect(stage).toHaveAttribute("data-material-part-count", "0");
  await expect(stage).toHaveAttribute("role", "region");
  await expect(stage).toHaveAttribute("tabindex", "-1");
  await expect(stageEngineCart).toHaveCount(1);
  await expect(stageEngineCart).toHaveAttribute("data-material-part-count", "0");
  await expect(isometricEngineCart).toHaveCount(1);
  await expect(isometricEngineCart).toHaveAttribute("data-material-part-count", "0");
  for (const engineCart of [stageEngineCart, isometricEngineCart]) {
    await expect(engineCart).toHaveAttribute("data-blok-id", "logistics.material-cart");
    await expect(engineCart).toHaveAttribute("data-blok-file", "logistics/materiaalwagen.blok");
    await expect(engineCart).toHaveAttribute("data-blok-render-preset", "logistics-material-cart.green");
    await expect(engineCart).toHaveAttribute("data-ldraw-part-id", "49649c01.dat");
  }
  await expect(stage.getByRole("button", { name: /Selecteer eerst een LEGO-onderdeel/ })).toHaveCount(1);
  await expect(stageAction).toBeDisabled();
  await expect(stage.locator(".sim-staged-bricks")).toHaveAttribute(
    "aria-label",
    "Losse LEGO-onderdelen in de materiaalwagen"
  );
  await expect(
    page.locator('[data-sim-drag-part="base_green"] svg.lego-part-3d.base-plate')
  ).toHaveCount(1);
  const pickList = page.locator(".sim-material-pick-list");
  await expect(pickList).toHaveAttribute("role", "group");
  await expect(pickList).toHaveAttribute(
    "aria-label",
    "Picklijst met losse grondstoffen voor de volledige batch van 2 torens"
  );
  await expect(pickList).toContainText("Losse grondstoffen · niet assembleren");
  await expect(pickList).toContainText("Startonderdelen");
  await expect(pickList).toContainText("2× Grondplaat groen");
  await expect(pickList).toContainText("4× Steen wit");
  await expect(pickList).toContainText("Vervolgonderdelen");
  await expect(pickList).toContainText("2× Steen blauw");
  await expect(pickList).toContainText("Afrondingsonderdelen");
  await expect(pickList).toContainText("2× Steen rood");

  const firstGroundPlate = page.locator('[data-sim-drag-part="base_green"]');
  if (testInfo.project.name === "mobile-chromium") {
    await firstGroundPlate.tap();
    await expect(stageAction).toBeEnabled();
    await stageAction.tap();
  } else {
    await firstGroundPlate.focus();
    await firstGroundPlate.press("Enter");
    await expect(stageAction).toBeFocused();
    await stageAction.press("Enter");
  }
  await expect(stage.locator('[data-sim-staged-part="base_green"]')).toHaveCount(1);
  await expect(stage.locator("[data-sim-staged-part]")).toHaveCount(1);
  await expect(stage).toHaveAttribute("data-material-part-count", "1");
  await expect(stageEngineCart).toHaveAttribute("data-material-part-count", "1");
  await expect(isometricCart).toHaveAttribute("data-material-part-count", "1");
  await expect(isometricEngineCart).toHaveAttribute("data-material-part-count", "1");

  let stagedCount = 1;
  for (const partId of [
    "base_green",
    "white_8", "white_8", "white_8", "white_8",
    "blue_4", "blue_4",
    "red_4", "red_4"
  ]) {
    const accepted = await page.evaluate(selectedPartId => (
      window.__rawWarehouseReference.controller.addDigitalPart(selectedPartId)
    ), partId);
    expect(accepted).toBe(true);
    stagedCount += 1;
    await expect(stage.locator("[data-sim-staged-part]")).toHaveCount(stagedCount);
    await expect(stage).toHaveAttribute("data-material-part-count", String(stagedCount));
    await expect(stageEngineCart).toHaveAttribute("data-material-part-count", String(stagedCount));
    await expect(isometricCart).toHaveAttribute("data-material-part-count", String(stagedCount));
    await expect(isometricEngineCart).toHaveAttribute("data-material-part-count", String(stagedCount));
  }

  await expect(stage.locator("[data-sim-staged-part]")).toHaveCount(10);
  await expect(stage.locator('[data-sim-staged-part="base_green"]')).toHaveCount(2);
  await expect(stage.locator('[data-sim-staged-part="base_green"] svg.base-plate')).toHaveCount(2);
  await expect(stage.locator('[data-sim-staged-part="white_8"]')).toHaveCount(4);
  await expect(stage.locator('[data-sim-staged-part="blue_4"]')).toHaveCount(2);
  await expect(stage.locator('[data-sim-staged-part="red_4"]')).toHaveCount(2);
  await expect(stage.locator("svg.lego-part-3d")).toHaveCount(10);
  await expect(stage.locator(".sim-staged-brick")).toHaveCount(0);
  await expect(stage.locator(".sim-inline-builder-board,.sim-tower-reference")).toHaveCount(0);
  await expect(stageEngineCart.locator("[data-material-cart-part]")).toHaveCount(8);
  await expect(stageEngineCart.locator("[data-material-cart-overflow]")).toContainText("+2");
  await expect(isometricEngineCart.locator("[data-material-cart-part]")).toHaveCount(8);
  await expect(isometricEngineCart.locator("[data-material-cart-overflow]")).toContainText("+2");
  await expect(isometricCart).toHaveAttribute("aria-label", /10 losse LEGO-onderdelen/);
  await expect(page.locator(".sim-isometric-transfer-map .iso-cargo-tower")).toHaveCount(0);
  await expect(stage.locator('[data-sim-staged-part="white_8"]').first()).toHaveAttribute(
    "aria-label",
    /Steen wit, 2 bij 4, onderdeel 1 van 4 klaargelegd/
  );
  const stageLayout = await stage.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const items = [...element.querySelectorAll("[data-sim-staged-part]")];
    return {
      allInside: items.every(item => {
        const rect = item.getBoundingClientRect();
        return rect.left >= bounds.left - 0.5
          && rect.right <= bounds.right + 0.5
          && rect.top >= bounds.top - 0.5
          && rect.bottom <= bounds.bottom + 0.5;
      }),
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    };
  });
  expect(stageLayout.allInside).toBe(true);
  expect(stageLayout.pageWidth).toBeLessThanOrEqual(stageLayout.viewportWidth);

  const preservedParts = await page.evaluate(() => {
    const { engine, controller } = window.__rawWarehouseReference;
    const before = { ...controller.selectedParts };
    engine.emit("player-action-required", {
      roleId: "pd1",
      order: { id: "andere-menselijke-rol" }
    });
    return { before, after: { ...controller.selectedParts } };
  });
  expect(preservedParts.after).toEqual(preservedParts.before);
  await expect(orderReference).toBeVisible();
  await expect(orderReference.locator(".iso-brick")).toHaveCount(5);

  await page.locator("#raw-warehouse-reference").screenshot({
    path: testInfo.outputPath("raw-warehouse-material-cart-full.png")
  });
});

test("Magazijn Grondstoffen kan een complete digitale batchoverdracht afronden", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => (
    window.LogisticsGameEngine
    && window.LogisticsGameUI
    && window.LeerpretSDK?.components?.["lego-builder"]?.logic
  ));
  await page.evaluate(() => {
    document.body.className = "";
    document.body.innerHTML = '<main id="raw-warehouse-completion"></main>';

    const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
      random: () => 0,
      config: {
        initialOrderDelayMs: 999999999,
        orderIntervalMinMs: 999999999,
        orderIntervalMaxMs: 999999999,
        transferDelayMinMs: 0,
        transferDelayMaxMs: 0,
        incidentChance: 0
      }
    });
    const controller = window.LogisticsGameUI.mount(
      document.getElementById("raw-warehouse-completion"),
      { engine }
    );
    controller.start({
      humanRoleId: "srm",
      playMode: "digital",
      productionProcesses: ["sequential"]
    });
    const created = engine.generateOrder();
    Object.values(engine.roleRuntime).forEach(runtime => {
      runtime.queue = runtime.queue.filter(orderId => orderId !== created.id);
    });
    engine.beginRoleWork("srm", created.id, Date.now());

    const task = engine.playerTask();
    controller.selectedParts = { ...task.requiredParts };
    controller.signatureStrokes = [[
      { x: 5, y: 10 },
      { x: 25, y: 30 },
      { x: 45, y: 12 },
      { x: 70, y: 35 },
      { x: 95, y: 15 }
    ]];
    controller.signed = true;
    controller.transferred = true;
    controller.render();
    window.__rawWarehouseCompletion = { engine, orderId: created.id, controller };
  });

  const actionResult = await page.evaluate(() => {
    const { engine, controller } = window.__rawWarehouseCompletion;
    const task = engine.playerTask();
    return engine.completePlayerAction({
      parts: { ...controller.selectedParts },
      signed: controller.signed,
      signature: controller.signatureEvidence(),
      completedQuantity: controller.completedOrderQuantity(task),
      transferred: controller.transferred,
      transfer: engine.batchTransferDescriptor(task.order, task.role.id)
    });
  });
  expect(actionResult.ok).toBe(true);

  const result = await page.evaluate(() => {
    const { engine, orderId } = window.__rawWarehouseCompletion;
    const order = engine.orders.get(orderId);
    return {
      handling: order.history.find(item => item.type === "player_handling")
    };
  });
  expect(result.handling).toMatchObject({
    roleId: "srm",
    orderSignature: true,
    playMode: "digital",
    transfer: {
      sourceRoleId: "srm",
      targetRoleId: "pd1",
      cargoKind: "material_kits",
      atomicTransfer: true
    }
  });
});
