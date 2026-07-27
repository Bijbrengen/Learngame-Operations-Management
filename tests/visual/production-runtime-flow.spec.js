const { test, expect } = require("@playwright/test");

async function openDeterministicSimulator(page) {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  await page.route("**/auth/leerbox/session?**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      authenticated: true,
      user: { label: "Playwright" },
      roles: ["learner"]
    })
  }));
  await page.route("**/v1/game-sessions/availability", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      current_session: null,
      discoverable_sessions: [],
      open_sessions: [],
      can_start_free_game: true
    })
  }));
  await page.route("**/v1/player/behavior-profile**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ exists: true, profile: {} })
  }));
  await page.goto("/");
  await page.waitForFunction(() => window.LEARNGameOMSimulator);
  await page.locator("body.auth-authenticated").waitFor({ state: "attached" });
  await page.locator("#characterCreationGate").waitFor({ state: "hidden" });
}

async function advance(page, count) {
  await page.evaluate(amount => {
    for (let index = 0; index < amount; index += 1) {
      window.LEARNGameOMSimulator.advanceSelectedOrder();
    }
  }, count);
}

test.describe("Werkelijke productieflow per LO-Game", () => {
  test.beforeEach(async ({ page }) => {
    await openDeterministicSimulator(page);
  });

  test("spelersheatmap telt interacties per afdeling en warmt zichtbaar op", async ({ page }) => {
    const heatmap = await page.evaluate(() => {
      const simulator = window.LEARNGameOMSimulator;
      simulator.clearInteractionBuffer();
      simulator.endTutorial();
      simulator.setAppView("player", false);
      simulator.dispatchInteraction({ departmentId: "pd2", actionType: "inspect_department" });
      simulator.dispatchInteraction({ departmentId: "pd2", actionType: "complete_department_action" });
      simulator.dispatchInteraction({ role: "Klant", actionType: "customer_order_request" });
      return simulator.getPlayerDepartmentHeatmap();
    });

    expect(heatmap.find(item => item.id === "pd2").count).toBe(2);
    expect(heatmap.find(item => item.id === "customer").count).toBe(1);
    await expect(page.locator("#playerDepartmentHeatmap")).toBeVisible();
    await expect(page.locator('[data-heatmap-department="pd2"]')).toContainText("Productie");
    await expect(page.locator('[data-heatmap-department="pd2"]')).toContainText("× 2");
    await expect(page.locator('[data-heatmap-department="pd2"]')).toHaveClass(/level-4/);
  });

  test("Games 1 t/m 7 kiezen automatisch de voorgeschreven productieroute", async ({ page }) => {
    const routes = await page.evaluate(() => {
      const simulator = window.LEARNGameOMSimulator;
      return ["lo1", "lo2", "lo3", "lo4", "lo5", "lo6", "lo7"].map(gameType => {
        simulator.applyGameTypePreset(gameType, false);
        simulator.createOrder("A", 1, 49, 100);
        const orders = simulator.getStateSnapshot().orders;
        return [gameType, orders[orders.length - 1].productionRoute];
      });
    });

    expect(Object.fromEntries(routes)).toEqual({
      lo1: "sequential",
      lo2: "sequential",
      lo3: "parallel",
      lo4: "parallel",
      lo5: "sequential",
      lo6: "sequential",
      lo7: "sequential"
    });
  });

  test("LO Game 4 bouwt Toren B volledig in parallelle Productieafdeling B", async ({ page }) => {
    const initial = await page.evaluate(() => {
      const simulator = window.LEARNGameOMSimulator;
      simulator.applyGameTypePreset("lo4", false);
      simulator.createOrder("B", 1, 58, 100);
      return simulator.getStateSnapshot();
    });

    const order = initial.orders[0];
    expect(order.productionRoute).toBe("parallel");
    expect(order.productionDepartment).toBe("B");
    expect(order.processSteps.map(step => step.id)).toContain("parallel_b_done");
    expect(order.processSteps.some(step => step.id.startsWith("pd1_"))).toBe(false);
    expect(order.processSteps.some(step => step.id.startsWith("pd3_"))).toBe(false);

    await advance(page, 7);
    const issued = await page.evaluate(() => window.LEARNGameOMSimulator.getStateSnapshot());
    expect(issued.financial.wipByDepartment.B).toBe(17);
    expect(issued.financial.wipByDepartment.A).toBe(0);
    expect(issued.financial.wipByDepartment.C).toBe(0);

    await advance(page, 2);
    const produced = await page.evaluate(() => window.LEARNGameOMSimulator.getStateSnapshot());
    expect(produced.finishedGoods.B).toBe(1);
    expect(produced.financial.finishedGoodsByDepartment.B).toBe(19);

    await advance(page, 10);
    const delivered = await page.evaluate(() => window.LEARNGameOMSimulator.getStateSnapshot());
    expect(delivered.orders[0].done).toBe(true);
    expect(delivered.finishedGoods.B).toBe(0);
    expect(delivered.financial.revenueByDepartment.B).toBe(58);
    expect(delivered.financial.costOfGoodsSold).toBe(19);
    expect(delivered.financial.opportunityCostByDepartment.A).toBeGreaterThan(0);
    expect(delivered.financial.opportunityCostByDepartment.C).toBeGreaterThan(0);

    await expect(page.locator('[data-production-finance="B"]')).toContainText("Omzet EUR 58");
  });

  test("LO Game 5 bouwt iedere toren laag voor laag door de sequentiële keten", async ({ page }) => {
    const initial = await page.evaluate(() => {
      const simulator = window.LEARNGameOMSimulator;
      simulator.applyGameTypePreset("lo5", false);
      simulator.createOrder("B", 1, 58, 100);
      return simulator.getStateSnapshot();
    });

    const stepIds = initial.orders[0].processSteps.map(step => step.id);
    expect(initial.orders[0].productionRoute).toBe("sequential");
    expect(stepIds).toContain("pd1_done");
    expect(stepIds).toContain("pd2_done");
    expect(stepIds).toContain("pd3_done");

    await advance(page, 9);
    const layerOne = await page.evaluate(() => window.LEARNGameOMSimulator.getStateSnapshot());
    expect(layerOne.ss1.B).toBe(1);
    expect(layerOne.financial.wipByStage[1]).toBe(15);

    await advance(page, 6);
    const layerTwo = await page.evaluate(() => window.LEARNGameOMSimulator.getStateSnapshot());
    expect(layerTwo.ss1.B).toBe(0);
    expect(layerTwo.ss2.B).toBe(1);
    expect(layerTwo.financial.wipByStage[1]).toBe(0);
    expect(layerTwo.financial.wipByStage[2]).toBe(19);

    await advance(page, 20);
    const delivered = await page.evaluate(() => window.LEARNGameOMSimulator.getStateSnapshot());
    expect(delivered.orders[0].done).toBe(true);
    expect(delivered.financial.materialCostByStage).toEqual({ 1: 13, 2: 2, 3: 2 });
    expect(delivered.financial.conversionCostByDepartment).toEqual({ A: 2, B: 2, C: 2 });
    expect(delivered.financial.costOfGoodsSold).toBe(23);

    await expect(page.locator('[data-production-stage-finance="1"]')).toContainText("Materiaal laag EUR 13");
    await expect(page.locator('[data-production-stage-finance="2"]')).toContainText("Materiaal laag EUR 2");
    await expect(page.locator('[data-production-stage-finance="3"]')).toContainText("Materiaal laag EUR 2");
  });

  test("hybride instelling gebruikt parallelle en sequentiële orders naast elkaar", async ({ page }) => {
    const routes = await page.evaluate(() => {
      const simulator = window.LEARNGameOMSimulator;
      simulator.applyGameTypePreset("lo4", false);
      const sequential = document.getElementById("sequentialProductionToggle");
      sequential.checked = true;
      sequential.dispatchEvent(new Event("change", { bubbles: true }));
      simulator.createOrder("A", 1, 49, 100);
      simulator.createOrder("B", 1, 58, 100);
      return simulator.getStateSnapshot().orders.map(order => order.productionRoute);
    });

    expect(routes).toEqual(["parallel", "sequential"]);
  });
});
