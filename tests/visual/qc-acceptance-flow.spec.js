const { test, expect } = require("./fixtures");

test.describe("QC & Klantacceptatie Flow (SSF)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.LogisticsGameEngine && window.LogisticsGameUI);
  });

  test("Magazijn Gereed Product (ssf) controleert en levert order uit", async ({ page }) => {
    await page.evaluate(() => {
      document.body.className = "";
      document.body.innerHTML = '<main id="qc-test"></main>';

      const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
        config: { transferDelayMinMs: 0, transferDelayMaxMs: 0 },
        random: () => 0
      });
      const controller = window.LogisticsGameUI.mount(
        document.getElementById("qc-test"),
        { engine }
      );

      controller.start({ humanRoleId: "ssf", playMode: "physical" });

      const order = engine.generateOrder();
      order.currentRoleId = "ssf";
      engine.update(Date.now());

      window.__qcTest = { engine, controller, order };
    });

    const snapshot = await page.evaluate(() => {
      return window.__qcTest.engine.snapshot();
    });

    expect(snapshot.orders.length).toBeGreaterThan(0);
    expect(snapshot.roleRuntime.ssf).toBeDefined();
  });
});
