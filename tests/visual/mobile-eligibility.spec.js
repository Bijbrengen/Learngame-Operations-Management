const { test, expect } = require("./fixtures");

const PHYSICAL_SESSION_ID = "session-mobile-physical";
const DIGITAL_SESSION_ID = "session-mobile-digital";

async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

function summary(sessionId, playMode) {
  return {
    session_id: sessionId,
    session_type: "open",
    play_mode: playMode,
    difficulty_level: "normal",
    status: "lobby",
    member_count: 1,
    human_count: 1,
    agent_count: 0,
    queue_count: 0,
    capacity: 2,
    available_places: 1,
    participation_status: "none",
    queue_position: null,
    join_mode: "join",
    created_by_current_player: false,
    created_at: "2026-08-28T08:00:00Z",
    updated_at: "2026-08-28T08:00:00Z"
  };
}

function joinedPhysicalSession({ asGameMaster = false } = {}) {
  return {
    contract_version: "1.0",
    session_id: PHYSICAL_SESSION_ID,
    join_code: "PHYS01",
    session_type: "open",
    difficulty_level: "normal",
    game_config: {
      play_mode: "physical",
      game_type: "lo1",
      enabled_roles: ["customer", "operations"],
      production_processes: ["sequential"],
      customer_order_mode: "required",
      has_supplier: false
    },
    origin: "managed",
    status: "lobby",
    game_master_member_id: "member-physical-master",
    created_by_member_id: "member-physical-master",
    controller_member_id: "member-physical-master",
    required_role_ids: ["customer", "operations"],
    members: [
      {
        member_id: "member-physical-master",
        assigned_role_id: "customer",
        present: true
      },
      {
        member_id: "member-mobile-player",
        assigned_role_id: "operations",
        present: true
      }
    ],
    waiting_members: [],
    role_vacancies: [],
    consensus: null,
    virtual_agents: [],
    created_at: "2026-08-28T08:00:00Z",
    updated_at: "2026-08-28T08:01:00Z",
    current_member_id: asGameMaster ? "member-physical-master" : "member-mobile-player",
    is_game_master: asGameMaster,
    participation_status: "active",
    queue_position: null,
    join_mode: "resume",
    human_count: 2,
    agent_count: 0,
    queue_count: 0
  };
}

function joinedDigitalSession({ status = "lobby" } = {}) {
  const session = joinedPhysicalSession();
  return {
    ...session,
    session_id: DIGITAL_SESSION_ID,
    join_code: "DIGI01",
    status,
    game_config: { ...session.game_config, play_mode: "digital" }
  };
}

