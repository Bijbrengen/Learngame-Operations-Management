const { test, expect } = require("./fixtures");

async function prepareAppShell(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.LEARNGameOMSimulator, { timeout: 30000 });
  await page.evaluate(() => {
    document.body.className = "";
    const gate = document.getElementById("leerpretAuthGate");
    if (gate) {
      gate.hidden = true;
      gate.style.display = "none";
    }
  });
}

test.describe("Sessiebeheer & Lobby Flow", () => {
  test.beforeEach(async ({ page }) => {
    await prepareAppShell(page);
  });

  test("Spelerspanel toont sessie-status en lobby-elementen", async ({ page }) => {
    const sessionPanel = page.locator("#playerSessionPanel");
    await expect(sessionPanel).toBeAttached();

    const title = page.locator("#playerSessionTitle");
    await expect(title).toBeAttached();
    await expect(title).toContainText("gamesessie");

    const badge = page.locator("#playerSessionBadge");
    await expect(badge).toBeAttached();
  });

  test("Game Master kan sessietab openen in Beheer", async ({ page }) => {
    await page.evaluate(() => {
      window.LEARNGameOMSimulator.setAppView("manager");
      window.LEARNGameOMSimulator.setManagerTab("session");
    });
    const managerWorkbench = page.locator('#managerWorkbench');
    await expect(managerWorkbench).toBeVisible();

    const sessionTab = page.locator('button[data-manager-tab="session"]');
    await expect(sessionTab).toHaveClass(/is-active/);
  });
});
