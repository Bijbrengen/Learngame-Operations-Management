const { test, expect } = require("./fixtures");

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
  await page.goto("/");
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

async function dispatchTouchDrag(page, source, target, { cancel = false, onMove } = {}) {
  const pointInside = element => {
    const bounds = element.getBoundingClientRect();
    for (const vertical of [0.25, 0.5, 0.75]) {
      for (const horizontal of [0.25, 0.5, 0.75]) {
        const x = bounds.left + bounds.width * horizontal;
        const y = bounds.top + bounds.height * vertical;
        const hit = document.elementFromPoint(x, y);
        if (hit === element || element.contains(hit)) return { x, y };
      }
    }
    return null;
  };
  const start = await source.evaluate(pointInside);
  expect(start).not.toBeNull();
  const targetPoint = target && typeof target.evaluate === "function"
    ? await target.evaluate(pointInside)
    : target;
  expect(targetPoint).not.toBeNull();
  const end = targetPoint;
  await page.evaluate(() => {
    window.__touchDragPointerProbe?.cleanup?.();
    const probe = { start: null, current: null };
    const recordStart = event => {
      if (event.pointerType !== "touch") return;
      probe.start = { x: event.clientX, y: event.clientY };
      probe.current = { ...probe.start };
    };
    const recordMove = event => {
      if (event.pointerType !== "touch") return;
      probe.current = { x: event.clientX, y: event.clientY };
    };
    probe.cleanup = () => {
      document.removeEventListener("pointerdown", recordStart, true);
      document.removeEventListener("pointermove", recordMove, true);
    };
    document.addEventListener("pointerdown", recordStart, true);
    document.addEventListener("pointermove", recordMove, true);
    window.__touchDragPointerProbe = probe;
  });
  const client = await page.context().newCDPSession(page);
  const point = (x, y) => [{ x, y, radiusX: 4, radiusY: 4, force: 0.7, id: 1 }];
  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: point(start.x, start.y)
    });
    const steps = 6;
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      const current = {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress
      };
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: point(current.x, current.y)
      });
      if (typeof onMove === "function" && step === Math.ceil(steps / 2)) {
        // CDP kan touchmoves tot het volgende animatieframe samenvoegen. Meet pas
        // nadat Chromium zowel het PointerEvent als de SVG-layout heeft verwerkt.
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())));
        const delivered = await page.evaluate(() => ({
          start: window.__touchDragPointerProbe?.start || null,
          current: window.__touchDragPointerProbe?.current || null
        }));
        expect(delivered.start).not.toBeNull();
        expect(delivered.current).not.toBeNull();
        await onMove({
          start: delivered.start,
          end,
          current: delivered.current,
          requested: { start, current }
        });
      }
    }
    await client.send("Input.dispatchTouchEvent", {
      type: cancel ? "touchCancel" : "touchEnd",
      touchPoints: []
    });
  } finally {
    await page.evaluate(() => {
      window.__touchDragPointerProbe?.cleanup?.();
      delete window.__touchDragPointerProbe;
    });
    await client.detach();
  }
}

function expectDragVisualAtPointerDelta(initialBox, movedBox, start, current) {
  expect(movedBox).not.toBeNull();
  const deltaX = current.x - start.x;
  const deltaY = current.y - start.y;
  const movedX = movedBox.x - initialBox.x;
  const movedY = movedBox.y - initialBox.y;
  const diagnostic = JSON.stringify({ initialBox, movedBox, start, current, deltaX, deltaY, movedX, movedY });

  // De sleepvisualisatie moet dezelfde client-delta afleggen als de hand/muis.
  // Alleen een gewijzigde CSS-waarde is onvoldoende: deze bbox-controle vangt
  // ook SVG-transforms op die wel gezet zijn maar niet zichtbaar renderen.
  expect(Math.abs(movedX - deltaX), diagnostic).toBeLessThanOrEqual(5);
  expect(Math.abs(movedY - deltaY), diagnostic).toBeLessThanOrEqual(5);
  expect(Math.abs(movedX), diagnostic).toBeGreaterThan(20);
}

