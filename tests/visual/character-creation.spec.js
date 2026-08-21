const { test, expect } = require("./fixtures");

test.describe("Character Creation & Gedragsscan Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/accounts.google.com/**", route => route.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await page.route("**/leerpret-auth.js", route => route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `window.LeerpretAuth = {
        getSession: () => ({ authenticated: false, apiBase: window.LEARNGAME_OM_CONFIG.apiBase }),
        checkSession: async () => ({ authenticated: false })
      };`
    }));
    await page.route("**/v1/player/behavior-profile**", route => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ exists: false }) });
    });
  });

  test("wizard opent introductie en vereist 20 punten per categorie voor voortgang", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.BehaviorCharacterCreation);

    await page.evaluate(() => {
      document.body.className = "";
      const authGate = document.getElementById("leerpretAuthGate");
      if (authGate) authGate.hidden = true;

      const charGate = document.getElementById("characterCreationGate");
      if (charGate) charGate.hidden = false;

      window.BehaviorCharacterCreation.start({ authenticated: true });
    });

    const beginBtn = page.locator('[data-action="begin-scans"]');
    await expect(beginBtn).toBeVisible({ timeout: 10000 });
    await beginBtn.click({ force: true });

    await expect(page.getByRole("heading", { name: "Baseline Attribute Allocation" })).toBeVisible();

    const nextBtn = page.locator('[data-action="next"]');
    await expect(nextBtn).toBeDisabled();

    const inputs = page.locator(".trait-value-input");
    await expect(inputs).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await inputs.nth(i).fill("5");
      await inputs.nth(i).dispatchEvent("change");
    }

    await expect(nextBtn).toBeEnabled();
    await expect(page.locator(".point-budget")).toContainText("0");

    await nextBtn.click({ force: true });
    await expect(page.locator(".category-heading")).toContainText("Attribuutnode 2 van 10");
  });

  test("gedragsstijltest kan met de X worden overgeslagen", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.BehaviorCharacterCreation);

    await page.evaluate(() => {
      document.body.className = "";
      document.getElementById("leerpretAuthGate").hidden = true;
      window.BehaviorCharacterCreation.start({ authenticated: true });
    });

    const gate = page.locator("#characterCreationGate");
    await expect(gate).toBeVisible();
    await page.getByRole("button", { name: "Gedragsstijltest sluiten en overslaan" }).click();
    await expect(gate).toBeHidden();
    await expect(page.locator("body")).not.toHaveClass(/character-creation-active/);
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem("learngame-om.behavior-profile-dismissed.v1"))).toBe("true");
  });

  test("kwaliteitscontrole signaleert te uniforme scans", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.BehaviorResponseQuality);

    const result = await page.evaluate(() => {
      const flatScan = Array(10).fill([5, 5, 5, 5]);
      return window.BehaviorResponseQuality.assess({
        basic_style: flatScan,
        response_style: flatScan
      });
    });

    expect(result).not.toBeNull();
    expect(result.doubtful).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
