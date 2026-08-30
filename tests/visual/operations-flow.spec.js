const { test, expect } = require("./fixtures");

test.describe("Operations Ordervrijgave Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.LogisticsGameEngine && window.LogisticsGameUI);
  });

  test("Operations ontvangt order en voert ordervrijgave uit", async ({ page }) => {
    await page.waitForFunction(() => (
      window.IsometricLogisticsView
      && window.LEARNGameOMSimulator?.getSharedGameController?.()?.renderProcessFlow
    ));
    await page.evaluate(() => {
      document.body.className = "";
      document.body.innerHTML = '<main id="operations-test"></main><section id="operations-overview"></section>';

      const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
        config: { transferDelayMinMs: 0, transferDelayMaxMs: 0 },
        random: () => 0
      });
      const controller = window.LogisticsGameUI.mount(
        document.getElementById("operations-test"),
        {
          engine,
          renderProcessFlow: window.LEARNGameOMSimulator.getSharedGameController().renderProcessFlow
        }
      );

      controller.start({ humanRoleId: "operations", playMode: "physical" });

      const order = engine.generateOrder();
      Object.values(engine.roleRuntime).forEach(runtime => {
        runtime.queue = runtime.queue.filter(orderId => orderId !== order.id);
      });
      engine.beginRoleWork("operations", order.id, Date.now());
      controller.render();
      window.LEARNGameOMSimulator.getSharedGameController().renderProcessFlow(
        document.getElementById("operations-overview"),
        engine.snapshot()
      );

      window.__opsTest = { engine, controller, order };
    });

    const snapshot = await page.evaluate(() => {
      return window.__opsTest.engine.snapshot();
    });

    expect(snapshot.orders.length).toBeGreaterThan(0);
    expect(snapshot.roleRuntime.operations).toBeDefined();
    expect(snapshot.roleRuntime.operations.activeOrderId).toBe(snapshot.orders[0].id);

    const overview = page.locator("#operations-overview");
    await expect(overview).toBeVisible();
    const operations = overview.locator('[data-department-id="operations"]');
    const form = operations.locator('.iso-cargo-order-document[data-cargo-kind="order_information"]');
    await expect(form).toHaveCount(1);
    await expect(form).not.toHaveClass(/is-draggable/);
    await expect(form.locator('[data-lego-order-document][data-blok-id="logistics.order-document"]')).toHaveCount(1);
    await expect(operations.locator('[data-work-area-grid="8x8"]')).toHaveCount(1);
    await expect(overview.locator(".iso-empty-stock-label")).toHaveCount(0);
    const buildingOverlaps = await overview.locator(".iso-department-layer").evaluate(layer => {
      const buildings = Array.from(layer.querySelectorAll(":scope > .iso-department > .iso-building"));
      return buildings.flatMap((building, index) => {
        const left = building.getBoundingClientRect();
        return buildings.slice(index + 1).flatMap(other => {
          const right = other.getBoundingClientRect();
          const width = Math.min(left.right, right.right) - Math.max(left.left, right.left);
          const height = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
          return width > 1 && height > 1
            ? [`${building.parentElement?.dataset.departmentId}/${other.parentElement?.dataset.departmentId}`]
            : [];
        });
      });
    });
    expect(buildingOverlaps).toEqual([]);
  });
});