function expectBoundingBoxRestored(restoredBox, initialBox) {
  expect(restoredBox).not.toBeNull();
  expect(Math.abs(restoredBox.x - initialBox.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(restoredBox.y - initialBox.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(restoredBox.width - initialBox.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(restoredBox.height - initialBox.height)).toBeLessThanOrEqual(2);
}

async function mountIsometricCargoDragHarness(page, {
  cargoKind = "tower",
  throwOnDrop = false
} = {}) {
  await page.goto("/");
  await page.waitForFunction(() => window.IsometricLogisticsView);
  await page.evaluate(({ cargoKind, throwOnDrop }) => {
    document.body.className = "";
    document.body.innerHTML = `
      <button id="drag-lock-outside-focus" type="button">Buiten de kaart</button>
      <main id="drag-lock-regression" class="sim-isometric-transfer-map"></main>
    `;
    const cargoVisual = cargoKind === "material_cart"
      ? {
          kind: "material_cart",
          cargoKind: "material_kits",
          cargoId: "DRAG-LOCK-001",
          label: "Materiaalwagen voor Toren C",
          quantity: 2,
          draggable: true,
          parts: [
            { partId: "base_green", color: "green", width: 6, depth: 6, isPlate: true, count: 2 },
            { partId: "white_8", color: "white", width: 4, depth: 2, count: 4 }
          ]
        }
      : {
          kind: "tower",
          cargoKind: "wip_towers",
          cargoId: "DRAG-LOCK-001",
          label: "Toren B",
          quantity: 2,
          draggable: true,
          towerSequence: ["blue_8", "blue_8", "yellow_4", "green_4"]
        };
    const harness = {
      active: false,
      dropAttempts: 0,
      drops: [],
      pointerId: null,
      states: [],
      throwOnDrop,
      throwOnInactiveState: false
    };
    const scene = {
      title: "Drag-lock regressie",
      legend: [],
      connections: [{ from: "source", to: "target", active: true }],
      departments: [{
        id: "source",
        title: "Bronafdeling",
        shortTitle: "Bron",
        departmentColor: cargoKind === "material_cart" ? "warehouse" : "production-b",
        status: "active",
        openRoof: true,
        layout: { x: 1, y: 2, width: 3, depth: 3, height: 58 },
        cargoVisual
      }, {
        id: "target",
        title: "Doelafdeling",
        shortTitle: "Doel",
        departmentColor: "finished",
        status: "idle",
        openRoof: true,
        acceptsCargoDrop: true,
        layout: { x: 6, y: 2, width: 3, depth: 3, height: 58 }
      }]
    };
    window.__dragLockHarness = harness;
    window.IsometricLogisticsView.mount(
      document.getElementById("drag-lock-regression"),
      scene,
      {
        centerDepartments: true,
        onCargoDrop: payload => {
          harness.dropAttempts += 1;
          if (harness.throwOnDrop) throw new Error("drag-lock-onCargoDrop");
          harness.drops.push(payload);
          return true;
        },
        onDragStateChange: active => {
          harness.active = Boolean(active);
          harness.states.push(Boolean(active));
          if (!active && harness.throwOnInactiveState) {
            throw new Error("drag-lock-onDragStateChange-false");
          }
        }
      }
    );
    document.addEventListener("pointerdown", event => {
      if (!event.target?.closest?.("#drag-lock-regression .iso-draggable-object")) return;
      harness.pointerId = event.pointerId;
    }, true);
  }, { cargoKind, throwOnDrop });

  const map = page.locator("#drag-lock-regression");
  const cargo = map.locator(
    cargoKind === "material_cart"
      ? '.iso-cargo-material-cart[data-cargo-id="DRAG-LOCK-001"]'
      : '.iso-cargo-tower[data-cargo-id="DRAG-LOCK-001"]'
  );
  const target = map.locator('[data-department-id="target"][data-accepts-drag-kind="cargo"]');
  await expect(cargo).toBeVisible();
  await expect(target).toBeVisible();
  return {
    cargo,
    map,
    outsideFocus: page.locator("#drag-lock-outside-focus"),
    target
  };
}

async function isometricDragHarnessState(page) {
  return page.evaluate(() => {
    const container = document.getElementById("drag-lock-regression");
    const surface = container?.querySelector(".iso-logistics-view");
    return {
      callbackActive: Boolean(window.__dragLockHarness?.active),
      draggingObjects: container?.querySelectorAll(".iso-draggable-object.is-dragging").length || 0,
      pendingMount: Boolean(container?._isoPendingMount),
      rendererActive: Boolean(container?._isoStockDragActive),
      surfaceDragging: Boolean(surface?.classList.contains("is-stock-dragging"))
    };
  });
}

test.describe("Kritieke regressies: authenticatie, presets en productie", () => {
  test("1. karakteraanmaak gebruikt profielstatus 200 en actuele kwaliteits-API", async ({ page }) => {
    await mockAuthenticatedApp(page, { profileExists: false });

    const profileResponse = page.waitForResponse(response => (
      response.url().includes("/v1/player/behavior-profile")
      && response.status() === 200
    ));
    await page.goto("/");
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

    await page.goto("/");
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

  test("3. LO Game 4 blijft geselecteerd bij fysiek-digitaal-fysiek", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Digitaal configureren vereist een computer of laptop.");
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

  test("4. digitale LO Game 4 voldoet inclusief enabled_roles aan het backendcontract", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Digitaal configureren vereist een computer of laptop.");
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
        await route.fallback();
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

  test("5. LO Game 6 geeft vier kleurlagen vrij en de editor respecteert deelvrijgave", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Beheer en de toreneditor zijn alleen beschikbaar op computer of laptop.");
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

  test("6. order van drie blokkeert overdracht tot batchbouw en getekende orderparaaf", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Digitale gameplay is alleen beschikbaar op computer of laptop.");
    await page.goto("/");
    await page.waitForFunction(() => (
      window.LogisticsGameEngine
      && window.LogisticsGameUI
      && window.IsometricLogisticsView
      && window.LEARNGameOMSimulator?.getSharedGameController?.()?.renderProcessFlow
      && window.LeerpretSDK?.components?.["lego-builder"]?.logic?.planRecipeBuild
    ));
    await page.evaluate(() => {
      const renderProcessFlow = window.LEARNGameOMSimulator.getSharedGameController().renderProcessFlow;
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
        { engine, renderProcessFlow }
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
    const transferMap = page.locator(".sim-isometric-transfer-map");
    const transferCargo = page.locator('.sim-isometric-transfer-map .iso-cargo-tower[data-cargo-id="ORD-001"]');
    const transferDestination = page.locator('.sim-isometric-transfer-map [data-department-id="pd2"][data-accepts-drag-kind="cargo"]');
    await expect(transferMap).toBeVisible();
    await expect(transferMap.locator(".iso-department")).toHaveCount(2);
    const transferSectionBox = await page.locator(".sim-digital-transfer-section").boundingBox();
    const transferMapBox = await transferMap.boundingBox();
    expect(transferSectionBox).not.toBeNull();
    expect(transferMapBox).not.toBeNull();
    expect(transferMapBox.x).toBeGreaterThanOrEqual(transferSectionBox.x - 1);
    expect(transferMapBox.x + transferMapBox.width).toBeLessThanOrEqual(
      transferSectionBox.x + transferSectionBox.width + 1
    );
    await expect(progress).toHaveText("0 van 3 torens gebouwd · bouw toren 1");
    await expect(signaturePad).toHaveAttribute("aria-disabled", "true");
    await expect(transferCargo).toHaveAttribute("tabindex", "-1");
    await expect(transferCargo).not.toHaveClass(/is-draggable/);

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
      await expect(transferCargo).toHaveAttribute("tabindex", "-1");
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
    await expect(transferCargo).toHaveAttribute("tabindex", "-1");

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
    await expect(transferCargo).toHaveClass(/is-draggable/);
    await expect(transferCargo).toHaveAttribute("role", "button");
    await expect(transferCargo).toHaveAttribute("tabindex", "0");
    await expect(transferCargo.locator(".iso-cargo-tower-instance")).toHaveCount(3);

    // Een losse klik mag de batch niet meer afleveren. Voor toetsenbordgebruik
    // pakt de eerste activatie de batch op en Escape zet hem weer terug.
    await transferCargo.focus();
    await page.keyboard.press("Enter");
    await expect(transferCargo).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(
      () => window.__batchRegression.controller.transferred
    )).toBe(false);
    await expect(transferDestination).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(transferCargo).toHaveAttribute("aria-pressed", "false");
    await expect(transferCargo).toBeFocused();

    // De drop zelf is nu de ene authoritative speleractie. Er volgt geen
    // tweede administratieve knop of directe testmanipulatie meer.
    if (testInfo.project.name === "mobile-chromium") {
      await page.locator(".sim-digital-transfer-section").evaluate(element => {
        element.scrollIntoView({ block: "center" });
      });
      await dispatchTouchDrag(page, transferCargo, transferDestination);
    } else {
      const cargoBox = await transferCargo.boundingBox();
      const targetBox = await transferDestination.boundingBox();
      expect(cargoBox).not.toBeNull();
      expect(targetBox).not.toBeNull();
      await page.mouse.move(cargoBox.x + cargoBox.width / 2, cargoBox.y + cargoBox.height / 2);
      await page.mouse.down();
      await expect(page.locator("#batch-regression")).toHaveClass(/is-digital-dragging/);
      await page.evaluate(() => window.__batchRegression.controller.render());
      await expect(transferCargo).toHaveClass(/is-dragging/);
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
      await expect(transferDestination).toHaveClass(/is-drag-over/);
      await page.mouse.up();
    }
    await expect(page.locator("[data-sim-complete]")).toHaveCount(0);
    await expect.poll(() => page.evaluate(
      () => Boolean(window.__batchRegression.engine.playerTask())
    )).toBe(false);

    const handling = await page.evaluate(() => {
      const { engine, orderId } = window.__batchRegression;
      return engine.orders.get(orderId).history.find(item => item.type === "player_handling");
    });
    expect(handling).toMatchObject({
      completedQuantity: 3,
      orderSignature: true,
      playMode: "digital",
      transfer: {
        batchId: "ORD-001",
        orderId: "ORD-001",
        quantity: 3,
        sourceRoleId: "pd1",
        targetRoleId: "pd2",
        atomicTransfer: true
      }
    });

    const transferHistory = await page.evaluate(() => {
      const { engine, orderId } = window.__batchRegression;
      const runtime = engine.roleRuntime.pd1;
      engine.updateRole("pd1", Number(runtime.transfersAt || Date.now()));
      return engine.orders.get(orderId).history.filter(item => item.type === "transferred");
    });
    expect(transferHistory).toHaveLength(1);
    expect(transferHistory[0]).toMatchObject({
      orderId: "ORD-001",
      quantity: 3,
      sourceRoleId: "pd1",
      targetRoleId: "pd2",
      atomicTransfer: true
    });
  });

  test("6b. bestelformulieren voor complete orders werken met toetsenbord en touch", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Digitale gameplay is alleen beschikbaar op computer of laptop.");
    await page.goto("/");
    await page.waitForFunction(() => (
      window.LogisticsGameEngine
      && window.LogisticsGameUI
      && window.IsometricLogisticsView
      && window.LEARNGameOMSimulator?.getSharedGameController?.()?.renderProcessFlow
    ));
    await page.evaluate(() => {
      const renderProcessFlow = window.LEARNGameOMSimulator.getSharedGameController().renderProcessFlow;
      document.body.className = "";
      document.body.innerHTML = `
        <main class="batch-input-regression">
          <section id="keyboard-batch"></section>
          <section id="touch-batch"></section>
        </main>
      `;
      const createHarness = (mountId, quantity) => {
        const submissions = [];
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
        const controller = window.LogisticsGameUI.mount(document.getElementById(mountId), {
          engine,
          renderProcessFlow,
          actionSubmitter: async (payload, telemetry) => {
            submissions.push({ payload, telemetry });
            return { ok: true, queued: true, message: "Overdracht ontvangen." };
          }
        });
        controller.start({ humanRoleId: "operations", playMode: "digital" });
        const created = engine.generateOrder();
        const order = engine.orders.get(created.id);
        order.quantity = quantity;
        Object.values(engine.roleRuntime).forEach(runtime => {
          runtime.queue = runtime.queue.filter(orderId => orderId !== order.id);
        });
        engine.beginRoleWork("operations", order.id, Date.now());
        controller.signatureStrokes = [[
          { x: 5, y: 8 }, { x: 24, y: 22 }, { x: 42, y: 9 }, { x: 64, y: 25 }, { x: 85, y: 12 }
        ]];
        controller.signed = true;
        controller.render();
        return { engine, controller, submissions, orderId: order.id };
      };
      window.__batchInputs = {
        keyboard: createHarness("keyboard-batch", 1),
        touch: createHarness("touch-batch", 2)
      };
    });

    const keyboard = page.locator("#keyboard-batch");
    const keyboardCargo = keyboard.locator('.iso-cargo-order-document[data-cargo-id="ORD-001"]');
    const keyboardDestination = keyboard.locator('[data-department-id="srm"][data-accepts-drag-kind="cargo"]');
    await expect(keyboardCargo).toHaveCount(1);
    await expect(keyboardCargo).toHaveAttribute("data-cargo-kind", "order_information");
    await expect(keyboardCargo).toHaveAttribute("data-cargo-quantity", "1");
    const keyboardDocument = keyboardCargo.locator(
      '[data-lego-order-document][data-blok-id="logistics.order-document"]'
    );
    await expect(keyboardDocument).toHaveCount(1);
    await expect(keyboardDocument).toHaveAttribute("data-order-document-quantity", "1");
    await expect(keyboard.locator(".iso-cargo-tower,.iso-cargo-tower-instance")).toHaveCount(0);
    await keyboardCargo.focus();
    await page.keyboard.press("Enter");
    await expect(keyboardDestination).toBeFocused();
    expect(await page.evaluate(() => window.__batchInputs.keyboard.submissions.length)).toBe(0);
    const keyboardWrongDepartment = keyboard.locator('[data-department-id="operations"]');
    await keyboardWrongDepartment.focus();
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => window.__batchInputs.keyboard.submissions.length)).toBe(0);
    await expect(keyboardCargo).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(keyboardCargo).toHaveAttribute("aria-pressed", "false");
    await expect(keyboardCargo).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(keyboardDestination).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(keyboard.locator("[data-sim-transfer-pending]")).toBeVisible();
    await expect(keyboard.locator("[data-sim-transfer-pending]")).toBeFocused();

    const keyboardSubmission = await page.evaluate(() => window.__batchInputs.keyboard.submissions[0]);
    expect(keyboardSubmission.payload.transfer).toMatchObject({
      quantity: 1,
      sourceRoleId: "operations",
      targetRoleId: "srm",
      cargoKind: "order_information",
      atomicTransfer: true
    });
    expect(keyboardSubmission.payload.completedQuantity).toBe(1);

    // Keep the complete touch transfer in one viewport. The first, already
    // verified harness otherwise pushes the source above the viewport while
    // Playwright scrolls the destination into view.
    await keyboard.evaluate(element => element.remove());
    const touch = page.locator("#touch-batch");
    const touchCargo = touch.locator('.iso-cargo-order-document[data-cargo-id="ORD-001"]');
    const touchDestination = touch.locator('[data-department-id="srm"][data-accepts-drag-kind="cargo"]');
    await expect(touchCargo).toHaveCount(1);
    await expect(touchCargo).toHaveAttribute("data-cargo-kind", "order_information");
    await expect(touchCargo).toHaveAttribute("data-cargo-quantity", "2");
    const touchDocument = touchCargo.locator(
      '[data-lego-order-document][data-blok-id="logistics.order-document"]'
    );
    await expect(touchDocument).toHaveCount(1);
    await expect(touchDocument).toHaveAttribute("data-order-document-quantity", "2");
    await expect(touch.locator(".iso-cargo-tower,.iso-cargo-tower-instance")).toHaveCount(0);
    await touch.scrollIntoViewIfNeeded();
    await touchDestination.scrollIntoViewIfNeeded();
    await dispatchTouchDrag(page, touchCargo, touchDestination, { cancel: true });
    expect(await page.evaluate(() => window.__batchInputs.touch.submissions.length)).toBe(0);
    expect(await page.evaluate(() => window.__batchInputs.touch.controller.transferred)).toBe(false);

    await dispatchTouchDrag(page, touchCargo, { x: 2, y: 2 });
    expect(await page.evaluate(() => window.__batchInputs.touch.submissions.length)).toBe(0);
    expect(await page.evaluate(() => window.__batchInputs.touch.controller.transferred)).toBe(false);

    const wrongDepartment = touch.locator('[data-department-id="operations"]');
    await dispatchTouchDrag(page, touchCargo, wrongDepartment);
    expect(await page.evaluate(() => window.__batchInputs.touch.submissions.length)).toBe(0);
    expect(await page.evaluate(() => window.__batchInputs.touch.controller.transferred)).toBe(false);

    await dispatchTouchDrag(page, touchCargo, touchDestination);
    const touchState = await page.evaluate(() => ({
      submissions: window.__batchInputs.touch.submissions,
      transferred: window.__batchInputs.touch.controller.transferred,
      activeDigitalDrag: window.__batchInputs.touch.controller.activeDigitalDrag,
      activeTransferPointer: Boolean(window.__batchInputs.touch.controller.activeTransferPointer),
      feedback: window.__batchInputs.touch.controller.feedback
    }));
    expect(touchState.submissions, JSON.stringify(touchState)).toHaveLength(1);
    expect(touchState).toMatchObject({
      transferred: true,
      activeDigitalDrag: false,
      activeTransferPointer: false
    });
    await expect(touch.locator("[data-sim-transfer-pending]")).toBeVisible();
    const touchSubmissions = touchState.submissions;
    expect(touchSubmissions).toHaveLength(1);
    expect(touchSubmissions[0].payload.transfer).toMatchObject({
      quantity: 2,
      sourceRoleId: "operations",
      targetRoleId: "srm",
      cargoKind: "order_information",
      atomicTransfer: true
    });
  });

  test("6c. Magazijn Grondstoffen verplaatst de materiaalwagen met toetsenbord, pointer en touch", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Digitale gameplay is alleen beschikbaar op computer of laptop.");
    await page.goto("/");
    await page.waitForFunction(() => window.IsometricLogisticsView);
    await page.evaluate(() => {
      document.body.className = "";
      document.body.innerHTML = '<main id="material-cart-regression" class="sim-isometric-transfer-map"></main>';
      window.__materialCartDrops = [];
      window.IsometricLogisticsView.mount(
        document.getElementById("material-cart-regression"),
        {
          title: "Materiaalwagen naar Productie A",
          legend: [],
          connections: [{ from: "srm", to: "pd1", active: true }],
          departments: [{
            id: "srm",
            title: "Magazijn Grondstoffen",
            shortTitle: "Grondstoffen",
            departmentColor: "warehouse",
            status: "active",
            openRoof: true,
            layout: { x: 1, y: 2, width: 3, depth: 3, height: 58 },
            cargoVisual: {
              kind: "material_cart",
              cargoKind: "material_kits",
              cargoId: "ORD-MAT-001",
              label: "Materiaalwagen voor 2× Toren C",
              quantity: 2,
              draggable: true,
              parts: [
                { partId: "base_green", color: "green", width: 6, depth: 6, isPlate: true, count: 2 },
                { partId: "white_8", color: "white", width: 4, depth: 2, count: 4 },
                { partId: "blue_4", color: "blue", width: 2, depth: 2, count: 2 },
                { partId: "red_4", color: "red", width: 2, depth: 2, count: 2 }
              ]
            }
          }, {
            id: "pd1",
            title: "Productie A",
            shortTitle: "Productie A",
            departmentColor: "production-a",
            status: "idle",
            openRoof: true,
            acceptsCargoDrop: true,
            dropAriaLabel: "Zet de materiaalwagen neer bij Productie A",
            layout: { x: 6, y: 2, width: 3, depth: 3, height: 58 }
          }]
        },
        {
          onCargoDrop: payload => {
            window.__materialCartDrops.push(payload);
            return true;
          }
        }
      );
    });

    const map = page.locator("#material-cart-regression");
    const cart = map.locator('.iso-cargo-material-cart[data-cargo-id="ORD-MAT-001"]');
    const target = map.locator('[data-department-id="pd1"][data-accepts-drag-kind="cargo"]');
    await expect(cart).toBeVisible();
    await expect(cart).toHaveClass(/iso-cargo-object/);
    await expect(cart).toHaveClass(/is-draggable/);
    await expect(cart).toHaveAttribute("data-cargo-kind", "material_kits");
    await expect(cart).toHaveAttribute("data-cargo-source-id", "srm");
    await expect(cart).toHaveAttribute("data-cargo-quantity", "2");
    await expect(cart).toHaveAttribute("data-material-part-count", "10");
    await expect(cart).toHaveAttribute("role", "button");
    await expect(cart).toHaveAttribute("tabindex", "0");
    await expect(cart).toHaveAttribute("aria-label", /materiaalwagen met 10 losse LEGO-onderdelen/i);
    await expect(map.locator(".iso-cargo-tower,.iso-cargo-tower-instance")).toHaveCount(0);
    const engineCart = cart.locator("[data-lego-material-cart]");
    await expect(engineCart).toHaveCount(1);
    await expect(engineCart).toHaveAttribute("data-material-part-count", "10");
    await expect(engineCart.locator("[data-material-cart-part]")).toHaveCount(8);
    await expect(engineCart.locator("[data-material-cart-part]:not([data-part-id])")).toHaveCount(0);
    await expect(engineCart.locator("[data-material-cart-overflow]")).toContainText("+2");

    if (testInfo.project.name === "mobile-chromium") {
      const touchSourceBox = await cart.boundingBox();
      expect(touchSourceBox).not.toBeNull();
      let touchMovedBox = null;
      let touchMotion = null;
      await dispatchTouchDrag(page, cart, target, {
        cancel: true,
        onMove: async motion => {
          touchMotion = motion;
          await expect(cart).toHaveClass(/is-dragging/);
          touchMovedBox = await cart.boundingBox();
        }
      });
      expect(touchMotion).not.toBeNull();
      expectDragVisualAtPointerDelta(
        touchSourceBox,
        touchMovedBox,
        touchMotion.start,
        touchMotion.current
      );
      await expect(cart).not.toHaveClass(/is-dragging|is-rejected/);
      expectBoundingBoxRestored(await cart.boundingBox(), touchSourceBox);
      await expect(
        map.locator('[data-department-id="srm"] .iso-cargo-material-cart[data-cargo-id="ORD-MAT-001"]')
      ).toHaveCount(1);
      expect(await page.evaluate(() => window.__materialCartDrops.length)).toBe(0);

      await dispatchTouchDrag(page, cart, { x: 2, y: 2 });
      expect(await page.evaluate(() => window.__materialCartDrops.length)).toBe(0);

      await dispatchTouchDrag(page, cart, target);
    } else {
      await cart.focus();
      await page.keyboard.press("Enter");
      await expect(cart).toHaveAttribute("aria-pressed", "true");
      await expect(target).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(cart).toHaveAttribute("aria-pressed", "false");
      await expect(cart).toBeFocused();
      expect(await page.evaluate(() => window.__materialCartDrops.length)).toBe(0);

      await page.keyboard.press("Enter");
      await expect(cart).toHaveAttribute("aria-pressed", "true");
      await expect(target).toBeFocused();
      await page.keyboard.press("Enter");
      await expect.poll(() => page.evaluate(() => window.__materialCartDrops.length)).toBe(1);
      expect(await page.evaluate(() => window.__materialCartDrops[0])).toMatchObject({
        sourceDepartmentId: "srm",
        targetDepartmentId: "pd1",
        cargoId: "ORD-MAT-001",
        quantity: 2,
        inputMethod: "keyboard"
      });
      await expect(cart).toHaveAttribute("aria-pressed", "false");
      await page.evaluate(() => { window.__materialCartDrops = []; });

      const cartBox = await cart.boundingBox();
      const targetBox = await target.boundingBox();
      expect(cartBox).not.toBeNull();
      expect(targetBox).not.toBeNull();
      const pointerStart = {
        x: cartBox.x + cartBox.width / 2,
        y: cartBox.y + cartBox.height / 2
      };
      const pointerEnd = {
        x: targetBox.x + targetBox.width / 2,
        y: targetBox.y + targetBox.height / 2
      };
      const pointerMidpoint = {
        x: pointerStart.x + (pointerEnd.x - pointerStart.x) * 0.5,
        y: pointerStart.y + (pointerEnd.y - pointerStart.y) * 0.5
      };
      await page.evaluate(() => {
        window.__materialCartPointerId = null;
        document.querySelector("#material-cart-regression .iso-logistics-view")?.addEventListener(
          "pointerdown",
          event => { window.__materialCartPointerId = event.pointerId; },
          { capture: true, once: true }
        );
      });
      await page.mouse.move(pointerStart.x, pointerStart.y);
      await page.mouse.down();
      await page.mouse.move(pointerMidpoint.x, pointerMidpoint.y, { steps: 6 });
      await expect(cart).toHaveClass(/is-dragging/);
      expectDragVisualAtPointerDelta(
        cartBox,
        await cart.boundingBox(),
        pointerStart,
        pointerMidpoint
      );
      const pointerId = await page.evaluate(() => window.__materialCartPointerId);
      expect(pointerId).not.toBeNull();
      await page.evaluate(({ pointerId, pointerMidpoint }) => {
        document.querySelector("#material-cart-regression .iso-logistics-view")?.dispatchEvent(
          new PointerEvent("pointercancel", {
            bubbles: true,
            cancelable: false,
            pointerId,
            pointerType: "mouse",
            clientX: pointerMidpoint.x,
            clientY: pointerMidpoint.y
          })
        );
      }, { pointerId, pointerMidpoint });
      await page.mouse.up();
      await expect(cart).not.toHaveClass(/is-dragging|is-rejected/);
      expectBoundingBoxRestored(await cart.boundingBox(), cartBox);
      await expect(
        map.locator('[data-department-id="srm"] .iso-cargo-material-cart[data-cargo-id="ORD-MAT-001"]')
      ).toHaveCount(1);
      expect(await page.evaluate(() => window.__materialCartDrops.length)).toBe(0);

      await page.mouse.move(pointerStart.x, pointerStart.y);
      await page.mouse.down();
      await page.mouse.move(pointerEnd.x, pointerEnd.y, { steps: 10 });
      await expect(target).toHaveClass(/is-drag-over/);
      await page.mouse.up();
    }

    await expect.poll(() => page.evaluate(() => window.__materialCartDrops.length)).toBe(1);
    expect(await page.evaluate(() => window.__materialCartDrops[0])).toMatchObject({
      sourceDepartmentId: "srm",
      targetDepartmentId: "pd1",
      cargoId: "ORD-MAT-001",
      quantity: 2,
      inputMethod: "pointer"
    });
  });

  test("6d. een afgewezen of geannuleerde cargo-drag kan onmiddellijk opnieuw worden opgepakt", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Digitale gameplay is alleen beschikbaar op computer of laptop.");
    const { cargo, target } = await mountIsometricCargoDragHarness(page, { cargoKind: "tower" });
    const initialBox = await cargo.boundingBox();
    const targetBox = await target.boundingBox();
    expect(initialBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    const start = {
      x: initialBox.x + initialBox.width / 2,
      y: initialBox.y + initialBox.height / 2
    };
    const invalid = { x: start.x + 34, y: start.y + 14 };
    const retry = { x: start.x + 120, y: start.y + 40 };

    // Forceer eerst de afwijsanimatie. De directe tweede drag mag niet door
    // dezelfde CSS-translate worden overschreven.
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(invalid.x, invalid.y, { steps: 2 });
    await page.mouse.up();
    expect(await cargo.evaluate(element => element.classList.contains("is-rejected"))).toBe(true);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(retry.x, retry.y, { steps: 2 });
    expect(await cargo.evaluate(element => element.classList.contains("is-dragging"))).toBe(true);
    expectDragVisualAtPointerDelta(initialBox, await cargo.boundingBox(), start, retry);

    const pointerId = await page.evaluate(() => window.__dragLockHarness.pointerId);
    await page.evaluate(({ pointerId, retry }) => {
      document.querySelector("#drag-lock-regression .iso-logistics-view")?.dispatchEvent(
        new PointerEvent("pointercancel", {
          bubbles: true,
          cancelable: false,
          pointerId,
          pointerType: "mouse",
          clientX: retry.x,
          clientY: retry.y
        })
      );
    }, { pointerId, retry });
    await page.mouse.up();
    expect(await isometricDragHarnessState(page)).toEqual({
      callbackActive: false,
      draggingObjects: 0,
      pendingMount: false,
      rendererActive: false,
      surfaceDragging: false
    });

    // Ook direct na pointercancel moet de eerstvolgende poging zelf starten en
    // de cargo kunnen afleveren; er mag geen extra "ontgrendelklik" nodig zijn.
    const restoredBox = await cargo.boundingBox();
    expectBoundingBoxRestored(restoredBox, initialBox);
    const restoredStart = {
      x: restoredBox.x + restoredBox.width / 2,
      y: restoredBox.y + restoredBox.height / 2
    };
    const targetPoint = {
      x: targetBox.x + targetBox.width / 2,
      y: targetBox.y + targetBox.height / 2
    };
    await page.mouse.move(restoredStart.x, restoredStart.y);
    await page.mouse.down();
    await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 8 });
    expect(await cargo.evaluate(element => element.classList.contains("is-dragging"))).toBe(true);
    await page.mouse.up();
    expect(await page.evaluate(() => window.__dragLockHarness.dropAttempts)).toBe(1);
    expect(await isometricDragHarnessState(page)).toEqual({
      callbackActive: false,
      draggingObjects: 0,
      pendingMount: false,
      rendererActive: false,
      surfaceDragging: false
    });
  });

  test("6e. keyboard-cargo ruimt op na focus buiten de kaart en slikt de eerste pointerdrag niet in", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Digitale gameplay is alleen beschikbaar op computer of laptop.");
    const { cargo, outsideFocus, target } = await mountIsometricCargoDragHarness(page, {
      cargoKind: "material_cart"
    });
    await cargo.focus();
    await page.keyboard.press("Enter");
    await expect(cargo).toHaveAttribute("aria-pressed", "true");
    await expect(target).toBeFocused();

    await outsideFocus.focus();
    await page.keyboard.press("Escape");
    await expect.poll(() => isometricDragHarnessState(page)).toEqual({
      callbackActive: false,
      draggingObjects: 0,
      pendingMount: false,
      rendererActive: false,
      surfaceDragging: false
    });
    await expect(cargo).toHaveAttribute("aria-pressed", "false");

    const initialBox = await cargo.boundingBox();
    expect(initialBox).not.toBeNull();
    const start = {
      x: initialBox.x + initialBox.width / 2,
      y: initialBox.y + initialBox.height / 2
    };
    const current = { x: start.x + 100, y: start.y + 32 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(current.x, current.y, { steps: 2 });
    expect(await cargo.evaluate(element => element.classList.contains("is-dragging"))).toBe(true);
    expectDragVisualAtPointerDelta(initialBox, await cargo.boundingBox(), start, current);
    await page.mouse.up();
  });

  test("6f. pointerup buiten de kaart ruimt een drag zonder pointer-capture volledig op", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Digitale gameplay is alleen beschikbaar op computer of laptop.");
    const { cargo } = await mountIsometricCargoDragHarness(page, { cargoKind: "tower" });
    const initialBox = await cargo.boundingBox();
    expect(initialBox).not.toBeNull();
    const start = {
      x: initialBox.x + initialBox.width / 2,
      y: initialBox.y + initialBox.height / 2
    };
    const current = { x: start.x + 110, y: start.y + 36 };

    await page.evaluate(({ start, current }) => {
      const source = document.querySelector("#drag-lock-regression .iso-cargo-tower");
      const surface = document.querySelector("#drag-lock-regression .iso-logistics-view");
      Object.defineProperty(surface, "setPointerCapture", {
        configurable: true,
        value() {
          throw new DOMException("synthetische capture-failure", "NotFoundError");
        }
      });
      const pointer = {
        bubbles: true,
        cancelable: true,
        pointerId: 901,
        pointerType: "touch",
        button: 0,
        buttons: 1,
        clientX: start.x,
        clientY: start.y
      };
      source.dispatchEvent(new PointerEvent("pointerdown", pointer));
      surface.dispatchEvent(new PointerEvent("pointermove", {
        ...pointer,
        clientX: current.x,
        clientY: current.y
      }));
      document.dispatchEvent(new PointerEvent("pointerup", {
        ...pointer,
        buttons: 0,
        clientX: current.x,
        clientY: current.y
      }));
    }, { start, current });

    await expect.poll(() => isometricDragHarnessState(page)).toEqual({
      callbackActive: false,
      draggingObjects: 0,
      pendingMount: false,
      rendererActive: false,
      surfaceDragging: false
    });
    expectBoundingBoxRestored(await cargo.boundingBox(), initialBox);

    const restoredBox = await cargo.boundingBox();
    const retryStart = {
      x: restoredBox.x + restoredBox.width / 2,
      y: restoredBox.y + restoredBox.height / 2
    };
    const retryCurrent = { x: retryStart.x + 100, y: retryStart.y + 30 };
    await page.mouse.move(retryStart.x, retryStart.y);
    await page.mouse.down();
    await page.mouse.move(retryCurrent.x, retryCurrent.y, { steps: 2 });
    expect(await cargo.evaluate(element => element.classList.contains("is-dragging"))).toBe(true);
    expectDragVisualAtPointerDelta(restoredBox, await cargo.boundingBox(), retryStart, retryCurrent);
    await page.mouse.up();
  });

  test("6g. een fout in onCargoDrop laat geen renderer- of UI-draglock achter", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Digitale gameplay is alleen beschikbaar op computer of laptop.");
    const dragCallbackErrors = [];
    page.on("pageerror", error => {
      if (error.message.includes("drag-lock-")) dragCallbackErrors.push(error.message);
    });
    const { cargo, target } = await mountIsometricCargoDragHarness(page, {
      cargoKind: "material_cart",
      throwOnDrop: true
    });
    await page.evaluate(() => {
      window.__dragLockHarness.throwOnInactiveState = true;
    });
    const initialBox = await cargo.boundingBox();
    const targetBox = await target.boundingBox();
    expect(initialBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    const start = {
      x: initialBox.x + initialBox.width / 2,
      y: initialBox.y + initialBox.height / 2
    };
    const targetPoint = {
      x: targetBox.x + targetBox.width / 2,
      y: targetBox.y + targetBox.height / 2
    };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 8 });
    await page.mouse.up();

    await expect.poll(() => page.evaluate(() => window.__dragLockHarness.dropAttempts)).toBe(1);
    await expect.poll(() => isometricDragHarnessState(page)).toEqual({
      callbackActive: false,
      draggingObjects: 0,
      pendingMount: false,
      rendererActive: false,
      surfaceDragging: false
    });
    expect(dragCallbackErrors).toEqual([]);
    expectBoundingBoxRestored(await cargo.boundingBox(), initialBox);

    // Dezelfde callbackfout via het toetsenbord moet ook altijd de
    // keyboard-drag afronden. Daarna moet de bron direct opnieuw selecteerbaar
    // zijn, zonder eerst een pointerklik als ontgrendeling nodig te hebben.
    await cargo.focus();
    await page.keyboard.press("Enter");
    await expect(cargo).toHaveAttribute("aria-pressed", "true");
    await expect(target).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => page.evaluate(() => window.__dragLockHarness.dropAttempts)).toBe(2);
    await expect.poll(() => isometricDragHarnessState(page)).toEqual({
      callbackActive: false,
      draggingObjects: 0,
      pendingMount: false,
      rendererActive: false,
      surfaceDragging: false
    });
    await expect(cargo).toHaveAttribute("aria-pressed", "false");

    await cargo.focus();
    await page.keyboard.press("Enter");
    await expect(cargo).toHaveAttribute("aria-pressed", "true");
    await expect(target).toBeFocused();
    await page.keyboard.press("Escape");
    await expect.poll(() => isometricDragHarnessState(page)).toEqual({
      callbackActive: false,
      draggingObjects: 0,
      pendingMount: false,
      rendererActive: false,
      surfaceDragging: false
    });
    await expect(cargo).toHaveAttribute("aria-pressed", "false");

    // Na beide callbackfouten moet ook direct opnieuw een pointerdrag kunnen
    // starten.
    const restoredBox = await cargo.boundingBox();
    const retryStart = {
      x: restoredBox.x + restoredBox.width / 2,
      y: restoredBox.y + restoredBox.height / 2
    };
    const retryCurrent = { x: retryStart.x + 100, y: retryStart.y + 30 };
    await page.mouse.move(retryStart.x, retryStart.y);
    await page.mouse.down();
    await page.mouse.move(retryCurrent.x, retryCurrent.y, { steps: 2 });
    expect(await cargo.evaluate(element => element.classList.contains("is-dragging"))).toBe(true);
    expectDragVisualAtPointerDelta(restoredBox, await cargo.boundingBox(), retryStart, retryCurrent);
    await page.mouse.up();
    expect(dragCallbackErrors).toEqual([]);
  });

  test("6h. stop en destroy ruimen een actieve isometrische drag direct op", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Digitale gameplay is alleen beschikbaar op computer of laptop.");
    await page.goto("/");
    await page.waitForFunction(() => (
      window.LogisticsGameEngine
      && window.LogisticsGameUI
      && window.IsometricLogisticsView
      && window.LEARNGameOMSimulator?.getSharedGameController?.()?.renderProcessFlow
    ));
    await page.evaluate(() => {
      const renderProcessFlow = window.LEARNGameOMSimulator.getSharedGameController().renderProcessFlow;
      document.body.className = "";
      document.body.innerHTML = `
        <main>
          <section id="stop-drag-controller"></section>
          <section id="destroy-drag-controller"></section>
        </main>
      `;
      const createHarness = mountId => {
        const engine = new window.LogisticsGameEngine.LogisticsGameEngine({
          random: () => 0,
          config: {
            initialOrderDelayMs: 999999999,
            orderIntervalMinMs: 999999999,
            orderIntervalMaxMs: 999999999,
            incidentChance: 0
          }
        });
        const mount = document.getElementById(mountId);
        const controller = window.LogisticsGameUI.mount(mount, { engine, renderProcessFlow });
        controller.start({ humanRoleId: "operations", playMode: "digital" });
        const order = engine.orders.get(engine.generateOrder().id);
        Object.values(engine.roleRuntime).forEach(runtime => {
          runtime.queue = runtime.queue.filter(orderId => orderId !== order.id);
        });
        engine.beginRoleWork("operations", order.id, Date.now());
        controller.signatureStrokes = [[{ x: 1, y: 1 }, { x: 30, y: 20 }]];
        controller.signed = true;
        controller.render();
        return {
          controller,
          mount,
          transferContainer: mount.querySelector("[data-sim-isometric-transfer]")
        };
      };
      window.__dragLifecycleControllers = {
        stop: createHarness("stop-drag-controller"),
        destroy: createHarness("destroy-drag-controller")
      };
    });

    for (const action of ["stop", "destroy"]) {
      const mount = page.locator(`#${action}-drag-controller`);
      const cargo = mount.locator('[data-drag-kind="cargo"].is-draggable');
      await expect(cargo).toBeVisible();
      await cargo.scrollIntoViewIfNeeded();
      const box = await cargo.boundingBox();
      expect(box).not.toBeNull();
      const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const assertActive = async () => {
        await expect(cargo).toHaveClass(/is-dragging/);
        expect(await page.evaluate(key => {
          const harness = window.__dragLifecycleControllers[key];
          return {
            controllerActive: harness.controller.activeDigitalDrag,
            rendererActive: harness.transferContainer._isoStockDragActive
          };
        }, action)).toEqual({ controllerActive: true, rendererActive: true });
      };
      const finishLifecycle = () => page.evaluate(key => {
        const harness = window.__dragLifecycleControllers[key];
        harness.controller[key]();
      }, action);
      if (testInfo.project.name === "mobile-chromium") {
        await dispatchTouchDrag(page, cargo, { x: start.x + 90, y: start.y + 30 }, {
          onMove: async () => {
            await assertActive();
            await finishLifecycle();
          }
        });
      } else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x + 90, start.y + 30, { steps: 3 });
        await assertActive();
        await finishLifecycle();
        await page.mouse.up();
      }

      expect(await page.evaluate(key => {
        const harness = window.__dragLifecycleControllers[key];
        return {
          controllerActive: harness.controller.activeDigitalDrag,
          draggingObjects: harness.transferContainer.querySelectorAll(".is-dragging").length,
          mountChildren: harness.mount.childElementCount,
          pendingRender: harness.controller.pendingDigitalDragRender,
          rendererActive: harness.transferContainer._isoStockDragActive
        };
      }, action)).toEqual({
        controllerActive: false,
        draggingObjects: 0,
        mountChildren: 0,
        pendingRender: false,
        rendererActive: false
      });
    }
  });

  test("7. een langzaam versleept tutorialblok houdt de grijpcursor en kan worden afgeleverd", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "De bouwtutorial is alleen beschikbaar op computer of laptop.");
    const sdkBase = process.env.LEERPRET_API_URL
      || (process.env.CI ? "https://api.leerpretpark.nl/api" : "http://127.0.0.1:47111/api");
    const manifestResponse = await page.request.get(`${sdkBase}/sdk/manifest.json`);
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();
    await page.goto("/style.css");
    await page.setContent('<!doctype html><html><head></head><body><main id="drag-test"></main></body></html>');
    await page.addStyleTag({ url: "/style.css" });
    await page.addScriptTag({ url: `${sdkBase}/sdk/sdk-loader/loader.js?v=${manifest.version}` });
    await page.evaluate(async ({ sdkBase, manifest }) => {
      await window.LeerpretSDK.Loader.create({ base: sdkBase, manifest }).load(["lego-renderer", "lego-builder"]);
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
    await expect(page.locator(".iso-overlay-layer > .iso-stock-brick.is-dragging")).toHaveCount(1);
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
    await expect(page.locator(".iso-overlay-layer > .iso-stock-brick.is-dragging")).toHaveCount(1);
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect(page.locator(".iso-logistics-view")).not.toHaveClass(/is-stock-dragging/);
    await expect.poll(() => page.evaluate(() => window.__slowDragDrop)).toMatchObject({
      sourceDepartmentId: "source",
      targetDepartmentId: "target",
      partId: "blue_8"
    });
  });

  test("7b. een langzaam versleepte tutorialtoren houdt capture tot werkelijk loslaten", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "De bouwtutorial is alleen beschikbaar op computer of laptop.");
    const sdkBase = process.env.LEERPRET_API_URL
      || (process.env.CI ? "https://api.leerpretpark.nl/api" : "http://127.0.0.1:47111/api");
    const manifestResponse = await page.request.get(`${sdkBase}/sdk/manifest.json`);
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();
    await page.goto("/style.css");
    await page.setContent('<!doctype html><html><head></head><body><main id="cargo-drag-test"></main></body></html>');
    await page.addStyleTag({ url: "/style.css" });
    await page.addScriptTag({ url: `${sdkBase}/sdk/sdk-loader/loader.js?v=${manifest.version}` });
    await page.evaluate(async ({ sdkBase, manifest }) => {
      await window.LeerpretSDK.Loader.create({ base: sdkBase, manifest }).load(["lego-renderer", "lego-builder"]);
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
            quantity: 2,
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
    await expect(tower.locator(".iso-cargo-tower-instance")).toHaveCount(2);
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

  test("8. alle afdelingen zijn LEGO-boxen met hoge achterwand en transparante voorzijde en dak", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "De bouwtutorial is alleen beschikbaar op computer of laptop.");
    await mockAuthenticatedApp(page);
    await page.goto("/#tutorialStep2");
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
        stockPlacements: Array.from(element.querySelectorAll(".iso-stock-brick")).map(brick => ({
          x: Number(brick.dataset.stockGridX),
          y: Number(brick.dataset.stockGridY),
          layer: Number(brick.dataset.stockGridLayer),
          z: Number(brick.dataset.stockZ),
          transform: brick.getAttribute("transform")
        })),
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
    expect(geometry.stockPlacements.length).toBeGreaterThan(0);
    geometry.stockPlacements.forEach(placement => {
      expect(Number.isInteger(placement.x)).toBe(true);
      expect(Number.isInteger(placement.y)).toBe(true);
      expect(Number.isInteger(placement.layer)).toBe(true);
      expect(placement.z).toBeCloseTo(0.22 + placement.layer * 0.72, 8);
      expect(placement.transform).toMatch(/^translate\(/);
      expect(placement.transform).not.toContain("scale(");
    });
    expect(await container.locator(":scope > g").evaluateAll(layers => (
      layers.map(layer => layer.getAttribute("class") || "")
    ))).toEqual(["", "iso-lego-box-interior", "iso-lego-container-front", "iso-lego-container-roof"]);
  });

  test("9. Game Master Opstelling hergebruikt de actuele isometrische LEGO-scene", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Beheer is alleen beschikbaar op computer of laptop.");
    await mockAuthenticatedApp(page);
    await page.goto("/");
    await page.waitForFunction(() => (
      window.LEARNGameOMSimulator
      && window.LOMLogisticsScene
      && window.IsometricLogisticsView
    ));
    await page.locator("body.auth-authenticated").waitFor({ state: "attached" });
    await page.evaluate(() => {
      window.LEARNGameOMSimulator.setAppView("manager");
    });
    await page.locator('[data-manager-tab="layout"]').click();

    const layout = page.locator("[data-manager-panel='layout']");
    await expect(layout).toBeVisible();
    await expect(layout.locator("[data-session-layout-lego] > .iso-logistics-view")).toBeVisible();
    await expect(layout.locator(".iso-lego-box")).toHaveCount(6);
    await expect(layout.locator(".session-layout-config-summary")).not.toHaveAttribute("open", "");
  });

  test("9b. de gewone Entrepreneurship-kaart toont ook Handelaar en alle drie bouwstappen", async ({ page }) => {
    await mockAuthenticatedApp(page);
    await page.goto("/");
    await page.waitForFunction(() => (
      window.LEARNGameOMSimulator
      && window.LOMLogisticsScene
      && window.IsometricLogisticsView
    ));
    await page.locator("body.auth-authenticated").waitFor({ state: "attached" });

    const scene = await page.evaluate(() => {
      window.LEARNGameOMSimulator.applyGameTypePreset("entrepreneurial", false);
      const current = window.LOMLogisticsScene.current();
      return {
        title: current.title,
        departmentIds: current.departments.map(department => department.id),
        labels: current.departments.map(department => department.title)
      };
    });

    expect(scene.title).toBe("Entrepreneurship · zelfstandige ondernemingen");
    expect(scene.departmentIds).toEqual([
      "operations",
      "inbound",
      "production_1",
      "production_2",
      "production_3",
      "quality",
      "dispatch"
    ]);
    expect(scene.labels).toEqual(expect.arrayContaining([
      "Handelaar · Order & verkoop",
      "Producent · Torenbouw 1",
      "Producent · Torenbouw 2",
      "Producent · Torenbouw 3",
      "Handelaar · Gereed product"
    ]));
  });

  test("10. Akkoord en toevoegen slaat een complete maatwerktoren op", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "De toreneditor is alleen beschikbaar op computer of laptop.");
    await mockAuthenticatedApp(page);
    await page.goto("/");
    await page.waitForFunction(() => window.LEARNGameOMSimulator && window.TowerEditor);
    await page.locator("body.auth-authenticated").waitFor({ state: "attached" });
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

  test("10b. tutorialstap 5 bouwt een toren en voegt hem echt aan het assortiment toe", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "De bouwtutorial is alleen beschikbaar op computer of laptop.");
    await mockAuthenticatedApp(page);
    await page.goto("/");
    await page.waitForFunction(() => window.LEARNGameOMSimulator && window.TowerEditor);
    await page.locator("body.auth-authenticated").waitFor({ state: "attached" });
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
    const choices = editor.locator("[data-add-tower-part]");
    await expect(choices).toHaveCount(9);
    for (let index = 0; index < await choices.count(); index += 1) {
      await expect(choices.nth(index)).toHaveAttribute("aria-disabled", "false");
    }
    await editor.locator('[data-add-tower-part="blue_8"]').click();
    await editor.locator('[data-add-tower-part="red_8"]').click();
    await editor.locator('[data-add-tower-part="yellow_4"]').click();
    await editor.locator('[data-add-tower-part="green_4"]').click();
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
    await page.evaluate(() => window.TowerEditor.setView("builder"));
    await expect(editor.locator('[data-add-tower-part="blue_8"]')).toHaveAttribute("aria-disabled", "false");
    await expect(editor.locator('[data-add-tower-part="red_8"]')).toHaveAttribute("aria-disabled", "true");
  });

  test("11. productiestromen en tutorialroutes gebruiken Engine-kabels zonder pijlmarkers", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "De bouwtutorial is alleen beschikbaar op computer of laptop.");
    await mockAuthenticatedApp(page);
    await page.goto("/#tutorialStep2");
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
