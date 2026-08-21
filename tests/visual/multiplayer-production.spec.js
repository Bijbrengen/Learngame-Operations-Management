const crypto = require("node:crypto");
const { test, expect } = require("@playwright/test");

const LEERBOX_ID = "learngame-operations-management";
const ENGINE_BASE = String(
  process.env.LOM_ENGINE_URL || "https://api.leerpretpark.nl/api"
).replace(/\/$/, "");
const DASHBOARD_URL = process.env.LEERPRET_DASHBOARD_URL
  || "https://bijbrengen.github.io/LeerpretDashboard/snn-innovation-test/?role=technologist";
const DASHBOARD_ORIGIN = new URL(DASHBOARD_URL).origin;
const OFFICIAL_PAGES_ORIGIN = "https://bijbrengen.github.io";
const PRODUCTION_ENABLED = process.env.LOM_PRODUCTION_TEST === "1";
const AUTH_SECRET = process.env.LEERPRET_AUTH_SECRET || "";
const EDITOR_SUBJECT = process.env.LEERPRET_EDITOR_SUBJECT || "";
const PREISSUED_EDITOR_TOKEN = process.env.LEERPRET_EDITOR_SESSION_TOKEN || "";

function signature(payload) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

function learnerToken(principalId) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${principalId}.${LEERBOX_ID}.learner.${issuedAt}`;
  return `${payload}.${signature(payload)}`;
}

function dashboardToken() {
  if (PREISSUED_EDITOR_TOKEN) return PREISSUED_EDITOR_TOKEN;
  if (!EDITOR_SUBJECT) {
    throw new Error(
      "LEERPRET_EDITOR_SUBJECT of LEERPRET_EDITOR_SESSION_TOKEN is vereist voor de productie-livefeed."
    );
  }
  const encoded = Buffer.from(JSON.stringify({
    iat: Math.floor(Date.now() / 1000),
    origin: DASHBOARD_ORIGIN,
    sub: EDITOR_SUBJECT
  })).toString("base64url");
  return `${encoded}.${signature(`browser.${encoded}`)}`;
}

async function responseJson(response, label) {
  const raw = await response.text();
  let payload = { detail: raw };
  try {
    payload = JSON.parse(raw);
  } catch {}
  if (!response.ok()) {
    throw new Error(`${label} gaf HTTP ${response.status()}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function engineCall(request, token, method, path, data, instanceId) {
  const headers = { "X-Leerpret-Session": token };
  if (instanceId) headers["X-Leerpret-Game-Instance"] = instanceId;
  const options = { method, headers };
  if (data !== undefined) options.data = data;
  return responseJson(
    await request.fetch(`${ENGINE_BASE}${path}`, options),
    `${method} ${path}`
  );
}

async function liveSnapshot(request, token, after = 0) {
  return responseJson(
    await request.get(
      `${ENGINE_BASE}/innovation-tests/lom/live?after=${after}&limit=100`,
      {
        headers: {
          "Origin": DASHBOARD_ORIGIN,
          "X-Leerpret-Session": token,
          "X-Leerpret-Role": "technologist"
        }
      }
    ),
    "GET /innovation-tests/lom/live"
  );
}

async function currentLiveCursor(request, editorToken) {
  let cursor = 0;
  for (let page = 0; page < 10; page += 1) {
    const snapshot = await liveSnapshot(request, editorToken, cursor);
    cursor = Number(snapshot.cursor || cursor);
    if (!snapshot.has_more) return Number(snapshot.latest_cursor || cursor);
  }
  throw new Error("De productie-livefeed kon niet binnen tien pagina's worden ingelopen.");
}

async function openLearner(browser, token, partitionKey) {
  const context = await browser.newContext();
  await context.addCookies([{
    name: "leerpret_leerbox_session",
    value: token,
    domain: new URL(ENGINE_BASE).hostname,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "None",
    partitionKey
  }]);
  await context.addInitScript(({ sessionToken }) => {
    localStorage.setItem("leerpret.sessionToken", sessionToken);
    localStorage.setItem("learngame.om.tutorialCompleted", "true");
    sessionStorage.setItem("learngame.om.appView", "player");
  }, { sessionToken: token });
  const page = await context.newPage();
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await page.locator("body.auth-authenticated").waitFor({ timeout: 30_000 });
  await page.locator("#playerSessionContent").waitFor({ timeout: 30_000 });
  return { context, page };
}

test.use({ trace: "off", screenshot: "off", video: "off" });

