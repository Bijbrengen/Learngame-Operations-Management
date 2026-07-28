const { test, expect } = require("@playwright/test");

async function openManagerSettings(page) {
  await page.route("**/auth/leerbox/session**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      authenticated: true,
      user: { label: "Playwright" },
      roles: ["learner"]
    })
  }));
  await page.route("**/api/auth/google/config**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ enabled: true, client_id: "playwright", scope: "openid" })
  }));
  await page.route("**/v1/game-sessions/availability**", route => route.fulfill({
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
  await page.evaluate(() => {
    window.LEARNGameOMSimulator.setAppView("manager");
    window.LEARNGameOMSimulator.setManagerTab("session");
  });
  await page.locator(".game-session-heading-actions .session-config-save").waitFor({ state: "visible" });
}

test.describe("Parallelle en sequentiële productieroutes", () => {
  test.beforeEach(async ({ page }) => {
    await openManagerSettings(page);
  });

  test("de aparte Opstelling blijft direct met de gekozen preset gesynchroniseerd", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');
    const preview = page.locator('[data-manager-panel="layout"] [data-configuration-layout-preview]');

    await gameType.selectOption("lo4");
    await page.evaluate(() => window.LEARNGameOMSimulator.setManagerTab("layout"));
    await expect(preview).toBeVisible();
    await expect(preview.locator('[data-layout-topology="parallel"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="production-a"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="production-b"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="production-c"]')).toBeVisible();

    await page.evaluate(() => window.LEARNGameOMSimulator.setManagerTab("session"));
    await gameType.selectOption("lo5");
    await page.evaluate(() => window.LEARNGameOMSimulator.setManagerTab("layout"));
    await expect(preview.locator('[data-layout-topology="sequential"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="supplier"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="production-1"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="stock-1"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="customer"]')).toBeVisible();

    await expect(preview.locator("[data-layout-view]")).toHaveCount(0);
  });

  test("historietabel bevat alle ontwikkelvarianten en kiest de aangeklikte preset", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');
    await page.evaluate(() => window.LEARNGameOMSimulator.setManagerTab("history"));
    const history = page.locator('[data-manager-panel="history"]');

    for (const variantId of [
      "lo5b",
      "lo7_digital",
      "lo9",
      "entrepreneurial_simple",
      "la_game",
      "learngame_small_2018",
      "la_game_small_2020",
      "entrepreneurial_digital"
    ]) {
      await expect(gameType.locator(`option[value="${variantId}"]`)).toHaveCount(1);
    }

    await history.locator('[data-select-history-preset="lo5b"]').click();
    await expect(gameType).toHaveValue("lo5b");
    await expect(history.locator("[data-variant-history-info]")).toContainText("decentrale inkoop");
    await expect(history.locator("[data-variant-history-info]")).toContainText("Effectief en efficiënt, maar inflexibel");

    await history.locator('[data-select-history-preset="lo7_digital"]').click();
    await expect(gameType).toHaveValue("lo7_digital");
    await expect(form.locator('[name="play_mode"]')).toHaveValue("digital");
    await expect(history.locator("[data-variant-history-info]")).toContainText("digitale tracing");
  });

  test("hybride combinatie wordt aangepast scenario en kan een eigen naam krijgen", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');
    await gameType.selectOption("lo4");

    const parallel = form.locator('[name="parallel_production"]');
    const sequential = form.locator('[name="sequential_production"]');
    await expect(parallel).toBeChecked();
    await expect(sequential).not.toBeChecked();

    await sequential.evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });

    await expect(form.locator("[data-hybrid-production-tooltip]")).toBeVisible();
    await expect(gameType).toHaveValue("custom_draft");

    const presetSave = page.locator(".game-session-heading-actions .session-config-save");
    await presetSave.evaluate(el => { el.open = true; });
    await presetSave.locator('[name="configuration_name"]').fill("Hybride klantorderroute");
    await presetSave.locator('[name="configuration_description"]').fill("Parallel en sequentieel tegelijk.");
    await presetSave.getByRole("button", { name: "Preset opslaan" }).click();

    await expect(gameType.locator("option:checked")).toContainText("Hybride klantorderroute");

    await sequential.evaluate(el => { el.checked = false; el.dispatchEvent(new Event('change', { bubbles: true })); });
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
    await expect(page.locator('[data-manager-panel="roles"] [name="role_production_a"]')).toBeChecked();
    await expect(page.locator('[data-manager-panel="roles"] [name="role_production_1"]')).not.toBeChecked();
  });

  test("torens, kleuren en leverancier volgen de gekozen LO-Game", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');
    const productCount = form.locator('[name="product_type_count"]');
    const multipleColors = form.locator('[name="multiple_colors"]');
    const supplier = form.locator('[name="has_supplier"]');
    const supplierRole = page.locator('[data-manager-panel="roles"] [name="role_supplier"]');

    await gameType.selectOption("lo1");
    await expect(productCount).toHaveValue("1");
    await expect(productCount).toBeDisabled();
    await expect(multipleColors).not.toBeChecked();
    await expect(multipleColors).toBeDisabled();
    await expect(supplier).not.toBeChecked();
    await expect(supplierRole).not.toBeChecked();

    await gameType.selectOption("lo4");
    await expect(productCount).toHaveValue("3");
    await expect(productCount).toBeDisabled();
    await expect(supplier).toBeChecked();
    await expect(supplierRole).toBeChecked();

    await gameType.selectOption("lo6");
    await expect(productCount).toBeEnabled();
    await productCount.fill("4");
    await expect(productCount).toHaveValue("4");
    await expect(multipleColors).toBeEnabled();
  });

  test("meerdere valuta worden met basisvaluta en wisselkoers verzameld", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    await form.locator('[name="game_type"]').selectOption("lo4");
    await form.locator('[name="multiple_currencies"]').evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await form.locator('[name="currency_USD_enabled"]').evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await form.locator('[name="exchange_rate_USD"]').fill("1.25");

    await expect(form.locator("[data-currency-rate-options]")).toBeVisible();
    const config = await form.evaluate(element => {
      const api = window.LEARNGameInteractionManifest;
      return {
        missing: api.validate("game_configuration", element),
        walkthrough: api.createWalkthrough("game_configuration")
      };
    });
    expect(config.missing.filter(item => item !== "create_session")).toEqual([]);
    expect(config.walkthrough.map(step => step.id)).toContain("set_currency_mode");
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
    await page.getByRole("button", { name: "Sessie aanmaken" }).click();
    await requestReceived;

    expect(requestPayload.game_config.play_mode).toBe("digital");
    expect(requestPayload.game_config.game_type).toBe("lo4");
    expect(requestPayload.game_config.enabled_roles).toEqual([
      "customer",
      "supplier",
      "logistics_manager",
      "raw_warehouse",
      "finished_warehouse",
      "production_a",
      "production_b",
      "production_c",
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
    await gameType.dispatchEvent("change");
    await expect(openingBalance).toBeChecked();
    await expect(revenueBalance).toBeChecked();
    await expect(advisor).toContainText("liquiditeit");

    await money.evaluate(el => { el.checked = false; el.dispatchEvent(new Event('change', { bubbles: true })); });
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

    await page.evaluate(() => window.LEARNGameOMSimulator.setManagerTab("session"));
    await gameType.selectOption("lo5");
    await expect(planning).toBeChecked();
  });
});
