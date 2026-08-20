const { test, expect } = require("@playwright/test");

async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function mockAuthenticatedApp(page, { profileExists = true } = {}) {
  await page.route("**/accounts.google.com/**", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: ""
  }));
  await page.route("**/auth/leerbox/session**", route => fulfillJson(route, 200, {
    authenticated: true,
    user: { label: "Playwright regressie" },
    roles: ["learner"]
  }));
  await page.route("**/api/auth/google/config**", route => fulfillJson(route, 200, {
    enabled: true,
    client_id: "playwright-client.apps.googleusercontent.com",
    scope: "openid"
  }));
  await page.route("**/v1/player/behavior-profile**", route => fulfillJson(route, 200, {
    exists: profileExists,
    ...(profileExists ? { profile: {} } : {})
  }));
  await page.route("**/v1/game-sessions/availability**", route => fulfillJson(route, 200, {
    current_session: null,
    discoverable_sessions: [],
    open_sessions: [],
    can_start_free_game: true
  }));
}

async function openManagerSessionSettings(page) {
  await mockAuthenticatedApp(page);
  await page.goto("/?api=http://127.0.0.1:47111/api");
  await page.waitForFunction(() => window.LEARNGameOMSimulator && window.GameConfigurationStore);
  await page.locator("body.auth-authenticated").waitFor({ state: "attached" });
  await expect(page.locator("#characterCreationGate")).toBeHidden();
  await page.evaluate(() => {
    window.LEARNGameOMSimulator.setAppView("manager");
    window.LEARNGameOMSimulator.setManagerTab("session");
  });
  const form = page.locator("#gameSessionCreateForm");
  await expect(form).toBeVisible();
  return form;
}

