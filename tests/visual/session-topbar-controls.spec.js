const { test, expect } = require("./fixtures");

async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function mockRunningSession(page, playMode) {
  const sessionId = "session-topbar-regression";
  const requiredRoles = [
    "customer",
    "operations",
    "srm",
    "pd1",
    "pd2",
    "pd3",
    "ssf"
  ];
  const member = {
    member_id: "member-topbar-player",
    principal_id: "principal-topbar-player",
    assigned_role_id: "operations",
    present: true,
    is_game_master: true
  };
  const virtualAgents = requiredRoles
    .filter(roleId => roleId !== member.assigned_role_id)
    .map(roleId => ({ agent_id: `agent-${roleId}`, role_id: roleId }));
  const gameConfig = {
    play_mode: playMode,
    game_type: "lo4",
    enabled_roles: requiredRoles,
    production_processes: ["sequential"],
    customer_order_mode: "required",
    has_supplier: true
  };
  const session = {
    session_id: sessionId,
    join_code: "TOPBAR",
    session_type: "closed",
    status: "running",
    difficulty_level: "normal",
    participation_status: "active",
    queue_position: null,
    current_member_id: member.member_id,
    controller_member_id: member.member_id,
    created_by_current_player: true,
    is_game_master: true,
    capacity: requiredRoles.length,
    required_role_ids: requiredRoles,
    role_vacancies: [],
    waiting_members: [],
    members: [member],
    virtual_agents: virtualAgents,
    game_config: gameConfig,
    consensus: null
  };
  const summary = {
    session_id: sessionId,
    session_type: "closed",
    play_mode: playMode,
    difficulty_level: "normal",
    status: "running",
    human_count: 1,
    agent_count: 6,
    queue_count: 0,
    capacity: 7,
    available_places: 0,
    participation_status: "active",
    queue_position: null,
    join_mode: "resume",
    created_by_current_player: true
  };
  const stats = { leaveCalls: 0 };
  let left = false;

  await page.addInitScript(() => {
    localStorage.setItem("learngame.om.tutorialCompleted", "true");
    sessionStorage.setItem("learngame.om.appView", "player");
  });
  await page.route("**/accounts.google.com/**", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: ""
  }));
  await page.route("**/auth/leerbox/session**", route => fulfillJson(route, 200, {
    authenticated: true,
    user: { label: "Topbar regressie" },
    roles: ["learner"]
  }));
  await page.route("**/v1/player/behavior-profile**", route => fulfillJson(route, 200, {
    exists: true,
    profile: {}
  }));
  await page.route("**/v1/game-sessions/availability**", route => {
    const supportsDigitalPlay = new URL(route.request().url())
      .searchParams.get("supports_digital_play") !== "false";
    return fulfillJson(route, 200, {
      status: "ok",
      current_session: left ? null : session,
      active_sessions: [summary],
      discoverable_sessions: [],
      created_sessions: left ? [summary] : [],
      participating_sessions: left ? [] : [summary],
      open_sessions: [],
      can_start_free_game: left && supportsDigitalPlay
    });
  });
  await page.route(`**/v1/game-sessions/${sessionId}/leave`, async route => {
    stats.leaveCalls += 1;
    left = true;
    await fulfillJson(route, 200, {
      status: "left",
      participation_status: "none",
      session: summary
    });
  });
  await page.route(`**/v1/game-sessions/${sessionId}/runtime**`, route => fulfillJson(route, 200, {
    contract_version: "1.0",
    session_id: sessionId,
    status: "running",
    revision: 1,
    snapshot_revision: 0,
    membership_revision: 1,
    snapshot: null,
    snapshot_updated_at: "2026-08-27T10:00:00Z",
    server_time: "2026-08-27T10:00:01Z",
    controller_member_id: "member-other-controller",
    controller_lease_expires_at: "2026-08-27T10:01:31Z",
    is_controller: false,
    human_role_ids: ["operations"],
    pending_commands: [],
    applied_command_ids: [],
    command_results: [],
    participation_status: "active",
    queue_position: null,
    telemetry_backlog_count: 0
  }));
  return stats;
}

