const { test, expect } = require("./fixtures");

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

  test("de gamecode en invoerfocus blijven tijdens lobbyverversingen behouden", async ({ page }) => {
    await page.evaluate(() => window.LEARNGameOMSimulator.setAppView("player"));
    const gameCode = page.locator('[data-game-code-join] input[name="join_code"]');
    await gameCode.fill("ABC123");
    await gameCode.evaluate(input => input.setSelectionRange(3, 3));

    await page.waitForTimeout(3_300);

    await expect(gameCode).toHaveValue("ABC123");
    await expect(gameCode).toBeFocused();
  });

  test("Toren B gebruikt werkelijk blauwe 2 bij 4-blokken", async ({ page }) => {
    const dimensions = await page.evaluate(() => {
      const parts = window.LogisticsGameEngine.PART_DEFINITIONS;
      const core = window.LeerpretSDK.components["lego-builder"].logic;
      return {
        blueWide: core.pieceDimensions("blue_8", parts),
        blueSquare: core.pieceDimensions("blue_4", parts)
      };
    });

    expect(dimensions.blueWide).toEqual({ width: 4, depth: 2 });
    expect(dimensions.blueSquare).toEqual({ width: 2, depth: 2 });
  });

  test("de aparte Opstelling blijft direct met de gekozen preset gesynchroniseerd", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');
    const sessionTab = page.locator('[data-manager-tab="session"]');
    const layoutTab = page.locator('[data-manager-tab="layout"]');
    const preview = page.locator('[data-manager-panel="layout"] [data-configuration-layout-preview]');
    const schematic = preview.locator(".session-layout-config-summary");
    const openSchematic = async () => {
      await expect(schematic).toBeVisible();
      if (!await schematic.evaluate(element => element.open)) {
        await schematic.locator("summary").click();
      }
      await expect(schematic).toHaveAttribute("open", "");
    };

    await gameType.selectOption("lo4");
    await expect(form.locator('[name="parallel_production"]')).toBeChecked();
    await layoutTab.click();
    await expect(layoutTab).toHaveAttribute("aria-selected", "true");
    await expect(preview).toBeVisible();
    await openSchematic();
    await expect(preview.locator('[data-layout-topology="parallel"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="production-a"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="production-b"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="production-c"]')).toBeVisible();

    await sessionTab.click();
    await expect(sessionTab).toHaveAttribute("aria-selected", "true");
    await gameType.selectOption("lo5");
    await expect(form.locator('[name="sequential_production"]')).toBeChecked();
    await layoutTab.click();
    await expect(layoutTab).toHaveAttribute("aria-selected", "true");
    await openSchematic();
    await expect(preview.locator('[data-layout-topology="sequential"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="supplier"]')).toBeVisible();
    await expect(preview.locator('[data-layout-node="raw"]')).toBeVisible();
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
    const rawWarehouseRole = page.locator('[data-manager-panel="roles"] [name="role_raw_warehouse"]');

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
    await expect(rawWarehouseRole).toBeChecked();
    await expect(supplierRole).not.toBeChecked();
    expect(await page.evaluate(() => (
      window.LOMRuntimeRoles.stationId("raw_warehouse") === window.LOMRuntimeRoles.stationId("supplier")
    ))).toBe(true);

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
        await route.fallback();
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
      "logistics_manager",
      "raw_warehouse",
      "finished_warehouse",
      "production_a",
      "production_b",
      "production_c"
    ]);
    expect(dialogs).toEqual([]);
  });

  test("tijdelijke service-isolatie toont geen blokkerende technische popup", async ({ page }) => {
    let requestCount = 0;
    const dialogs = [];
    page.on("dialog", async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.route(/\/v1\/game-sessions$/, async route => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      requestCount += 1;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Service tijdelijk geïsoleerd" })
      });
    });

    await page.getByRole("button", { name: "Sessie aanmaken" }).click();
    await expect.poll(() => requestCount).toBe(1);

    expect(dialogs).toEqual([]);
    await expect(page.locator("#gameSessionCreateForm")).toBeVisible();
  });

  test("afgebroken sessieverzoek toont geen signal-aborted-popup", async ({ page }) => {
    const dialogs = [];
    page.on("dialog", async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.evaluate(() => {
      const fetchBeforeAbortTest = window.fetch;
      window.fetch = (input, options = {}) => {
        const url = typeof input === "string" ? input : input.url;
        if (url.endsWith("/v1/game-sessions") && options.method === "POST") {
          return Promise.reject(new DOMException("signal is aborted without reason", "AbortError"));
        }
        return fetchBeforeAbortTest(input, options);
      };
    });

    await page.getByRole("button", { name: "Sessie aanmaken" }).click();
    await page.waitForTimeout(100);

    expect(dialogs).toEqual([]);
    await expect(page.locator("#gameSessionCreateForm")).toBeVisible();
    await expect(page.locator('script[src^="game-sessions.js"]')).toHaveAttribute(
      "src",
      /game-sessions\.js\?v=/
    );
  });

  test("aangepast scenario verstuurt altijd een contractueel gametype", async ({ page }) => {
    let requestPayload;
    await page.route(/\/v1\/game-sessions$/, async route => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      requestPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "finished" })
      });
    });

    const form = page.locator("#gameSessionCreateForm");
    await form.locator('[name="game_type"]').selectOption("lo4");
    await form.locator('[name="price_mode"]').selectOption("free");
    await expect(form.locator('[name="game_type"]')).toHaveValue("custom_draft");
    await page.getByRole("button", { name: "Sessie aanmaken" }).click();
    await expect.poll(() => requestPayload?.game_config?.game_type).toBe("lo4");
  });

  test("gamesessie afsluiten gebruikt tweemaal klikken zonder browserpopup", async ({ page }) => {
    const activeSession = {
      session_id: "session-running",
      status: "running",
      is_game_master: true,
      join_code: "ABC123",
      session_type: "closed",
      difficulty_level: "normal",
      current_member_id: "member-1",
      game_master_member_id: "member-1",
      members: [{
        member_id: "member-1",
        assigned_role_id: "production_a",
        present: true
      }],
      virtual_agents: [],
      required_role_ids: ["production_a"],
      role_vacancies: [],
      game_config: {
        game_type: "lo4",
        play_mode: "digital",
        customer_order_mode: "required"
      }
    };
    await page.unroute("**/v1/game-sessions/availability**");
    await page.route("**/v1/game-sessions/availability**", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        current_session: activeSession,
        discoverable_sessions: [],
        open_sessions: [],
        can_start_free_game: false
      })
    }));
    let finishRequests = 0;
    await page.route("**/v1/game-sessions/session-running/finish", route => {
      finishRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "finished" })
      });
    });
    const dialogs = [];
    page.on("dialog", async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    await page.goto("/");
    await page.waitForFunction(() => window.LEARNGameOMSimulator);
    await page.locator("body.auth-authenticated").waitFor({ state: "attached" });
    await page.evaluate(() => {
      window.LEARNGameOMSimulator.setAppView("manager");
      window.LEARNGameOMSimulator.setManagerTab("session");
    });
    const finishButton = page.locator("#managerSessionActionButton");
    await expect(finishButton).toBeVisible();
    await expect(finishButton).toHaveText("Sessie afsluiten");
    await finishButton.click();
    await expect(finishButton).toHaveText("Nogmaals klikken om af te sluiten");
    expect(finishRequests).toBe(0);
    expect(dialogs).toEqual([]);

    await finishButton.click();
    await expect.poll(() => finishRequests).toBe(1);
    expect(dialogs).toEqual([]);
  });

  test("een conceptlobby herstelt alle presetrollen en vergrendelt de rol pas na de start", async ({ page }) => {
    const lo4Roles = [
      "customer", "logistics_manager", "raw_warehouse", "production_a",
      "production_b", "production_c", "finished_warehouse"
    ];
    let repairedRoles = null;
    let repairedHasSupplier = null;
    let currentSession = {
      session_id: "session-role-repair",
      status: "ready",
      is_game_master: true,
      join_code: "ROLE01",
      session_type: "closed",
      difficulty_level: "normal",
      current_member_id: "member-master",
      game_master_member_id: "member-master",
      members: [{ member_id: "member-master", assigned_role_id: "supplier", present: true }],
      virtual_agents: [],
      required_role_ids: ["supplier"],
      role_vacancies: [],
      game_config: {
        game_type: "lo4",
        play_mode: "digital",
        enabled_roles: ["supplier"],
        has_supplier: true
      },
      consensus: null
    };
    await page.unroute("**/v1/game-sessions/availability**");
    await page.route("**/v1/game-sessions/availability**", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        current_session: currentSession,
        discoverable_sessions: [],
        open_sessions: [],
        can_start_free_game: false
      })
    }));
    await page.route("**/v1/game-sessions/session-role-repair/configuration", route => {
      const repairedConfig = route.request().postDataJSON().game_config;
      repairedRoles = repairedConfig.enabled_roles;
      repairedHasSupplier = repairedConfig.has_supplier;
      currentSession = {
        ...currentSession,
        status: "lobby",
        game_config: { ...currentSession.game_config, ...repairedConfig },
        required_role_ids: [...repairedRoles],
        role_vacancies: repairedRoles.filter(roleId => roleId !== "supplier")
      };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(currentSession) });
    });
    await page.route("**/v1/game-sessions/session-role-repair/game-master-role", route => {
      const roleId = route.request().postDataJSON().role_id;
      currentSession = {
        ...currentSession,
        members: [{ member_id: "member-master", assigned_role_id: roleId, present: true }],
        role_vacancies: lo4Roles.filter(candidate => candidate !== roleId)
      };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(currentSession) });
    });

    await page.reload();
    await page.waitForFunction(() => window.LEARNGameOMSimulator);
    await page.locator("body.auth-authenticated").waitFor({ state: "attached" });
    await page.evaluate(() => {
      window.LEARNGameOMSimulator.setAppView("manager");
      window.LEARNGameOMSimulator.setManagerTab("session");
    });
    await expect.poll(() => repairedRoles).toEqual(lo4Roles);
    expect(repairedHasSupplier).toBe(true);
    const roleSelect = page.locator("#managerSessionContent [data-game-master-role-select]");
    await expect(roleSelect.locator("option")).toHaveCount(lo4Roles.length);
    const vacancySummary = page.locator("#managerSessionContent .session-role-distribution > header > strong");
    await expect(vacancySummary).toHaveText("7 rollen nog niet vervuld");

    await roleSelect.selectOption("production_a");
    await expect.poll(() => currentSession.members[0].assigned_role_id).toBe("production_a");
    await expect(roleSelect).toHaveValue("production_a");
    await expect(vacancySummary).toHaveText("6 rollen nog niet vervuld");

    currentSession = { ...currentSession, status: "running" };
    await expect(page.locator("#managerSessionContent [data-game-master-role-select]")).toHaveCount(0, { timeout: 8000 });
    await expect(page.locator("#managerSessionActionButton")).toHaveText("Sessie afsluiten");
  });

  test("een al afgehandeld startverzoek synchroniseert zonder browserpopup", async ({ page }) => {
    let voteHandled = false;
    const session = {
      session_id: "session-consensus",
      status: "lobby",
      is_game_master: false,
      join_code: "ABC123",
      session_type: "closed",
      difficulty_level: "normal",
      current_member_id: "member-1",
      game_master_member_id: "member-2",
      members: [{ member_id: "member-1", assigned_role_id: "production_a", present: true }],
      virtual_agents: [],
      required_role_ids: ["production_a", "production_b"],
      role_vacancies: ["production_b"],
      game_config: { game_type: "lo4", play_mode: "digital" },
      consensus: {
        status: "open",
        required_member_ids: ["member-1"],
        approved_member_ids: []
      }
    };
    await page.unroute("**/v1/game-sessions/availability**");
    await page.route("**/v1/game-sessions/availability**", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        current_session: voteHandled ? { ...session, consensus: null } : session,
        discoverable_sessions: [],
        open_sessions: [],
        can_start_free_game: false
      })
    }));
    await page.route("**/v1/game-sessions/session-consensus/consensus", route => {
      voteHandled = true;
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Er staat geen startverzoek open." })
      });
    });
    const dialogs = [];
    page.on("dialog", async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    await page.goto("/");
    await page.waitForFunction(() => window.LEARNGameOMSimulator);
    await page.locator("body.auth-authenticated").waitFor({ state: "attached" });
    await expect(page.locator("#gameConsensusDialog")).toBeVisible();
    await page.locator("#gameConsensusWaitButton").click();

    await expect.poll(() => voteHandled).toBe(true);
    await expect(page.locator("#gameConsensusDialog")).toBeHidden();
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
      window.LEARNGameOMSimulator.setManagerTab("balance-sheet");
    });
    await expect(page.locator('[data-manager-panel="balance-sheet"]')).toContainText(
      "Fictieve nulbalans"
    );
    await expect(page.locator('[data-manager-panel="balance-sheet"]')).toContainText(
      "Totaal activa"
    );
    await page.evaluate(() => window.LEARNGameOMSimulator.setManagerTab("income-statement"));
    await expect(page.locator('[data-manager-panel="income-statement"]')).toContainText(
      "Boekhoudkundig resultaat"
    );
  });

  test("productieplanning volgt de gamepreset en kan via de adviseur worden geactiveerd", async ({ page }) => {
    const form = page.locator("#gameSessionCreateForm");
    const gameType = form.locator('[name="game_type"]');
    const planning = form.locator('[name="production_planning_enabled"]');

    await gameType.selectOption("lo4");
    await expect(planning).not.toBeChecked();

    await page.locator("#gameAdvisorButton").click();
    await expect(page.locator("#gameAdvisorPanel")).toBeVisible();
    const advisorStyle = await page.locator("#gameAdvisorPanel").evaluate(element => {
      const style = getComputedStyle(element);
      const warning = element.querySelector(".game-advisor-insight.is-warning");
      const warningStyle = warning ? getComputedStyle(warning) : null;
      return {
        backgroundImage: style.backgroundImage,
        color: style.color,
        warningBackground: warningStyle?.backgroundColor || "",
        warningColor: warningStyle?.color || ""
      };
    });
    expect(advisorStyle.backgroundImage).toContain("linear-gradient");
    expect(advisorStyle.color).not.toBe("rgb(255, 255, 255)");
    expect(advisorStyle.warningBackground).not.toBe("rgb(255, 251, 235)");
    expect(advisorStyle.warningColor).not.toBe("rgb(255, 255, 255)");
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