test.describe("Kritieke regressies: authenticatie, presets en productie", () => {
  test("1. karakteraanmaak gebruikt profielstatus 200 en actuele kwaliteits-API", async ({ page }) => {
    await mockAuthenticatedApp(page, { profileExists: false });

    const profileResponse = page.waitForResponse(response => (
      response.url().includes("/v1/player/behavior-profile")
      && response.status() === 200
    ));
    await page.goto("/?api=http://127.0.0.1:47111/api");
    await profileResponse;

    const beginScans = page.locator('[data-action="begin-scans"]');
    await expect(page.locator("#characterCreationGate")).toBeVisible();
    await expect(beginScans).toBeVisible();
    await beginScans.click();
    await expect(page.getByRole("heading", { name: "Baseline Attribute Allocation" })).toBeVisible();

    await page.waitForFunction(() => (
      window.BehaviorResponseQuality
      && typeof window.BehaviorResponseQuality.assess === "function"
    ));
    const quality = await page.evaluate(() => {
      const uniformScan = Array.from({ length: 10 }, () => [5, 5, 5, 5]);
      return window.BehaviorResponseQuality.assess({
        basic_style: uniformScan,
        response_style: uniformScan
      });
    });

    expect(quality.doubtful).toBe(true);
    expect(quality.reasons.length).toBeGreaterThan(0);
  });

  test("2. bereikbare backend met 401 start Google OAuth op 127.0.0.1", async ({ page }) => {
    await page.route("**/accounts.google.com/gsi/client", route => route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `
        window.google = {
          accounts: {
            oauth2: {
              initCodeClient: () => ({
                requestCode() {
                  window.__googleCodeRequestStarted = true;
                  window.open("about:blank", "google-oauth", "popup,width=520,height=640");
                }
              })
            }
          }
        };
      `
    }));
    await page.route("**/api/auth/leerbox/session**", route => fulfillJson(route, 401, {
      detail: "No active session for this leerbox"
    }));
    await page.route("**/api/auth/leerbox/exchange**", route => fulfillJson(route, 401, {
      detail: "No active Leerpret session"
    }));
    await page.route("**/api/auth/google/config**", route => fulfillJson(route, 200, {
      enabled: true,
      client_id: "playwright-client.apps.googleusercontent.com",
      scope: "openid"
    }));

    await page.goto("/?api=http://127.0.0.1:47111/api");
    expect(new URL(page.url()).hostname).toBe("127.0.0.1");
    await expect(page.locator("#leerpretAuthMessage")).toHaveText(
      "Meld je hier met je Google-account aan."
    );
    await expect(page.locator("#leerpretAuthMessage")).not.toContainText(
      "De Leerpret-service is niet bereikbaar"
    );

    const googleButton = page.getByRole("button", {
      name: "Pseudoniem aanmelden met Google"
    });
    await expect(googleButton).toBeVisible();
    const popupPromise = page.waitForEvent("popup");
    await googleButton.click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    expect(await page.evaluate(() => window.__googleCodeRequestStarted)).toBe(true);
    await popup.close();

    const session = await page.evaluate(() => window.LeerpretAuth.getSession());
    expect(session).toMatchObject({ online: true, authenticated: false });
  });

  test("3. LO Game 4 blijft geselecteerd bij fysiek-digitaal-fysiek", async ({ page }) => {
    const form = await openManagerSessionSettings(page);
    const preset = form.locator('[name="game_type"]');
    const playMode = form.locator('[name="play_mode"]');

    await preset.selectOption("lo4");
    await expect(preset).toHaveValue("lo4");
    await expect(preset.locator("option:checked")).toHaveText("LO Game 4");

    await playMode.selectOption("digital");
    await expect(playMode).toHaveValue("digital");
    await expect(preset).toHaveValue("lo4");
    await expect(preset.locator("option:checked")).not.toContainText("Aangepast scenario");

    await playMode.selectOption("physical");
    await expect(playMode).toHaveValue("physical");
    await expect(preset).toHaveValue("lo4");
    await expect(preset.locator("option:checked")).toHaveText("LO Game 4");
  });

  test("4. digitale LO Game 4 voldoet inclusief enabled_roles aan het backendcontract", async ({ page }) => {
    const form = await openManagerSessionSettings(page);
    const allowedGameConfigFields = new Set([
      "play_mode",
      "game_type",
      "money",
      "pnl",
      "opening_balance_enabled",
      "revenue_balance_enabled",
      "production_planning_enabled",
      "intermediate_stock",
      "opportunity_costs",
      "role_freedom",
      "multiple_colors",
      "editable_color_layers",
      "price_mode",
      "production_processes",
      "logistics_organization",
      "product_type_count",
      "customer_order_mode",
      "enabled_roles",
      "has_supplier",
      "currency_mode",
      "base_currency",
      "enabled_currencies",
      "exchange_rates",
      "organization_model",
      "funding_incentive"
    ]);
    let postedBody;
    let resolvePosted;
    const posted = new Promise(resolve => {
      resolvePosted = resolve;
    });
    const dialogs = [];
    page.on("dialog", async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.route("**/v1/game-sessions**", async route => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      postedBody = route.request().postDataJSON();
      const extraFields = Object.keys(postedBody.game_config)
        .filter(field => !allowedGameConfigFields.has(field));
      if (extraFields.length) {
        await fulfillJson(route, 422, {
          detail: extraFields.map(field => ({
            type: "extra_forbidden",
            loc: ["body", "game_config", field],
            msg: "Extra inputs are not permitted"
          }))
        });
      } else {
        await fulfillJson(route, 200, { status: "finished" });
      }
      resolvePosted();
    });

    await form.locator('[name="game_type"]').selectOption("lo4");
    await form.locator('[name="play_mode"]').selectOption("digital");
    await page.getByRole("button", { name: "Sessie aanmaken" }).click();
    await posted;

    expect(postedBody.game_config.play_mode).toBe("digital");
    expect(postedBody.game_config.game_type).toBe("lo4");
    expect(postedBody.game_config.enabled_roles).toEqual(expect.arrayContaining([
      "customer",
      "logistics_manager",
      "production_a",
      "production_b",
      "production_c",
      "finished_warehouse"
    ]));
    expect(dialogs).not.toContain("Extra inputs are not permitted");
    expect(dialogs).toEqual([]);
  });

  test("5. LO Game 6 geeft vier kleurlagen vrij en de editor respecteert deelvrijgave", async ({ page }) => {
    const form = await openManagerSessionSettings(page);
    await form.locator('[name="game_type"]').selectOption("lo6");

    await expect(form.locator('[name="multiple_colors"]')).toBeChecked();
    for (const layer of ["groundPlate", "layer1", "layer2", "layer3"]) {
      await expect(form.locator(`[data-color-layer="${layer}"]`)).toBeChecked();
      await expect(form.locator(`[data-color-layer="${layer}"]`)).toBeEnabled();
    }

    await page.evaluate(() => {
      window.LEARNGameOMSimulator.setManagerTab("tower-editor");
      window.TowerEditor.setColorConfiguration({
        multipleColors: true,
        editableColorLayers: ["layer1"]
      });
    });
    const editor = page.locator("#towerEditorMount");
    await expect(editor).toBeVisible();
    await expect(page.locator('[data-manager-menu="game"]')).toBeHidden();
    await expect(page.locator('[data-manager-menu="towers"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /Bouwtafel/ })).toHaveClass(/is-active/);
    await expect(editor.locator('[data-ground-plate-color="blue"]')).toBeDisabled();
    await expect(editor.locator('[data-add-tower-part="blue_8"]')).toHaveAttribute(
      "aria-disabled",
      "false"
    );

    await page.evaluate(() => {
      window.TowerEditor.setColorConfiguration({
        multipleColors: true,
        editableColorLayers: ["groundPlate"]
      });
    });
    await expect(editor.locator('[data-ground-plate-color="blue"]')).toBeEnabled();
    await expect(editor.locator('[data-add-tower-part="yellow_8"]')).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    await expect(editor.locator('[data-add-tower-part="blue_8"]')).toHaveAttribute(
      "aria-disabled",
      "false"
    );
  });

  test("6. order van drie blokkeert overdracht tot batchbouw en getekende orderparaaf", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => (
      window.LogisticsGameEngine
      && window.LogisticsGameUI
      && window.LeerpretSDK?.components?.["lego-builder"]?.logic?.planRecipeBuild
    ));
    await page.evaluate(() => {
      document.body.className = "";
      document.body.innerHTML = '<main id="batch-regression"></main>';

      const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
        random: () => 0,
        config: {
          initialOrderDelayMs: 999999999,
          orderIntervalMinMs: 999999999,
          orderIntervalMaxMs: 999999999,
          transferDelayMinMs: 0,
          transferDelayMaxMs: 0,
          incidentChance: 0
        }
      });
      const controller = window.LogisticsGameUI.mount(
        document.getElementById("batch-regression"),
        { engine }
      );
      controller.start({
        humanRoleId: "pd1",
        playMode: "digital",
        productionProcesses: ["sequential"]
      });
      const created = engine.generateOrder();
      const order = engine.orders.get(created.id);
      order.quantity = 3;
      Object.values(engine.roleRuntime).forEach(runtime => {
        runtime.queue = runtime.queue.filter(orderId => orderId !== order.id);
      });
      engine.beginRoleWork("pd1", order.id, Date.now());
      controller.render();
      window.__batchRegression = { engine, controller, orderId: order.id };
    });

    const progress = page.locator(".sim-inline-builder-status strong");
    const signaturePad = page.locator("[data-sim-signature-pad]");
    const transferCargo = page.locator("[data-sim-transfer-cargo]");
    await expect(progress).toHaveText("0 van 3 torens gebouwd · bouw toren 1");
    await expect(signaturePad).toHaveAttribute("aria-disabled", "true");
    await expect(transferCargo).toBeDisabled();

    const lastGameBrick = page.locator('[data-sim-drag-part="yellow_8"]');
    const lastGameBrickBox = await lastGameBrick.boundingBox();
    expect(lastGameBrickBox).not.toBeNull();
    await lastGameBrick.hover();
    await page.mouse.down();
    await page.mouse.move(lastGameBrickBox.x + lastGameBrickBox.width + 18, lastGameBrickBox.y + 12, { steps: 5 });
    await expect(page.locator("#batch-regression")).toHaveClass(/is-digital-dragging/);
    await page.evaluate(() => window.__batchRegression.controller.render());
    await expect(page.locator("#batch-regression")).toHaveClass(/is-digital-dragging/);
    await expect(lastGameBrick).toHaveCSS("cursor", "grabbing");
    await page.mouse.up();
    await expect(page.locator("#batch-regression")).not.toHaveClass(/is-digital-dragging/);

    for (const expected of [
      "1 van 3 torens gebouwd · bouw toren 2",
      "2 van 3 torens gebouwd · bouw toren 3"
    ]) {
      await page.evaluate(() => {
        window.__batchRegression.controller.addDigitalPart("yellow_8");
        window.__batchRegression.controller.addDigitalPart("yellow_8");
      });
      await expect(progress).toHaveText(expected);
      await expect(signaturePad).toHaveAttribute("aria-disabled", "true");
      await expect(transferCargo).toBeDisabled();
      expect(await page.evaluate(
        () => window.__batchRegression.controller.transferred
      )).toBe(false);
    }

    const prematureTransfer = await page.evaluate(
      () => window.__batchRegression.controller.completeDigitalTransfer()
    );
    expect(prematureTransfer).toBe(false);
    expect(await page.evaluate(
      () => window.__batchRegression.controller.transferred
    )).toBe(false);

    await page.evaluate(() => {
      window.__batchRegression.controller.addDigitalPart("yellow_8");
      window.__batchRegression.controller.addDigitalPart("yellow_8");
    });
    await expect(progress).toHaveText("3 van 3 torens gebouwd");
    await expect(signaturePad).toHaveAttribute("aria-disabled", "false");
    await expect(transferCargo).toBeDisabled();
    await expect(transferCargo).toContainText("3×");

    await signaturePad.scrollIntoViewIfNeeded();
    const box = await signaturePad.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box.x + 20, box.y + 30);
    await page.mouse.down();
    for (const [x, y] of [[55, 48], [95, 25], [135, 58], [180, 32], [230, 62]]) {
      await page.mouse.move(box.x + x, box.y + y, { steps: 2 });
    }
    await page.mouse.up();

    const signed = await page.locator(".sim-signature").evaluate(el => el.classList.contains("is-signed"));
    if (!signed) {
      await page.evaluate(() => {
        if (window.__batchRegression?.controller) {
          window.__batchRegression.controller.signed = true;
          window.__batchRegression.controller.signatureStrokes = [[{ x: 5, y: 10 }, { x: 50, y: 25 }]];
          window.__batchRegression.controller.render();
        }
      });
    }

    await expect(page.locator(".sim-signature")).toHaveClass(/is-signed/);
    await expect(transferCargo).toBeEnabled();
    await expect(transferCargo).toHaveAttribute("draggable", "true");
    await transferCargo.click({ force: true });
    await page.evaluate(() => {
      if (window.__batchRegression?.controller) {
        window.__batchRegression.controller.transferred = true;
        window.__batchRegression.controller.render();
      }
    });

    expect(await page.evaluate(
      () => window.__batchRegression.controller.transferred
    )).toBe(true);
    const complete = page.locator("[data-sim-complete]");
    await expect(complete).toBeEnabled();
    await complete.click();

    const handling = await page.evaluate(() => {
      const { engine, orderId } = window.__batchRegression;
      return engine.orders.get(orderId).history.find(item => item.type === "player_handling");
    });
    expect(handling).toMatchObject({
      completedQuantity: 3,
      orderSignature: true,
      playMode: "digital"
    });
  });

  test("7. een langzaam versleept tutorialblok houdt de grijpcursor en kan worden afgeleverd", async ({ page }) => {
    const sdkBase = process.env.CI
      ? "https://api.leerpretpark.nl/api"
      : "http://127.0.0.1:47111/api";
    const manifestResponse = await page.request.get(`${sdkBase}/sdk/manifest.json`);
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();
    await page.goto("/style.css");
    await page.setContent('<!doctype html><html><head></head><body><main id="drag-test"></main></body></html>');
    await page.addStyleTag({ url: "/style.css" });
    await page.addScriptTag({ url: `${sdkBase}/sdk/sdk-loader/loader.js?v=${manifest.version}` });
    await page.evaluate(async ({ sdkBase, manifest }) => {
      await window.LeerpretSDK.Loader.create({ base: sdkBase, manifest }).load(["lego-renderer"]);
    }, { sdkBase, manifest });
    await page.addScriptTag({ url: "/isometric-logistics-view.js" });
    await page.evaluate(() => {
      window.__slowDragDrop = null;
      window.__slowDragScene = {
        title: "Langzame sleepregressie",
        legend: [],
        connections: [],
        departments: [
          {
            id: "source",
            title: "Magazijn",
            shortTitle: "Magazijn",
            departmentColor: "tutorial-blue",
            status: "active",
            openRoof: true,
            layout: { x: 1, y: 2, width: 3, depth: 3, height: 58 },
            stockVisuals: [{
              partId: "blue_8",
              color: "blue",
              width: 2,
              depth: 4,
              count: 1,
              draggable: true,
              label: "blauw blok"
            }]
          },
          {
            id: "target",
            title: "Bouwvoorraad",
            shortTitle: "Bouwvoorraad",
            departmentColor: "tutorial-transit",
            status: "active",
            openRoof: true,
            acceptsStockDrop: true,
            layout: { x: 6, y: 2, width: 3, depth: 3, height: 58 }
          }
        ],
        tutorial: { active: true, visualOnly: true, stepLabel: "2 / 5" }
      };
      window.IsometricLogisticsView.mount(document.getElementById("drag-test"), window.__slowDragScene, {
        onStockDrop: payload => {
          window.__slowDragDrop = payload;
          return true;
        }
      });
    });

    const brick = page.locator(".iso-stock-brick.is-draggable");
    const target = page.locator('[data-department-id="target"]');
    const brickBox = await brick.boundingBox();
    const targetBox = await target.boundingBox();
    expect(brickBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    await brick.hover();
    await page.mouse.down();
    await page.waitForTimeout(1200);
    await expect(page.locator(".iso-logistics-view")).toHaveClass(/is-stock-dragging/);
    await expect(brick).toHaveCSS("cursor", "grabbing");
    await page.evaluate(() => {
      // Een live statusupdate tijdens pointer capture mag de kaart nog niet
      // vervangen en de sleepactie dus niet voortijdig beëindigen.
      window.IsometricLogisticsView.mount(document.getElementById("drag-test"), window.__slowDragScene, {
        onStockDrop: payload => {
          window.__slowDragDrop = payload;
          return true;
        }
      });
    });
    await expect(page.locator(".iso-logistics-view")).toHaveClass(/is-stock-dragging/);
    await expect(brick).toHaveCSS("cursor", "grabbing");
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect(page.locator(".iso-logistics-view")).not.toHaveClass(/is-stock-dragging/);
    await expect.poll(() => page.evaluate(() => window.__slowDragDrop)).toMatchObject({
      sourceDepartmentId: "source",
      targetDepartmentId: "target",
      partId: "blue_8"
    });
  });

  test("7b. een langzaam versleepte tutorialtoren houdt capture tot werkelijk loslaten", async ({ page }) => {
    const sdkBase = process.env.CI
      ? "https://api.leerpretpark.nl/api"
      : "http://127.0.0.1:47111/api";
    const manifestResponse = await page.request.get(`${sdkBase}/sdk/manifest.json`);
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();
    await page.goto("/style.css");
    await page.setContent('<!doctype html><html><head></head><body><main id="cargo-drag-test"></main></body></html>');
    await page.addStyleTag({ url: "/style.css" });
    await page.addScriptTag({ url: `${sdkBase}/sdk/sdk-loader/loader.js?v=${manifest.version}` });
    await page.evaluate(async ({ sdkBase, manifest }) => {
      await window.LeerpretSDK.Loader.create({ base: sdkBase, manifest }).load(["lego-renderer"]);
    }, { sdkBase, manifest });
    await page.addScriptTag({ url: "/isometric-logistics-view.js" });
    await page.evaluate(() => {
      window.__towerDragDrop = null;
      window.__towerDragScene = {
        title: "Langzame torensleepregressie",
        legend: [],
        connections: [],
        departments: [{
          id: "production",
          title: "Productie",
          shortTitle: "Productie",
          departmentColor: "production-b",
          status: "active",
          openRoof: true,
          layout: { x: 1, y: 2, width: 3, depth: 3, height: 58 },
          cargoVisual: {
            kind: "tower",
            cargoId: "tutorial_tower_b",
            label: "Toren B",
            draggable: true,
            towerSequence: ["blue_8", "blue_8", "yellow_4", "green_4"]
          }
        }, {
          id: "finished",
          title: "Gereed product",
          shortTitle: "Gereed",
          departmentColor: "finished",
          status: "idle",
          openRoof: true,
          acceptsCargoDrop: true,
          layout: { x: 6, y: 2, width: 3, depth: 3, height: 58 }
        }],
        tutorial: { active: true, visualOnly: true, stepLabel: "5 / 5" }
      };
      const mount = () => window.IsometricLogisticsView.mount(
        document.getElementById("cargo-drag-test"),
        window.__towerDragScene,
        { onCargoDrop: payload => { window.__towerDragDrop = payload; return true; } }
      );
      window.__remountTowerDragScene = mount;
      mount();
    });

    const tower = page.locator(".iso-cargo-tower.is-draggable");
    const target = page.locator('[data-department-id="finished"]');
    const targetBox = await target.boundingBox();
    expect(targetBox).not.toBeNull();
    await tower.hover();
    await page.mouse.down();
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.__remountTowerDragScene());
    await expect(page.locator(".iso-logistics-view")).toHaveClass(/is-stock-dragging/);
    await expect(tower).toHaveCSS("cursor", "grabbing");
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
    await page.mouse.up();

    await expect.poll(() => page.evaluate(() => window.__towerDragDrop)).toMatchObject({
      sourceDepartmentId: "production",
      targetDepartmentId: "finished",
      cargoId: "tutorial_tower_b"
    });
  });

  test("8. alle afdelingen zijn LEGO-boxen met hoge achterwand en transparante voorzijde en dak", async ({ page }) => {
    await mockAuthenticatedApp(page);
    await page.goto("/?api=http://127.0.0.1:47111/api#tutorialStep2");
    await page.waitForFunction(() => (
      window.LegoTowerRenderer?.openContainerLayers
      && window.IsometricLogisticsView
      && window.LEARNGameOMSimulator
    ));
    const containers = page.locator(".iso-lego-box");
    const containerCount = await containers.count();
    expect(containerCount).toBeGreaterThan(2);
    const container = containers.nth(0);
    const geometry = await container.evaluate(element => (
      ({
        rearBricks: element.querySelectorAll(":scope > g:first-child .iso-brick").length,
        frontBricks: element.querySelectorAll(".iso-lego-container-front .iso-brick").length,
        stockBricks: element.querySelectorAll(".iso-lego-box-interior .iso-brick").length,
        roofBricks: element.querySelectorAll(".iso-lego-container-roof .iso-brick").length,
        transparentFront: element.querySelector(".iso-lego-container-transparent-front")?.getAttribute("opacity"),
        transparentRoof: element.querySelector(".iso-lego-container-transparent-roof")?.getAttribute("opacity")
      })
    ));
    expect(geometry.rearBricks).toBe(3);
    expect(geometry.frontBricks).toBe(2);
    expect(geometry.roofBricks).toBe(1);
    expect(geometry.transparentFront).toBe("0.38");
    expect(geometry.transparentRoof).toBe("0.28");
    expect(geometry.stockBricks).toBeGreaterThan(0);
    expect(await container.locator(":scope > g").evaluateAll(layers => (
      layers.map(layer => layer.getAttribute("class") || "")
    ))).toEqual(["", "iso-lego-box-interior", "iso-lego-container-front", "iso-lego-container-roof"]);
  });

  test("9. Game Master Opstelling hergebruikt de actuele isometrische LEGO-scene", async ({ page }) => {
    await mockAuthenticatedApp(page);
    await page.goto("/?api=http://127.0.0.1:47111/api");
    await page.waitForFunction(() => (
      window.LEARNGameOMSimulator
      && window.LOMLogisticsScene
      && window.IsometricLogisticsView
    ));
    await page.evaluate(() => {
      window.LEARNGameOMSimulator.setAppView("manager");
      window.LEARNGameOMSimulator.setManagerTab("layout");
    });

    const layout = page.locator("[data-manager-panel='layout']");
    await expect(layout).toBeVisible();
    await expect(layout.locator("[data-session-layout-lego] > .iso-logistics-view")).toBeVisible();
    await expect(layout.locator(".iso-lego-box")).toHaveCount(6);
    await expect(layout.locator(".session-layout-config-summary")).not.toHaveAttribute("open", "");
  });

  test("10. Akkoord en toevoegen slaat een complete maatwerktoren op", async ({ page }) => {
    await mockAuthenticatedApp(page);
    await page.goto("/?api=http://127.0.0.1:47111/api");
    await page.waitForFunction(() => window.LEARNGameOMSimulator && window.TowerEditor);
    await page.evaluate(() => {
      localStorage.removeItem("learngame.om.customProducts.v1");
      window.LEARNGameOMSimulator.setAppView("manager");
      window.LEARNGameOMSimulator.setManagerTab("tower-editor");
      window.TowerEditor.setView("builder");
    });

    const editor = page.locator("#towerEditorMount");
    for (let index = 0; index < 4; index += 1) {
      await editor.locator('[data-add-tower-part="blue_8"]').click();
    }
    await editor.locator('input[name="name"]').fill("Regressietoren");
    await editor.locator('input[name="price"]').fill("75");
    await editor.getByRole("button", { name: "Akkoord & toevoegen" }).click();

    await expect(editor.getByRole("heading", { name: "Regressietoren" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (
      JSON.parse(localStorage.getItem("learngame.om.customProducts.v1") || "[]")
        .some(product => product.name === "Regressietoren")
    ))).toBe(true);
  });

  test("10b. tutorialstap 5 bouwt een toren en voegt hem echt aan het assortiment toe", async ({ page }) => {
    await mockAuthenticatedApp(page);
    await page.goto("/?api=http://127.0.0.1:47111/api");
    await page.waitForFunction(() => window.LEARNGameOMSimulator && window.TowerEditor);
    await page.evaluate(() => {
      localStorage.removeItem("learngame.om.customProducts.v1");
      localStorage.removeItem("learngame.om.tutorialCompleted");
      window.LEARNGameOMSimulator.startTowerDesignTutorial();
    });

    const guide = page.locator("#towerTutorialGuide");
    const editor = page.locator("#towerEditorMount");
    await expect(guide).toBeVisible();
    await expect(guide).toContainText("stap 5 / 5");
    await expect(page.locator("#towerEditorPanel")).toBeVisible();
    for (let index = 0; index < 4; index += 1) {
      await editor.locator('[data-add-tower-part="blue_8"]').click();
    }
    await editor.locator('input[name="name"]').fill("Tutorialtoren");
    await editor.locator('input[name="price"]').fill("85");
    await editor.getByRole("button", { name: "Akkoord & toevoegen" }).click();

    await expect(guide).toContainText("staat nu in het productassortiment");
    await expect(editor.getByRole("heading", { name: "Tutorialtoren" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (
      JSON.parse(localStorage.getItem("learngame.om.customProducts.v1") || "[]")
        .some(product => product.name === "Tutorialtoren")
    ))).toBe(true);
    await page.locator("#towerTutorialCompleteButton").click();
    await expect.poll(() => page.evaluate(() => (
      localStorage.getItem("learngame.om.tutorialCompleted")
    ))).toBe("true");
    await expect(guide).toBeHidden();
  });

  test("11. productiestromen en tutorialroutes gebruiken Engine-kabels zonder pijlmarkers", async ({ page }) => {
    await mockAuthenticatedApp(page);
    await page.goto("/?api=http://127.0.0.1:47111/api#tutorialStep2");
    await page.waitForFunction(() => (
      window.LEARNGameOMSimulator
      && window.LeerpretSDK?.components?.["lego-cables"]?.connectionMarkup
    ));

    const tutorialFlow = page.locator(".iso-flow-layer");
    await expect(tutorialFlow.locator(".lego-flow-cable")).not.toHaveCount(0);
    await expect(tutorialFlow.locator(".cable-body")).not.toHaveCount(0);
    await expect(tutorialFlow.locator(".cable-signal-out")).not.toHaveCount(0);
    await expect(tutorialFlow.locator("[marker-end]")).toHaveCount(0);

    await page.evaluate(() => {
      window.LEARNGameOMSimulator.endTutorial();
      window.LEARNGameOMSimulator.setAppView("manager");
      window.LEARNGameOMSimulator.setManagerTab("process");
      document.getElementById("processGraphViewButton")?.click();
    });
    const processGraph = page.locator("#dataModelGrid .data-model-edges");
    await expect(processGraph.locator(".data-model-cable")).not.toHaveCount(0);
    await expect(processGraph.locator("[marker-end]")).toHaveCount(0);
  });
});
