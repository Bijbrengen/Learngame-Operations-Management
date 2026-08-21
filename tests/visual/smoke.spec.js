const path = require("node:path");
const { test, expect } = require("./fixtures");

test("LEARNGame OM rendert en maakt een bespreekbare schermafbeelding", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/LEARNGame OM/i);
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("#leerpretAuthGate")).toBeAttached();

  await page.screenshot({
    path: path.join(testInfo.outputDir, "learngame-om-full-page.png"),
    fullPage: true
  });
});

test("klant kan een order plaatsen en naar Operations sturen", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.LogisticsGameEngine && window.LogisticsGameUI);

  await page.evaluate(() => {
    document.body.className = "";
    document.body.innerHTML = '<main id="customer-order-acceptance"></main>';

    const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
      config: {
        transferDelayMinMs: 0,
        transferDelayMaxMs: 0
      },
      random: () => 0
    });
    const controller = window.LogisticsGameUI.mount(
      document.getElementById("customer-order-acceptance"),
      { engine }
    );
    controller.start({
      humanRoleId: "customer",
      customerOrderMode: "free",
      playMode: "physical"
    });
    engine.generateOrder();
    engine.update(Date.now());

    window.__customerOrderAcceptance = { engine, controller };
  });

  const form = page.locator("[data-customer-order-form]");
  await expect(form).toBeVisible();
  await form.locator('input[name="product_id"][value="B"]').check({ force: true });
  await form.locator('[name="quantity"]').fill("4");
  await form.locator('[name="due_minutes"]').fill("15");

  const submitBtn = form.locator(".sim-customer-order-submit");
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click({ force: true });

  await expect.poll(
    () => page.evaluate(
      () => window.__customerOrderAcceptance.engine.snapshot().orders[0]?.currentRoleId
    )
  ).toBe("operations");

  const result = await page.evaluate(() => {
    const snapshot = window.__customerOrderAcceptance.engine.snapshot();
    const order = snapshot.orders[0];
    return {
      status: order.status,
      productId: order.productId,
      quantity: order.quantity,
      currentRoleId: order.currentRoleId,
      customerState: snapshot.roleRuntime.customer.state
    };
  });

  expect(result).toMatchObject({
    status: "ACTIVE",
    quantity: 4,
    currentRoleId: "operations",
    customerState: "IDLE"
  });
});

test("speloverzicht toont de actieve logistieke opstelling los van de productiestroom", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => (
    window.LogisticsGameEngine
    && window.LogisticsGameUI
    && window.ConfigurationLayoutPreview
  ));
  await page.evaluate(() => {
    document.body.className = "";
    document.body.innerHTML = '<main id="live-layout-test"></main>';
    const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
      random: () => 0,
      config: { initialOrderDelayMs: 999999999 }
    });
    window.LogisticsGameUI.mount(document.getElementById("live-layout-test"), { engine }).start({
      humanRoleId: "pd1",
      gameType: "lo4",
      organizationModel: "single_enterprise",
      playMode: "physical",
      productionProcesses: ["parallel"],
      intermediateStock: false,
      enabledRoles: ["supplier", "customer"]
    });
  });

  const layout = page.locator("[data-sim-live-layout]");
  await expect(layout).toBeVisible();
  await expect(layout.locator('[data-layout-topology="parallel"]')).toBeVisible();
  await expect(layout.locator('[data-layout-node="supplier"]')).toBeVisible();
  await expect(layout.locator('[data-layout-node="production-a"]')).toBeVisible();
  await expect(layout.locator('[data-layout-node="production-b"]')).toBeVisible();
  await expect(layout.locator('[data-layout-node="production-c"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Productiestroom" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Heatmap" })).toBeVisible();
});