test("actieve sessie en stopactie blijven compacte bovenbalkknoppen", async ({ page }, testInfo) => {
  const stats = await mockRunningSession(
    page,
    testInfo.project.name === "mobile-chromium" ? "physical" : "digital"
  );
  await page.goto("/");
  await page.locator("body.auth-authenticated").waitFor();

  const topbar = page.locator(".topbar.game-menu");
  const mount = page.locator("#playerSessionMetricMount");
  const controls = page.locator("#topSessionControls");
  const statusButton = page.locator("#topSessionStatusButton");
  const stopButton = page.locator("#topSessionStopButton");
  const statusTooltip = page.locator("#topSessionStatusTooltip");
  const stopTooltip = page.locator("#topSessionStopTooltip");

  await expect(controls).toBeVisible();
  await expect(statusButton).toBeVisible();
  await expect(statusButton).toContainText("Operations");
  await expect(stopButton).toBeVisible();
  await expect(stopButton).toHaveAttribute("aria-label", "Stoppen met spelen");
  await expect(page.locator("#playerSessionPanel")).toBeHidden();
  await expect(mount.locator("#playerSessionPanel")).toHaveCount(0);
  await expect(page.locator(".topbar .active-game-card")).toHaveCount(0);

  const initialTooltipState = await statusTooltip.evaluate(element => ({
    opacity: getComputedStyle(element).opacity,
    visibility: getComputedStyle(element).visibility
  }));
  expect(initialTooltipState).toEqual({ opacity: "0", visibility: "hidden" });
  await statusButton.hover();
  await expect(statusTooltip).toHaveCSS("visibility", "visible");
  await expect(statusTooltip).toContainText("Gesloten sessie");
  await expect(statusTooltip).toContainText("1/7 mensen");
  await expect(statusTooltip).toContainText("6 agents");
  await expect(statusTooltip).toContainText("Jij neemt deel");

  await statusButton.focus();
  await expect(statusTooltip).toHaveCSS("visibility", "visible");
  await statusButton.press("Enter");
  if (testInfo.project.name === "mobile-chromium") {
    await expect(page.locator("#playerWorkbench")).toBeVisible();
    await expect(page.locator("#managerWorkbench")).toBeHidden();
    await expect(page.locator(".app-view-switcher [data-main-menu-tab]:visible")).toHaveCount(0);
    expect(await page.evaluate(() => ({
      appView: window.LEARNGameOMSimulator.getStateSnapshot().appView,
      storedAppView: sessionStorage.getItem("learngame.om.appView")
    }))).toEqual({ appView: "player", storedAppView: "player" });
  } else {
    await expect(page.locator("#managerWorkbench")).toBeVisible();
    await expect(page.locator('button[data-manager-tab="session"]')).toHaveClass(/is-active/);
    await expect(page.locator("#managerSessionContent .active-game-card")).toHaveCount(1);
    await page.locator("#playerViewButton").click();
  }
  await stopButton.focus();
  await expect(stopTooltip).toHaveCSS("visibility", "visible");

  const layout = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    const topbarBounds = rect(".topbar.game-menu");
    const mountBounds = rect("#playerSessionMetricMount");
    const controlsBounds = rect("#topSessionControls");
    const statusBounds = rect("#topSessionStatusButton");
    const stopBounds = rect("#topSessionStopButton");
    const metricsBounds = rect(".metric-strip-values");
    const metricButtonBounds = [...document.querySelectorAll(".metric-strip-values > *")]
      .filter(element => getComputedStyle(element).display !== "none")
      .map(element => element.getBoundingClientRect());
    const mainBounds = rect("#playerWorkbench");
    const contained = (inner, outer) => inner.left >= outer.left - 0.5
      && inner.right <= outer.right + 0.5
      && inner.top >= outer.top - 0.5
      && inner.bottom <= outer.bottom + 0.5;
    const overlaps = (left, right) => left.left < right.right
      && left.right > right.left
      && left.top < right.bottom
      && left.bottom > right.top;
    return {
      statusSize: [statusBounds.width, statusBounds.height],
      stopSize: [stopBounds.width, stopBounds.height],
      mountInsideTopbar: contained(mountBounds, topbarBounds),
      controlsInsideMount: contained(controlsBounds, mountBounds),
      metricsStartAtLeft: metricButtonBounds.length === 0
        || metricButtonBounds[0].left >= metricsBounds.left - 0.5,
      metricsInsideRow: metricButtonBounds.every(bounds => contained(bounds, metricsBounds)),
      metricsBounds: [metricsBounds.left, metricsBounds.right, metricsBounds.width],
      metricButtonBounds: metricButtonBounds.map(bounds => [bounds.left, bounds.right, bounds.width]),
      metricsScrollLeft: document.querySelector(".metric-strip-values").scrollLeft,
      overlapsMetrics: overlaps(controlsBounds, metricsBounds),
      overlapsMain: overlaps(controlsBounds, mainBounds),
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    };
  });
  expect(layout.statusSize[0]).toBeGreaterThanOrEqual(44);
  expect(layout.statusSize[1]).toBeGreaterThanOrEqual(44);
  expect(layout.stopSize[0]).toBeGreaterThanOrEqual(44);
  expect(layout.stopSize[1]).toBeGreaterThanOrEqual(44);
  expect(layout.mountInsideTopbar).toBe(true);
  expect(layout.controlsInsideMount).toBe(true);
  expect(layout.metricsStartAtLeft).toBe(true);
  expect(layout.metricsInsideRow, JSON.stringify(layout)).toBe(true);
  expect(layout.metricsScrollLeft).toBe(0);
  expect(layout.overlapsMetrics).toBe(false);
  expect(layout.overlapsMain).toBe(false);
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);

  await page.mouse.move(1, 1);
  await page.evaluate(() => document.activeElement?.blur());
  await expect(statusTooltip).toHaveCSS("visibility", "hidden");
  await expect(stopTooltip).toHaveCSS("visibility", "hidden");
  await topbar.screenshot({ path: testInfo.outputPath("compact-session-controls.png") });
  await stopButton.click();
  await expect.poll(() => stats.leaveCalls).toBe(1);
  await expect(controls).toBeHidden();
  await expect(page.locator("#playerSessionPanel")).toBeVisible();
});
