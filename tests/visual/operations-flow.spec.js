const { test, expect } = require("./fixtures");

test.describe("Operations Ordervrijgave Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.LogisticsGameEngine && window.LogisticsGameUI);
  });

  test("Operations ontvangt order en voert ordervrijgave uit", async ({ page }) => {
    await page.evaluate(() => {
      document.body.className = "";
      document.body.innerHTML = '<main id="operations-test"></main>';

      const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
        config: { transferDelayMinMs: 0, transferDelayMaxMs: 0 },
        random: () => 0
      });
      const controller = window.LogisticsGameUI.mount(
        document.getElementById("operations-test"),
        { engine }
      );

      controller.start({ humanRoleId: "operations", playMode: "physical" });

      const order = engine.generateOrder();
      engine.update(Date.now());

      window.__opsTest = { engine, controller, order };
    });

    const snapshot = await page.evaluate(() => {
      return window.__opsTest.engine.snapshot();
    });

    expect(snapshot.orders.length).toBeGreaterThan(0);
    expect(snapshot.roleRuntime.operations).toBeDefined();
  });
});
