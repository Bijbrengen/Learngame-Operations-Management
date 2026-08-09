const { test, expect } = require("@playwright/test");

test.describe("Leerpret-aanmelding", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = typeof input === "string" ? input : input?.url || String(input);
        const json = (status, body) => Promise.resolve(new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" }
        }));
        if (url.includes("/auth/leerbox/session")) {
          return json(401, { detail: "No active session for this leerbox" });
        }
        if (url.includes("/auth/leerbox/exchange")) {
          return json(401, { detail: "No active Leerpret session" });
        }
        if (url.includes("/auth/google/config")) {
          return json(200, {
            enabled: true,
            client_id: "playwright-client.apps.googleusercontent.com",
            scope: "openid"
          });
        }
        return nativeFetch(input, init);
      };
    });
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
  });

  test("bereikbare service toont Google-aanmelding in plaats van offline-melding", async ({ page }) => {
    await page.goto("/?api=http://127.0.0.1:47111/api");

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

  test("runtime kiest lokaal de lokale Engine en in CI de productie-Engine", async ({ page }) => {
    await page.goto("/");

    const endpoints = await page.evaluate(() => ({ ...window.LEARNGAME_OM_CONFIG }));

    expect(endpoints).toEqual(process.env.CI
      ? {
          appUrl: "https://bijbrengen.github.io/Learngame-Operations-Management/",
          apiBase: "https://api.leerpretpark.nl/api"
        }
      : {
          appUrl: "http://127.0.0.1:47113/",
          apiBase: "http://127.0.0.1:47111/api"
        });
  });

  test("laadt het centrale Engine-thema en het canonieke merkbrein zonder Phile-raster", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.themeSource === "leerpret-engine");

    const theme = await page.evaluate(() => ({
      origin: document.querySelector('link[data-leerpret-theme="engine"]')?.href,
      orange: getComputedStyle(document.documentElement).getPropertyValue("--lp-color-orange").trim(),
      border: getComputedStyle(document.documentElement).getPropertyValue("--toyist-border").trim(),
      brain: getComputedStyle(document.documentElement).getPropertyValue("--lp-brand-brain-url").trim(),
    }));

    expect(theme.origin).toBe(process.env.CI
      ? "https://api.leerpretpark.nl/api/ui/leerpret-theme.css"
      : "http://127.0.0.1:47111/api/ui/leerpret-theme.css");
    expect(theme.orange).toBe("#E97A5F");
    expect(theme.border).toBe("3px solid #684564");
    expect(theme.brain).toContain("brand-brain.svg");
    await expect(page.locator(".brand-logo-row > .brand-brain-mark")).toHaveCount(1);
    await expect(page.locator(".lp-brand-badge")).toHaveCount(0);

    const logoLayout = await page.locator(".brand-logo-row").evaluate((element) => ({
      gridArea: getComputedStyle(element).gridArea,
      logoGridArea: getComputedStyle(element.querySelector(".learn-games-brand")).gridArea,
      width: element.getBoundingClientRect().width,
      logoCenterY: (() => {
        const bounds = element.querySelector(".learn-games-brand").getBoundingClientRect();
        return bounds.top + bounds.height / 2;
      })(),
      brainCenterY: (() => {
        const bounds = element.querySelector(".brand-brain-mark").getBoundingClientRect();
        return bounds.top + bounds.height / 2;
      })(),
      brainBackground: getComputedStyle(element.querySelector(".brand-brain-mark")).backgroundColor,
    }));
    expect(logoLayout.gridArea).toBe("logo");
    expect(logoLayout.logoGridArea).toBe("auto");
    expect(logoLayout.width).toBeLessThanOrEqual(259);
    expect(Math.abs(logoLayout.logoCenterY - logoLayout.brainCenterY)).toBeLessThanOrEqual(1);
    expect(logoLayout.brainBackground).toBe("rgb(229, 231, 235)");

    const logoOverlapsMenu = await page.evaluate(() => {
      const logo = document.querySelector(".brand-logo-row")?.getBoundingClientRect();
      const menu = document.querySelector(".process-indicator-strip")?.getBoundingClientRect();
      if (!logo || !menu) return true;
      return !(
        logo.right <= menu.left
        || menu.right <= logo.left
        || logo.bottom <= menu.top
        || menu.bottom <= logo.top
      );
    });
    expect(logoOverlapsMenu).toBe(false);

    const indicatorOverflow = await page.locator(".process-hud-meter").evaluateAll((meters) =>
      meters.map((meter) => {
        const bounds = meter.getBoundingClientRect();
        const valueBounds = meter.querySelector("b").getBoundingClientRect();
        return Math.max(0, valueBounds.right - bounds.right);
      })
    );
    expect(Math.max(...indicatorOverflow)).toBeLessThanOrEqual(1);

    const bodyBackground = await page.locator("body").evaluate((element) =>
      getComputedStyle(element).backgroundImage
    );
    expect(bodyBackground).not.toContain("data:image/svg+xml");
  });
});
