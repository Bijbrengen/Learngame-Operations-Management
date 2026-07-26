const { test, expect } = require("@playwright/test");

test.describe("Klantorder Acceptance Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/accounts.google.com/**", route => route.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await page.goto("/");
    await page.waitForFunction(() => window.LogisticsGameEngine && window.LogisticsGameUI);
  });

  test("klant kan order samenstellen, valideren en doorsturen naar Operations", async ({ page }) => {
    await page.evaluate(() => {
      document.body.className = "";
      document.body.innerHTML = '<main id="customer-order-test"></main>';

      const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
        config: {
          transferDelayMinMs: 0,
          transferDelayMaxMs: 0,
          initialOrderDelayMs: 3_600_000,
          orderIntervalMinMs: 3_600_000,
          orderIntervalMaxMs: 3_600_000,
          peakFlowChance: 0
        },
        random: () => 0
      });
      const controller = window.LogisticsGameUI.mount(
        document.getElementById("customer-order-test"),
        { engine }
      );
      controller.start({
        humanRoleId: "customer",
        customerOrderMode: "free",
        playMode: "physical"
      });
      engine.generateOrder();
      engine.update(Date.now());

      window.__customerTest = { engine, controller };
    });

    const form = page.locator("[data-customer-order-form]");
    await expect(form).toBeVisible();

    await form.locator('[name="product_id"]').selectOption({ index: 1 });
    await form.locator('[name="quantity"]').fill("5");
    await form.locator('[name="due_minutes"]').fill("20");

    await page.evaluate(() => {
      const submitBtn = document.querySelector(".sim-customer-order-submit");
      if (submitBtn) submitBtn.click();
    });

    const snapshotData = await page.evaluate(() => {
      window.__customerTest.engine.update(Date.now());
      const snapshot = window.__customerTest.engine.snapshot();
      return {
        orderCount: snapshot.orders.length,
        firstOrderRole: snapshot.orders[0]?.currentRoleId,
        customerState: snapshot.roleRuntime.customer.state
      };
    });

    expect(snapshotData.orderCount).toBeGreaterThanOrEqual(1);
    expect(snapshotData.firstOrderRole).toBe("operations");
    expect(snapshotData.customerState).toBe("IDLE");
  });
});