async function mockAuthenticatedLobby(page, {
  initialSession = null,
  onlyDigitalOpen = false,
  storedAppView = "player"
} = {}) {
  const stats = {
    joins: [],
    creates: [],
    freeRequests: [],
    tutorialWrites: [],
    availabilityRequests: 0,
    availabilityQueries: [],
    runtimeRequests: 0
  };
  let currentSession = initialSession;
  const physical = summary(PHYSICAL_SESSION_ID, "physical");
  const digital = summary(DIGITAL_SESSION_ID, "digital");

  await page.addInitScript(appView => {
    sessionStorage.setItem("learngame.om.appView", appView);
    localStorage.removeItem("learngame.om.tutorialCompleted");
    localStorage.removeItem("learngame.om.tutorialDismissed");
  }, storedAppView);
  await page.route("**/accounts.google.com/**", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: ""
  }));
  await page.route("**/auth/leerbox/session**", route => fulfillJson(route, 200, {
    authenticated: true,
    user: { label: "Mobiele regressiespeler" },
    roles: ["learner"]
  }));
  await page.route("**/v1/player/behavior-profile**", route => fulfillJson(route, 200, {
    exists: true,
    profile: {}
  }));
  await page.route("**/v1/player/tutorial-state**", async route => {
    if (route.request().method() === "POST") {
      stats.tutorialWrites.push(route.request().postDataJSON());
    }
    await fulfillJson(route, 200, { completed: false, dismissed: false });
  });
  await page.route("**/v1/game-sessions/availability**", route => {
    stats.availabilityRequests += 1;
    const requestUrl = new URL(route.request().url());
    const query = Object.fromEntries(requestUrl.searchParams.entries());
    stats.availabilityQueries.push(query);
    const currentSummary = currentSession?.game_config?.play_mode === "digital"
      ? digital
      : physical;
    const listedSessions = onlyDigitalOpen ? [digital] : [physical, digital];
    return fulfillJson(route, 200, {
      status: "ok",
      current_session: currentSession,
      active_sessions: listedSessions,
      open_sessions: listedSessions,
      discoverable_sessions: listedSessions,
      created_sessions: [],
      participating_sessions: currentSession ? [currentSummary] : [],
      // Bewust onveilig bij alleen een digitale open sessie: de client moet
      // mobiel ook een verouderd Engine-antwoord met `true` afvangen.
      can_start_free_game: onlyDigitalOpen
    });
  });
  await page.route("**/v1/game-sessions/free**", async route => {
    const requestUrl = new URL(route.request().url());
    stats.freeRequests.push(Object.fromEntries(requestUrl.searchParams.entries()));
    currentSession = joinedPhysicalSession();
    await fulfillJson(route, 200, currentSession);
  });
  await page.route("**/v1/game-sessions", async route => {
    const payload = route.request().postDataJSON();
    stats.creates.push(payload);
    currentSession = joinedPhysicalSession();
    await fulfillJson(route, 200, currentSession);
  });
  await page.route("**/v1/game-sessions/join", async route => {
    const payload = route.request().postDataJSON();
    stats.joins.push(payload);
    const targetsDigital = payload.session_id === DIGITAL_SESSION_ID
      || payload.join_code === "DIGI01";
    if (targetsDigital && payload.supports_digital_play === false) {
      await fulfillJson(route, 409, {
        detail: {
          code: "digital_session_requires_computer",
          message: "Digitale gamesessies werken alleen op een computer of laptop met muis. Op dit apparaat kun je wel aan een fysieke gamesessie deelnemen."
        }
      });
      return;
    }
    currentSession = targetsDigital ? joinedDigitalSession() : joinedPhysicalSession();
    await fulfillJson(route, 200, currentSession);
  });
  await page.route("**/v1/game-sessions/*/runtime**", route => {
    stats.runtimeRequests += 1;
    return fulfillJson(route, 200, { status: "running" });
  });
  await page.route("**/v1/interactions**", route => fulfillJson(route, 200, { status: "ok" }));

  return stats;
}

test("telefoon/tablet toont alleen Speler en laat uitsluitend fysieke deelname toe", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Deze controle gebruikt de Pixel 7-devicecontext.");
  const stats = await mockAuthenticatedLobby(page);
  await page.goto("/#tutorialStep2");
  await page.locator("body.auth-authenticated").waitFor();
  await page.waitForFunction(() => window.LEARNGameOMSimulator && window.LOMDeviceCapabilities);
  await expect.poll(() => stats.availabilityQueries[0]).toMatchObject({
    contract_version: "2",
    supports_digital_play: "false"
  });

  await expect(page.locator("body")).not.toHaveClass(/tutorial-focus/);
  const tutorialButton = page.locator("#menuTutorialButton");
  await expect(tutorialButton).toBeHidden();
  await expect(tutorialButton).toBeDisabled();
  expect(await page.evaluate(() => window.LEARNGameOMSimulator.launchTutorial())).toBe(false);
  await expect(page.locator("body")).not.toHaveClass(/tutorial-focus/);
  expect(await page.evaluate(() => ({
    completed: localStorage.getItem("learngame.om.tutorialCompleted"),
    dismissed: localStorage.getItem("learngame.om.tutorialDismissed")
  }))).toEqual({ completed: null, dismissed: null });
  expect(stats.tutorialWrites).toHaveLength(0);

  await expect(page.locator("#playerViewButton")).toBeVisible();
  await expect(page.locator("#playerViewButton")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".app-view-switcher [data-main-menu-tab]:visible")).toHaveCount(0);
  await expect(page.locator('[data-app-view="manager"]:visible')).toHaveCount(0);
  await expect(page.locator("#managerWorkbench")).toBeHidden();

  await expect(page.locator("#playerSessionContent .mobile-play-notice")).toContainText("alleen fysiek");
  const digitalCard = page.locator(`[data-join-session="${DIGITAL_SESSION_ID}"]`);
  const physicalCard = page.locator(`[data-join-session="${PHYSICAL_SESSION_ID}"]`);
  await expect(digitalCard).toBeDisabled();
  await expect(digitalCard).toContainText("Alleen op computer of laptop");
  await expect(physicalCard).toBeEnabled();
  expect(stats.joins).toHaveLength(0);

  await physicalCard.click();
  await expect.poll(() => stats.joins.length).toBe(1);
  expect(stats.joins[0]).toEqual({
    session_id: PHYSICAL_SESSION_ID,
    supports_digital_play: false
  });
  await expect(page.locator("#playerSessionBadge")).toHaveText("In lobby");
  await expect(page.locator("#playerSessionContent")).toContainText("PHYS01");
});

