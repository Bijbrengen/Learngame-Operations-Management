const { test, expect } = require("@playwright/test");

async function openManagerSettings(page) {
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
  await page.route("**/v1/player/behavior-profile", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ exists: true, profile: {} })
  }));
  await page.goto("/");
  await page.waitForFunction(() => window.LEARNGameOMSimulator);
  await page.locator("body.auth-authenticated").waitFor({ state: "attached" });
  await page.locator("#characterCreationGate").waitFor({ state: "hidden" });
  await page.evaluate(() => {
    window.LEARNGameOMSimulator.setAppView("manager");
    window.LEARNGameOMSimulator.setManagerTab("session");
  });
  await page.locator("#gameSessionCreateForm .session-config-save").waitFor({ state: "visible" });
}

test.describe("Parallelle en sequentiële productieroutes", () => {
  test.beforeEach(async ({ page }) => {
    await openManagerSettings(page);
  });

  test("hybride combinatie wordt aangepast scenario en kan een eigen naam krijgen", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');
    await gameType.selectOption("lo4");

    const parallel = form.locator('[name="parallel_production"]');
    const sequential = form.locator('[name="sequential_production"]');
    await expect(parallel).toBeChecked();
    await expect(sequential).not.toBeChecked();

    await sequential.check();

    await expect(form.locator("[data-hybrid-production-tooltip]")).toBeVisible();
    await expect(gameType).toHaveValue("custom_draft");

    await form.locator(".session-config-save summary").click();
    await form.locator('[name="configuration_name"]').fill("Hybride klantorderroute");
    await form.locator('[name="configuration_description"]').fill("Parallel en sequentieel tegelijk.");
    await form.getByRole("button", { name: "Preset opslaan" }).click();

    await expect(gameType.locator("option:checked")).toContainText("Hybride klantorderroute");

    await sequential.click();
    await expect(form.locator("[data-hybrid-production-tooltip]")).toBeHidden();
    await expect(gameType).toHaveValue("lo4");
  });

  test("geen enkele route uitzetten herstelt de standaardroute van de gekozen game", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');
    await gameType.selectOption("lo5");

    const sequential = form.locator('[name="sequential_production"]');
    await expect(sequential).toBeChecked();
    await sequential.click();

    await expect(sequential).toBeChecked();
    await expect(form.locator('[name="parallel_production"]')).not.toBeChecked();
  });
});
