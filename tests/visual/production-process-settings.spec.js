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

  test("LO Game 4 past alle presetinstellingen toe en blijft geselecteerd", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');

    // Begin bij LO Game 6, zodat de test kan bewijzen dat afwijkende waarden
    // werkelijk worden vervangen en niet toevallig al goed stonden.
    await gameType.selectOption("lo6");
    await expect(form.locator('[name="sequential_production"]')).toBeChecked();
    await expect(form.locator('[name="multiple_colors"]')).toBeChecked();
    await expect(form.locator('[name="product_type_count"]')).toHaveValue("9");

    await gameType.selectOption("lo4");

    await expect(gameType).toHaveValue("lo4");
    await expect(gameType.locator("option:checked")).toHaveText("LO Game 4");
    await expect(form.locator('[name="money"]')).toBeChecked();
    await expect(form.locator('[name="pnl"]')).toBeChecked();
    await expect(form.locator('[name="intermediate_stock"]')).not.toBeChecked();
    await expect(form.locator('[name="opportunity_costs"]')).toBeChecked();
    await expect(form.locator('[name="role_freedom"]')).not.toBeChecked();
    await expect(form.locator('[name="multiple_colors"]')).not.toBeChecked();
    await expect(form.locator('[name="parallel_production"]')).toBeChecked();
    await expect(form.locator('[name="sequential_production"]')).not.toBeChecked();
    await expect(form.locator('[name="price_mode"]')).toHaveValue("fixed");
    await expect(form.locator('[name="customer_order_mode"]')).toHaveValue("required");
    await expect(form.locator('[name="product_type_count"]')).toHaveValue("3");
    await expect(form.locator('[name="role_production_a"]')).toBeChecked();
    await expect(form.locator('[name="role_production_1"]')).not.toBeChecked();
  });

  test("fysiek en digitaal wisselen verandert de gekozen preset niet", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');
    const playMode = form.locator('[name="play_mode"]');

    await gameType.selectOption("lo4");
    await expect(gameType).toHaveValue("lo4");

    await playMode.selectOption("digital");
    await expect(playMode).toHaveValue("digital");
    await expect(gameType).toHaveValue("lo4");
    await expect(gameType.locator("option:checked")).toHaveText("LO Game 4");

    await playMode.selectOption("physical");
    await expect(playMode).toHaveValue("physical");
    await expect(gameType).toHaveValue("lo4");
    await expect(gameType.locator("option:checked")).toHaveText("LO Game 4");
  });

  test("digitale LO Game 4 kan zonder validatiepopup worden aangemaakt", async ({ page }) => {
    let requestPayload;
    let resolveRequest;
    const requestReceived = new Promise(resolve => {
      resolveRequest = resolve;
    });
    const dialogs = [];
    page.on("dialog", async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.route(/\/v1\/game-sessions$/, async route => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      requestPayload = route.request().postDataJSON();
      resolveRequest();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "finished" })
      });
    });

    const form = page.locator("#gameSessionCreateForm");
    await form.locator('[name="game_type"]').selectOption("lo4");
    await form.locator('[name="play_mode"]').selectOption("digital");
    await form.getByRole("button", { name: "Sessie aanmaken" }).click();
    await requestReceived;

    expect(requestPayload.game_config.play_mode).toBe("digital");
    expect(requestPayload.game_config.game_type).toBe("lo4");
    expect(requestPayload.game_config.enabled_roles).toEqual([
      "customer",
      "logistics_manager",
      "raw_warehouse",
      "production_a",
      "production_b",
      "production_c",
      "finished_warehouse",
      "sales",
      "finance"
    ]);
    expect(dialogs).toEqual([]);
  });

  test("openingsbalans en omzetbalans volgen Geld en de gekozen gamepreset", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');
    const money = form.locator('[name="money"]');
    const openingBalance = form.locator('[name="opening_balance_enabled"]');
    const revenueBalance = form.locator('[name="revenue_balance_enabled"]');
    const financialDetails = form.locator("[data-financial-detail-settings]");
    const advisor = form.locator("[data-financial-advisor-preview]");

    await gameType.selectOption("lo4");
    await expect(money).toBeChecked();
    await expect(openingBalance).toBeChecked();
    await expect(revenueBalance).not.toBeChecked();
    await expect(advisor).toContainText("beginpositie");

    await gameType.selectOption("lo5");
    await expect(openingBalance).toBeChecked();
    await expect(revenueBalance).toBeChecked();
    await expect(advisor).toContainText("liquiditeit");

    await money.uncheck();
    await expect(financialDetails).toBeHidden();
    await expect(openingBalance).toBeDisabled();
    await expect(revenueBalance).toBeDisabled();
    await expect(openingBalance).not.toBeChecked();
    await expect(revenueBalance).not.toBeChecked();

    await page.evaluate(() => {
      window.LEARNGameOMSimulator.applyGameTypePreset("lo5", false);
      window.LEARNGameOMSimulator.setManagerTab("inventory");
    });
    await expect(page.locator('[data-financial-overview="revenue-balance"]')).toBeVisible();
    await expect(page.locator("[data-financial-advisor]")).toContainText("netto-effect");
  });

  test("productieplanning volgt de gamepreset en kan via de adviseur worden geactiveerd", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');
    const planning = form.locator('[name="production_planning_enabled"]');

    await gameType.selectOption("lo4");
    await expect(planning).not.toBeChecked();

    await page.locator("#gameAdvisorButton").click();
    await expect(page.locator("#gameAdvisorPanel")).toBeVisible();
    await expect(page.locator("#gameAdvisorPanel")).toContainText(
      "Hebben jullie gedacht aan productieplanning?"
    );
    await page.locator("[data-advisor-enable-planning]").click();
    await expect(page.locator("[data-production-planning]")).toBeVisible();

    await page.locator('[data-plan-product="A"]').fill("3");
    await page.locator('[data-plan-product="B"]').fill("2");
    await page.locator('[data-plan-product="C"]').fill("1");
    await page.locator("[data-save-production-plan]").click();
    await expect(page.locator("[data-production-plan-status]")).toContainText(
      "6 gepland"
    );

    await gameType.selectOption("lo5");
    await expect(planning).toBeChecked();
  });
});