test.describe("LOM multiplayer productieproef", () => {
  test.skip(!PRODUCTION_ENABLED, "Alleen uitvoeren met LOM_PRODUCTION_TEST=1 tegen productie.");
  test.describe.configure({ retries: 0, mode: "serial" });

  test("late agentovername, FIFO, actie-telemetrie en Dashboardselectie werken end-to-end", async ({
    browser,
    request,
    baseURL
  }) => {
    test.setTimeout(240_000);
    if (!AUTH_SECRET) throw new Error("LEERPRET_AUTH_SECRET is vereist voor tijdelijke productie-identiteiten.");
    const appUrl = new URL(baseURL);
    const dashboardUrl = new URL(DASHBOARD_URL);
    expect(appUrl.origin).toBe(OFFICIAL_PAGES_ORIGIN);
    expect(appUrl.pathname).toMatch(/^\/Learngame-Operations-Management\//);
    expect(dashboardUrl.origin).toBe(OFFICIAL_PAGES_ORIGIN);
    expect(dashboardUrl.pathname).toMatch(/^\/LeerpretDashboard\/snn-innovation-test\/?$/);
    expect(new URL(ENGINE_BASE).origin).toBe("https://api.leerpretpark.nl");

    const runId = `codex-live-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const players = Object.fromEntries(
      ["host", "alice", "carol", "dave"].map(name => [
        name,
        { principalId: `${runId}-${name}`, token: learnerToken(`${runId}-${name}`) }
      ])
    );
    const editorToken = dashboardToken();
    const contexts = [];
    let sessionId = null;
    let finished = false;

    try {
      const liveCursorBefore = await currentLiveCursor(request, editorToken);
      const created = await engineCall(
        request,
        players.host.token,
        "POST",
        "/v1/game-sessions",
        {
          session_type: "open",
          difficulty_level: "normal",
          game_config: {
            play_mode: "digital",
            game_type: "lo4",
            has_supplier: false,
            enabled_roles: ["customer", "operations"]
          }
        }
      );
      sessionId = created.session_id;
      expect(created).toMatchObject({
        status: "lobby",
        human_count: 1,
        agent_count: 0,
        capacity: 2,
        created_by_current_player: true
      });

      await engineCall(
        request,
        players.host.token,
        "POST",
        `/v1/game-sessions/${encodeURIComponent(sessionId)}/game-master-role`,
        { role_id: "operations" }
      );
      await engineCall(
        request,
        players.host.token,
        "POST",
        `/v1/game-sessions/${encodeURIComponent(sessionId)}/start-requests`
      );
      const started = await engineCall(
        request,
        players.host.token,
        "POST",
        `/v1/game-sessions/${encodeURIComponent(sessionId)}/consensus`,
        { decision: "start_with_agents" }
      );
      expect(started).toMatchObject({
        status: "running",
        human_count: 1,
        agent_count: 1,
        queue_count: 0
      });

      const host = await openLearner(browser, players.host.token, appUrl.origin);
      contexts.push(host.context);
      await expect(host.page.locator(".player-running-session")).toBeVisible({ timeout: 30_000 });
      await expect.poll(
        () => host.page.evaluate(() => window.LOMMultiplayerRuntime?.getState()?.isController),
        { timeout: 30_000 }
      ).toBe(true);
      await expect.poll(async () => {
        const runtime = await engineCall(
          request,
          players.host.token,
          "GET",
          `/v1/game-sessions/${encodeURIComponent(sessionId)}/runtime`,
          undefined,
          `${runId}-observer`
        );
        return Array.isArray(runtime.snapshot?.orders);
      }, { timeout: 30_000 }).toBe(true);

      const alice = await openLearner(browser, players.alice.token, appUrl.origin);
      const carol = await openLearner(browser, players.carol.token, appUrl.origin);
      const dave = await openLearner(browser, players.dave.token, appUrl.origin);
      contexts.push(alice.context, carol.context, dave.context);

      const aliceJoin = alice.page.locator(`[data-join-session="${sessionId}"]`);
      await expect(aliceJoin).toContainText("Agentrol overnemen", { timeout: 30_000 });
      await aliceJoin.click();
      await expect(alice.page.locator(".player-running-session")).toContainText("Klant", {
        timeout: 30_000
      });
      const afterTakeover = await engineCall(
        request,
        players.alice.token,
        "GET",
        `/v1/game-sessions/${encodeURIComponent(sessionId)}`
      );
      expect(afterTakeover).toMatchObject({ human_count: 2, agent_count: 0, queue_count: 0 });

      const carolJoin = carol.page.locator(`[data-join-session="${sessionId}"]`);
      await expect(carolJoin).toContainText("Aansluiten in wachtrij", { timeout: 30_000 });
      await carolJoin.click();
      await expect(carol.page.locator(".player-queued-session")).toContainText("plek 1", {
        timeout: 30_000
      });

      const daveJoin = dave.page.locator(`[data-join-session="${sessionId}"]`);
      await expect(daveJoin).toContainText("Aansluiten in wachtrij", { timeout: 30_000 });
      await daveJoin.click();
      await expect(dave.page.locator(".player-queued-session")).toContainText("plek 2", {
        timeout: 30_000
      });

      const orderId = await host.page.evaluate(async () => {
        const controller = window.LEARNGameOMSimulator.getSharedGameController();
        const order = controller.engine.generateOrder();
        controller.engine.updateRole("customer", Date.now());
        await window.LOMMultiplayerRuntime.publishSnapshot();
        return order.id;
      });
      const customerSubmit = alice.page.locator(".sim-customer-order-submit");
      await expect(customerSubmit).toBeVisible({ timeout: 30_000 });
      await alice.page.locator('.sim-customer-order-form input[name="product_id"]').first().check({ force: true });
      await alice.page.locator('.sim-customer-order-form input[name="quantity"]').fill("4");
      await alice.page.locator('.sim-customer-order-form input[name="due_minutes"]').fill("37");
      await alice.page.evaluate(() => {
        const controller = window.LEARNGameOMSimulator.getSharedGameController();
        controller.signatureStrokes = [[{ x: 10, y: 10 }, { x: 40, y: 30 }]];
        controller.signed = true;
      });
      await customerSubmit.click();
      await expect.poll(
        () => alice.page.evaluate(() => window.LOMMultiplayerRuntime.getState().ownPendingCommandIds),
        { timeout: 30_000 }
      ).toEqual([]);

      let matchingEvent = null;
      let cursor = liveCursorBefore;
      await expect.poll(async () => {
        const live = await liveSnapshot(request, editorToken, cursor);
        cursor = Number(live.cursor || cursor);
        matchingEvent = live.events.find(event => (
          event.session_id === sessionId
          && event.step_1?.action_type === "simulation_customer_order_completed"
        )) || matchingEvent;
        return matchingEvent !== null;
      }, { timeout: 30_000 }).toBe(true);
      expect(matchingEvent).toMatchObject({
        session_id: sessionId,
        participant_ref: expect.any(String),
        step_1: { action_type: "simulation_customer_order_completed" }
      });

      const dashboardContext = await browser.newContext();
      contexts.push(dashboardContext);
      await dashboardContext.addInitScript(({ token }) => {
        sessionStorage.setItem("leerpret.browserSession", token);
        localStorage.setItem("active_role", "technologist");
        localStorage.setItem("leerpret.poc.role", "technologist");
        localStorage.removeItem("leerpret.loggedOut");
      }, { token: editorToken });
      const dashboard = await dashboardContext.newPage();
      await dashboard.goto(DASHBOARD_URL, { waitUntil: "domcontentloaded" });
      const personSelect = dashboard.locator("#live-person-select");
      await expect(personSelect).toBeEnabled({ timeout: 30_000 });
      const matchingOption = personSelect.locator("option", { hasText: sessionId });
      await expect(matchingOption).toHaveCount(1, { timeout: 30_000 });
      await personSelect.selectOption(await matchingOption.getAttribute("value"));
      await expect(dashboard.locator("#simulation-measurement-person")).toContainText(
        matchingEvent.participant_ref
      );
      await expect(dashboard.locator("#simulation-session-id")).toContainText(sessionId);

      await alice.page.locator("[data-leave-game-session]").click();
      await expect.poll(async () => {
        const promoted = await engineCall(
          request,
          players.carol.token,
          "GET",
          `/v1/game-sessions/${encodeURIComponent(sessionId)}`
        );
        return {
          participation: promoted.participation_status,
          role: promoted.members.find(member => member.member_id === promoted.current_member_id)
            ?.assigned_role_id,
          queueCount: promoted.queue_count
        };
      }, { timeout: 30_000 }).toEqual({
        participation: "active",
        role: "customer",
        queueCount: 1
      });

      const finishedSession = await engineCall(
        request,
        players.host.token,
        "POST",
        `/v1/game-sessions/${encodeURIComponent(sessionId)}/finish`
      );
      finished = true;
      expect(finishedSession.status).toBe("finished");
      expect(orderId).toEqual(expect.any(String));
    } finally {
      if (sessionId && !finished) {
        try {
          await engineCall(
            request,
            players.host.token,
            "POST",
            `/v1/game-sessions/${encodeURIComponent(sessionId)}/finish`
          );
        } catch (error) {
          console.warn("Productietestsessie kon niet automatisch worden be\u00ebindigd.", error.message);
        }
      }
      await Promise.all(contexts.map(context => context.close().catch(() => {})));
    }
  });
});
