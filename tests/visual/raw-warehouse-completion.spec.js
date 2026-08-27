const { test, expect } = require("./fixtures");

test.use({ reducedMotion: "no-preference" });

test("Magazijn Grondstoffen houdt alle lagen van de referentietoren permanent zichtbaar", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.waitForFunction(() => (
    window.LogisticsGameEngine
    && window.LogisticsGameUI
    && window.LegoTowerRenderer?.renderSequence
    && window.LeerpretSDK?.components?.["lego-builder"]?.logic
  ));
  await page.evaluate(() => {
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
      { engine }
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

  const reference = page.locator("[data-sim-static-tower-reference]");
  const assertCompleteReference = async () => {
    await expect(reference).toBeVisible();
    // De renderer gebruikt dezelfde primitive voor de groene grondplaat en de
    // vier productblokken: groen, wit, wit, blauw en rood.
    await expect(reference.locator(".iso-brick")).toHaveCount(5);
    await expect(reference.locator('[class^="animated-tower-block-"]')).toHaveCount(0);
    const rendering = await reference.locator(".iso-brick").evaluateAll(layers => ({
      opacities: layers.map(layer => getComputedStyle(layer).opacity),
      animations: layers.map(layer => getComputedStyle(layer).animationName)
    }));
    expect(rendering.opacities).toEqual(["1", "1", "1", "1", "1"]);
    expect(rendering.animations).toEqual(["none", "none", "none", "none", "none"]);
    expect(await reference.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  };

  await expect(page.locator(".sim-product-visual > strong")).toHaveText("Toren C");
  const stage = page.locator("[data-sim-virtual-stage]");
  const stageAction = page.locator("[data-sim-stage-drop-action]");
  await expect(stage).toHaveAttribute("role", "region");
  await expect(stage).toHaveAttribute("tabindex", "-1");
  await expect(stage.getByRole("button", { name: /Selecteer eerst een LEGO-onderdeel/ })).toHaveCount(1);
  await expect(stageAction).toBeDisabled();
  await expect(stage.locator(".sim-staged-bricks")).toHaveAttribute(
    "aria-label",
    "Klaargelegde LEGO-onderdelen"
  );
  await expect(
    page.locator('[data-sim-drag-part="base_green"] svg.lego-part-3d.base-plate')
  ).toHaveCount(1);
  const layerGuide = page.locator(".sim-product-layer-guide");
  await expect(layerGuide).toHaveAttribute("role", "group");
  await expect(layerGuide).toHaveAttribute(
    "aria-label",
    "Benodigde lagen voor de volledige batch met 2 torens"
  );
  await expect(layerGuide).toContainText("Laag 1");
  await expect(layerGuide).toContainText("2× Grondplaat groen");
  await expect(layerGuide).toContainText("4× Steen wit");
  await expect(layerGuide).toContainText("Laag 2");
  await expect(layerGuide).toContainText("2× Steen blauw");
  await expect(layerGuide).toContainText("Laag 3");
  await expect(layerGuide).toContainText("2× Steen rood");
  await assertCompleteReference();

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
    await assertCompleteReference();
  }

  await expect(stage.locator("[data-sim-staged-part]")).toHaveCount(10);
  await expect(stage.locator('[data-sim-staged-part="base_green"]')).toHaveCount(2);
  await expect(stage.locator('[data-sim-staged-part="base_green"] svg.base-plate')).toHaveCount(2);
  await expect(stage.locator('[data-sim-staged-part="white_8"]')).toHaveCount(4);
  await expect(stage.locator('[data-sim-staged-part="blue_4"]')).toHaveCount(2);
  await expect(stage.locator('[data-sim-staged-part="red_4"]')).toHaveCount(2);
  await expect(stage.locator("svg.lego-part-3d")).toHaveCount(10);
  await expect(stage.locator(".sim-staged-brick")).toHaveCount(0);
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
  await assertCompleteReference();

  await page.locator(".sim-digital-stage-section").screenshot({
    path: testInfo.outputPath("raw-warehouse-static-tower-and-staged-parts.png")
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
    playMode: "digital"
  });
});
