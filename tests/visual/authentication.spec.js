const { test, expect } = require("@playwright/test");

test.describe("Leerpret-aanmelding", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/accounts.google.com/gsi/client", route => {
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `
          window.google = {
            accounts: {
              oauth2: {
                initCodeClient: () => ({
                  requestCode() {
                    window.__googleCodeRequestStarted = true;
                  }
                })
              }
            }
          };
        `
      });
    });
    await page.route("**/api/auth/leerbox/session**", route => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "No active session for this leerbox" })
      });
    });
    await page.route("**/api/auth/leerbox/exchange**", route => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "No active Leerpret session" })
      });
    });
    await page.route("**/api/auth/google/config", route => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          enabled: true,
          client_id: "playwright-client.apps.googleusercontent.com",
          scope: "openid"
        })
      });
    });
  });

  test("bereikbare service toont Google-aanmelding in plaats van offline-melding", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#leerpretAuthMessage")).toHaveText(
      "Meld je hier met je Google-account aan."
    );
    await expect(
      page.getByRole("button", { name: "Pseudoniem aanmelden met Google" })
    ).toBeVisible();
    await expect(page.locator("#leerpretAuthMessage")).not.toContainText(
      "De Leerpret-service is niet bereikbaar"
    );

    await page.getByRole("button", { name: "Pseudoniem aanmelden met Google" }).click();
    await expect.poll(
      () => page.evaluate(() => window.__googleCodeRequestStarted)
    ).toBe(true);

    const session = await page.evaluate(() => window.LeerpretAuth.getSession());
    expect(session.online).toBe(true);
    expect(session.authenticated).toBe(false);
  });

  test("app en API gebruiken dezelfde loopback-hostnaam", async ({ page }) => {
    await page.goto("/");

    const hosts = await page.evaluate(() => ({
      page: new URL(window.LEARNGAME_OM_CONFIG.appUrl).hostname,
      api: new URL(window.LEARNGAME_OM_CONFIG.apiBase).hostname,
      dashboard: new URL(window.LEARNGAME_OM_CONFIG.dashboardUrl).hostname,
      editor: new URL(window.LEARNGAME_OM_CONFIG.editorUrl).hostname
    }));

    expect(new Set(Object.values(hosts))).toEqual(new Set(["127.0.0.1"]));
  });
});
