const { test, expect } = require("./fixtures");

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