test("digitale gamecode wordt op mobiel atomair en inline geweigerd", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Deze controle gebruikt de Pixel 7-devicecontext.");
  const stats = await mockAuthenticatedLobby(page);
  await page.goto("/");
  await page.locator("body.auth-authenticated").waitFor();

  await page.locator('[data-game-code-join] input[name="join_code"]').fill("DIGI01");
  await page.locator('[data-game-code-join] button[type="submit"]').click();
  await expect.poll(() => stats.joins.length).toBe(1);
  expect(stats.joins[0]).toEqual({
    join_code: "DIGI01",
    supports_digital_play: false
  });
  await expect(page.locator(".session-action-error")).toContainText("computer of laptop");
  await expect(page.locator("#playerSessionBadge")).toHaveText("Geen sessie");
});

test("computer/laptop behoudt tutorial en digitale deelname", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Deze controle gebruikt de desktopcontext.");
  const stats = await mockAuthenticatedLobby(page);
  await page.goto("/");
  await page.locator("body.auth-authenticated").waitFor();
  await page.waitForFunction(() => window.LEARNGameOMSimulator && window.LOMDeviceCapabilities);

  await expect(page.locator("body")).toHaveClass(/tutorial-focus/);
  expect(await page.evaluate(() => window.LOMDeviceCapabilities.current().supportsDigitalPlay)).toBe(true);
  await expect(page.locator(`[data-join-session="${DIGITAL_SESSION_ID}"]`)).toBeEnabled();
  await expect(page.locator("#menuTutorialButton")).toBeEnabled();

  await page.evaluate(() => window.LEARNGameOMSimulator.endTutorial({ completed: true }));
  await expect(page.locator("body")).not.toHaveClass(/tutorial-focus/);
  await page.locator(`[data-join-session="${DIGITAL_SESSION_ID}"]`).click();
  await expect.poll(() => stats.joins.length).toBe(1);
  expect(stats.joins[0]).toEqual({
    session_id: DIGITAL_SESSION_ID,
    supports_digital_play: true
  });
  await expect(page.locator("#playerSessionBadge")).toHaveText("In lobby");
  await expect(page.locator("#playerSessionContent")).toContainText("Digitaal");
});

test("bestaande digitale deelname blijft op mobiel geblokkeerd zonder runtime", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Deze controle gebruikt de Pixel 7-devicecontext.");
  const stats = await mockAuthenticatedLobby(page, {
    initialSession: joinedDigitalSession({ status: "running" })
  });
  await page.goto("/");
  await page.locator("body.auth-authenticated").waitFor();

  await expect(page.locator("#playerSessionBadge")).toHaveText("Computer nodig");
  await expect(page.locator(".mobile-blocked-session")).toContainText("niet gestart");
  await expect(page.locator("#topSessionControls")).toBeHidden();
  await expect.poll(() => stats.availabilityRequests, { timeout: 8_000 }).toBeGreaterThanOrEqual(2);
  expect(stats.availabilityQueries).toEqual(expect.arrayContaining([
    expect.objectContaining({ contract_version: "2", supports_digital_play: "false" })
  ]));
  expect(stats.runtimeRequests).toBe(0);
});

