const { test, expect } = require("@playwright/test");

test("Magazijn Grondstoffen kan een complete digitale handeling met Uitgevoerd afronden", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.LogisticsGameEngine && window.LogisticsGameUI);
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
    window.__rawWarehouseCompletion = { engine, orderId: created.id };
  });

  const complete = page.locator("[data-sim-complete]");
  await expect(complete).toBeVisible();
  await expect(complete).toBeEnabled();
  await complete.click();

  const result = await page.evaluate(() => {
    const { engine, orderId } = window.__rawWarehouseCompletion;
    const order = engine.orders.get(orderId);
    return {
      state: engine.roleRuntime.srm.state,
      handling: order.history.find(item => item.type === "player_handling")
    };
  });
  expect(result.state).toBe("WAITING_FOR_NEXT");
  expect(result.handling).toMatchObject({
    roleId: "srm",
    orderSignature: true,
    playMode: "digital"
  });
});
