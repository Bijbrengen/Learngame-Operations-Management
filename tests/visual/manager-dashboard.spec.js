const { test, expect } = require("./fixtures");

async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function mockAuthenticatedApp(page) {
  await page.route("**/accounts.google.com/**", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: ""
  }));
  await page.route("**/auth/leerbox/session**", route => fulfillJson(route, 200, {
    authenticated: true,
    user: { label: "Playwright manager" },
    roles: ["learner"]
  }));
  await page.route("**/api/auth/google/config**", route => fulfillJson(route, 200, {
    enabled: true,
    client_id: "playwright-client.apps.googleusercontent.com",
    scope: "openid"
  }));
  await page.route("**/v1/player/behavior-profile**", route => fulfillJson(route, 200, {
    exists: true,
    profile: {}
  }));
  await page.route("**/v1/game-sessions/availability**", route => fulfillJson(route, 200, {
    current_session: null,
    discoverable_sessions: [],
    open_sessions: [],
    can_start_free_game: true
  }));
}

async function prepareAppShell(page) {
  await mockAuthenticatedApp(page);
  await page.goto("/");
  await page.waitForFunction(() => window.LEARNGameOMReady === true);
  await page.locator("body.auth-authenticated").waitFor();
  await page.evaluate(() => {
    const capabilities = Object.freeze({
      deviceKind: "computer",
      isMobileDevice: false,
      supportsDigitalPlay: true,
      supportsTutorial: true,
      supportsGameManagement: true,
      supportsSessionCreation: true
    });
    window.LOMDeviceCapabilities = Object.freeze({
      current: () => capabilities,
      supportsSession: () => true
    });
    document.documentElement.dataset.deviceKind = "computer";
    document.body.classList.remove("mobile-player-only");
  });
  await expect(page.locator("#leerpretAuthGate")).toBeHidden();
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