test("een mobiele Game Master van een fysieke lobby krijgt alleen spelersbediening", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Deze controle gebruikt de Pixel 7-devicecontext.");
  const stats = await mockAuthenticatedLobby(page, {
    initialSession: joinedPhysicalSession({ asGameMaster: true })
  });
  await page.goto("/");
  await page.locator("body.auth-authenticated").waitFor();

  await expect(page.locator("#playerWorkbench")).toBeVisible();
  await expect(page.locator("#managerWorkbench")).toBeHidden();
  await expect(page.locator("#playerSessionContent")).toContainText(
    "Game Master-beheer op computer/laptop"
  );
  await expect(page.locator("#playerSessionContent [data-active-game-config]")).toHaveCount(0);
  await expect(page.locator("#playerSessionContent [data-game-master-role-select]")).toHaveCount(0);
  await expect(page.locator("#playerSessionContent [data-game-difficulty-select]")).toHaveCount(0);
  expect(stats.creates).toHaveLength(0);
  expect(stats.freeRequests).toHaveLength(0);
});

test("mobiel herstelt en bewaart uitsluitend de Speler-weergave", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Deze controle gebruikt de Pixel 7-devicecontext.");
  const stats = await mockAuthenticatedLobby(page, { storedAppView: "manager" });
  await page.goto("/");
  await page.locator("body.auth-authenticated").waitFor();
  await page.waitForFunction(() => window.LEARNGameOMSimulator);

  await expect(page.locator("#playerViewButton")).toBeVisible();
  await expect(page.locator("#playerViewButton")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".app-view-switcher [data-main-menu-tab]:visible")).toHaveCount(0);
  await expect(page.locator('[data-app-view="manager"]:visible')).toHaveCount(0);
  await expect(page.locator("#playerWorkbench")).toBeVisible();
  await expect(page.locator("#managerWorkbench")).toBeHidden();
  await expect(page.locator("#gameSessionCreateForm")).toBeHidden();
  expect(await page.evaluate(() => ({
    appView: window.LEARNGameOMSimulator.getStateSnapshot().appView,
    storedAppView: sessionStorage.getItem("learngame.om.appView")
  }))).toEqual({ appView: "player", storedAppView: "player" });

  await page.evaluate(() => {
    window.LEARNGameOMSimulator.setAppView("manager");
    window.LEARNGameOMSimulator.setManagerTab("session");
  });

  expect(await page.evaluate(() => ({
    appView: window.LEARNGameOMSimulator.getStateSnapshot().appView,
    managerTab: window.LEARNGameOMSimulator.getStateSnapshot().managerTab,
    storedAppView: sessionStorage.getItem("learngame.om.appView")
  }))).toEqual({
    appView: "player",
    managerTab: "session",
    storedAppView: "player"
  });
  await expect(page.locator("#managerWorkbench")).toBeHidden();
  expect(stats.creates).toHaveLength(0);
});

test("mobiel kan ook naast alleen een digitale open sessie geen vrije game starten", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Deze controle gebruikt de Pixel 7-devicecontext.");
  const stats = await mockAuthenticatedLobby(page, { onlyDigitalOpen: true });
  await page.goto("/");
  await page.locator("body.auth-authenticated").waitFor();

  await expect(page.locator("[data-start-free-game]")).toHaveCount(0);
  await expect(page.locator("#playerSessionContent")).toContainText("alleen als speler");
  expect(stats.freeRequests).toHaveLength(0);
  expect(stats.creates).toHaveLength(0);
});

test("iPad met desktop-user-agent blijft onder de mobiele beperking", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Deze controle emuleert iPad-desktopmodus in Chromium.");
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15"
    });
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "MacIntel"
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 5
    });
  });
  await mockAuthenticatedLobby(page);
  await page.goto("/");
  await page.locator("body.auth-authenticated").waitFor();

  expect(await page.evaluate(() => window.LOMDeviceCapabilities.current())).toMatchObject({
    isMobileDevice: true,
    supportsDigitalPlay: false,
    supportsTutorial: false,
    supportsGameManagement: false,
    supportsSessionCreation: false
  });
  await expect(page.locator("#menuTutorialButton")).toBeHidden();
  await expect(page.locator(".app-view-switcher [data-main-menu-tab]:visible")).toHaveCount(0);
  await expect(page.locator('[data-app-view="manager"]:visible')).toHaveCount(0);
  await expect(page.locator("#managerWorkbench")).toBeHidden();
  await expect(page.locator(`[data-join-session="${DIGITAL_SESSION_ID}"]`)).toBeDisabled();
  await expect(page.locator(`[data-join-session="${PHYSICAL_SESSION_ID}"]`)).toBeEnabled();
});
