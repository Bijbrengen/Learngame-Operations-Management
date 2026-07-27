const { test, expect } = require("@playwright/test");

async function openManagerSettings(page) {
  await page.route("**/sdk/lego-builder/logic.js", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: "window.LeerpretSDK = window.LeerpretSDK || {};"
  }));
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

test("iedere spelinstelling geeft toegankelijke uitleg over werking en leereffect", async ({ page }) => {
  await openManagerSettings(page);

  const form = page.locator("#gameSessionCreateForm");
  await expect(form.locator("[data-config-help] > .configuration-help-button")).toHaveCount(19);

  const money = form.locator('[name="money"]');
  await expect(money).toBeChecked();
  await form.getByRole("button", { name: "Uitleg over Geld en marges" }).click();

  const dialog = page.getByRole("dialog", { name: "Geld en marges" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Direct effect" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Systeem- en leereffect" })).toBeVisible();
  await expect(dialog).toContainText("rustige afdeling");
  await expect(dialog).toContainText("gemiste dekkingsbijdragen");
  await expect(dialog).toContainText("LO-Game 4");
  await expect(money).toBeChecked();

  await dialog.getByRole("button", { name: "Uitleg sluiten" }).click();
  await expect(dialog).toBeHidden();

  const gameType = form.locator('[name="game_type"]');
  const organizationModel = form.locator('[name="organization_model"]');
  await gameType.selectOption("entrepreneurial");
  await expect(organizationModel).toHaveValue("independent_enterprises");
  await form.getByRole("button", { name: "Uitleg over Organisatievorm" }).click();
  await expect(page.getByRole("dialog", { name: "Organisatievorm" })).toContainText(
    "onafhankelijke leveranciers, producenten en handelaren"
  );
  await page.getByRole("button", { name: "Uitleg sluiten" }).click();
  await organizationModel.selectOption("single_enterprise");
  await expect(gameType).toHaveValue("custom_draft");

  await gameType.selectOption("lo6");
  await expect(organizationModel).toHaveValue("single_enterprise");
  await expect(form.getByRole("button", { name: "Uitleg over Kleurvrijheid" })).toBeVisible();
});
