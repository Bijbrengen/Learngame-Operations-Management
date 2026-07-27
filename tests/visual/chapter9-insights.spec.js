const { test, expect } = require("@playwright/test");

async function openInsights(page) {
  await page.route("**/sdk/lego-builder/logic.js", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: "window.LeerpretSDK = window.LeerpretSDK || {};"
  }));
  await page.route("**/accounts.google.com/**", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: ""
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
  await page.route("**/v1/player/behavior-profile**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ exists: true, profile: {} })
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
  await page.goto("/");
  await page.waitForFunction(() => (
    window.LEARNGameOMSimulator
    && window.Chapter9Insights
    && window.Chapter9Insights.assets.length === 22
  ));
  await page.locator("body.auth-authenticated").waitFor({ state: "attached" });
  await expect(page.locator("#characterCreationGate")).toBeHidden();
  await page.evaluate(() => {
    window.LEARNGameOMSimulator.setAppView("manager");
    window.LEARNGameOMSimulator.setManagerTab("insights");
  });
}

test("hoofdstuk 9 toont live systeemsignalen, rolactiviteit en contextuele uitleg", async ({ page }) => {
  await openInsights(page);

  await expect(page.locator("#chapter9InsightsPanel")).toBeVisible();
  await expect(page.locator(".chapter9-indicator-card")).toHaveCount(3);
  expect(await page.locator(".chapter9-role-row").count()).toBeGreaterThanOrEqual(10);
  await expect(page.locator("#chapter9CurrentInsightCards")).toContainText("Volume is niet hetzelfde als waarde");
  await expect(page.locator("#chapter9VariantContrast")).toContainText("Inefficiëntie zichtbaar");
  await expect(page.locator("#chapter9VariantContrast")).toContainText("lost die nog niet op");
  await expect(page.locator("#chapter9VariantContrast .is-active")).toContainText("Versie 4");

  await page.evaluate(() => {
    for (let index = 0; index < 4; index += 1) {
      window.LEARNGameOMSimulator.dispatchInteraction({
        actionType: "update_worklist",
        role: "Operations Manager",
        roleId: "opr",
        objectRole: "order_flow",
        result: "success"
      });
    }
    window.LEARNGameOMSimulator.setManagerTab("insights");
  });

  await expect(page.locator("#chapter9LiveIndicators")).toContainText("Actief: druk met niets");
  await expect(page.locator("#chapter9RoleActivity")).toContainText("4 acties · 0 productief");

  await page.getByRole("button", { name: "Uitleg over de sturingsparadox" }).click();
  const infoDialog = page.locator("#configurationHelpDialog");
  await expect(infoDialog).toContainText("Vergelijk managementactiviteit");
  await expect(infoDialog).toContainText("hoofdstuk 9");
  await infoDialog.getByRole("button", { name: "Uitleg sluiten" }).click();
});

test("bronbibliotheek visualiseert alle bestaande SVG- en CSV-bestanden", async ({ page }) => {
  await openInsights(page);

  await page.getByRole("button", { name: "Alle inzichten & bronnen" }).click();
  const library = page.getByRole("dialog", { name: "Inzichten uit hoofdstuk 9" });
  await expect(library).toBeVisible();
  await expect(library.locator(".chapter9-asset-tab")).toHaveCount(2);

  await library.locator("#chapter9VariantSelect").selectOption("all");
  await expect(library.locator(".chapter9-asset-tab")).toHaveCount(22);

  await library.locator("#chapter9VariantSelect").selectOption("lo1");
  await expect(library.locator(".chapter9-asset-tab")).toHaveCount(5);
  await expect(library.locator("#chapter9AssetPreview img")).toBeVisible();
  await expect.poll(() => library.locator("#chapter9AssetPreview img").evaluate(image => image.naturalWidth))
    .toBeGreaterThan(0);

  const csvButton = library.locator(".chapter9-asset-tab").filter({ hasText: "CSV" }).first();
  await csvButton.scrollIntoViewIfNeeded();
  await csvButton.click();
  await expect(library.locator(".chapter9-csv-table")).toBeVisible();
  await expect(library.locator(".chapter9-csv-table tbody tr").first()).toBeVisible();

  const dialogBox = await library.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox.width).toBeLessThanOrEqual(viewport.width);
  expect(dialogBox.height).toBeLessThanOrEqual(viewport.height);
});
