const { test, expect } = require("./fixtures");

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

    const playerViewBtn = page.locator('#playerViewButton');

    await expect(playerViewBtn).toHaveAttribute("aria-pressed", "false");

    // Schakel terug naar Speler
    await page.evaluate(() => {
      window.LEARNGameOMSimulator.setAppView("player");
    });

    await expect(managerWorkbench).toBeHidden();
    await expect(playerViewBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("navigeren door de Game-werkvensters", async ({ page }) => {
    await page.evaluate(() => {
      window.LEARNGameOMSimulator.setAppView("manager");
    });
    const managerWorkbench = page.locator('#managerWorkbench');
    await expect(managerWorkbench).toBeVisible();

    const tabs = [
      "session",
      "layout",
      "process",
      "digital-twin",
      "inventory",
      "history",
      "roles",
      "game-presets",
      "role-presets"
    ];

    for (const tabKey of tabs) {
      await page.evaluate((key) => {
        window.LEARNGameOMSimulator.setManagerTab(key);
      }, tabKey);

      const tabButton = page.locator(`button[data-manager-tab="${tabKey}"]`);
      await expect(tabButton).toHaveClass(/is-active/);
    }
  });
});
