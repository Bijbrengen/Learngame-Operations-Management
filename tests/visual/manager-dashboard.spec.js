const { test, expect } = require("@playwright/test");

async function prepareAppShell(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.LEARNGameOMSimulator);
  await page.evaluate(() => {
    document.body.classList.remove("auth-pending");
    const gate = document.getElementById("leerpretAuthGate");
    if (gate) gate.hidden = true;
  });
}

test.describe("Manager Dashboard & Perspectives", () => {
  test.beforeEach(async ({ page }) => {
    await prepareAppShell(page);
  });

  test("wisselen tussen Speler weergave en Beheer weergave", async ({ page }) => {
    await page.evaluate(() => {
      window.LEARNGameOMSimulator.setAppView("manager");
    });

    const managerWorkbench = page.locator('#managerWorkbench');
    await expect(managerWorkbench).toBeVisible();

    const managerViewBtn = page.locator('#managerViewButton');
    const playerViewBtn = page.locator('#playerViewButton');

    await expect(managerViewBtn).toHaveAttribute("aria-pressed", "true");
    await expect(playerViewBtn).toHaveAttribute("aria-pressed", "false");

    // Schakel terug naar Speler
    await page.evaluate(() => {
      window.LEARNGameOMSimulator.setAppView("player");
    });

    await expect(managerWorkbench).toBeHidden();
    await expect(playerViewBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("navigeren door de 6 beheertabs", async ({ page }) => {
    await page.evaluate(() => {
      window.LEARNGameOMSimulator.setAppView("manager");
    });
    const managerWorkbench = page.locator('#managerWorkbench');
    await expect(managerWorkbench).toBeVisible();

    const tabs = ["session", "process", "inventory", "core", "events", "tower-editor"];

    for (const tabKey of tabs) {
      await page.evaluate((key) => {
        window.LEARNGameOMSimulator.setManagerTab(key);
      }, tabKey);

      const tabButton = page.locator(`[data-manager-tab="${tabKey}"]`);
      await expect(tabButton).toHaveClass(/is-active/);
    }
  });
});
