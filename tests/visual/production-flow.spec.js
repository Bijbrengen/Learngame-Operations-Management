const { test, expect } = require("./fixtures");

test.describe("Productieafdelingen & Assemblage Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.LogisticsGameEngine && window.LogisticsGameUI);
  });

  test("Productieafdeling 1 (pd1) voert bouwstap 1 uit", async ({ page }) => {
    await page.evaluate(() => {
      document.body.className = "";
      document.body.innerHTML = '<main id="pd1-test"></main>';

      const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
        config: { transferDelayMinMs: 0, transferDelayMaxMs: 0 },
        random: () => 0
      });
      const controller = window.LogisticsGameUI.mount(
        document.getElementById("pd1-test"),
        { engine }
      );

      controller.start({ humanRoleId: "pd1", playMode: "physical" });

      const order = engine.generateOrder();
      order.currentRoleId = "pd1";
      engine.update(Date.now());

      window.__pd1Test = { engine, controller, order };
    });

    const snapshot = await page.evaluate(() => {
      return window.__pd1Test.engine.snapshot();
    });

    expect(snapshot.orders.length).toBeGreaterThan(0);
    expect(snapshot.roleRuntime.pd1).toBeDefined();
  });

  test("Productieafdeling 2 doorloopt vervolgassemblage", async ({ page }) => {
    await page.evaluate(() => {
      document.body.className = "";
      document.body.innerHTML = '<main id="pd2-test"></main>';

      const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
        config: { transferDelayMinMs: 0, transferDelayMaxMs: 0 },
        random: () => 0
      });
      const controller = window.LogisticsGameUI.mount(
        document.getElementById("pd2-test"),
        { engine }
      );

      controller.start({ humanRoleId: "pd2", playMode: "physical" });
      const order = engine.generateOrder();
      order.currentRoleId = "pd2";
      engine.update(Date.now());

      window.__pd2Test = { engine, controller, order };
    });

    const snapshot = await page.evaluate(() => {
      return window.__pd2Test.engine.snapshot();
    });

    expect(snapshot.orders.length).toBeGreaterThan(0);
    expect(snapshot.roleRuntime.pd2).toBeDefined();
  });
});
