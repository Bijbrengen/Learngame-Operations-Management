import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

globalThis.window = {
  setInterval,
  clearInterval
};
await import("../runtime-role-contract.js");
await import("../logistics-game-engine.js");

const { LogisticsGameEngine, ROLE_STATES } = window.LogisticsGameEngine;
const runtimeRoles = window.LOMRuntimeRoles;

function testEngine(initialNow = 1_000) {
  let now = initialNow;
  let timerId = 0;
  const engine = new LogisticsGameEngine({
    now: () => now,
    random: () => 0.25,
    timers: {
      setInterval: () => ++timerId,
      clearInterval: () => {}
    }
  });
  return {
    engine,
    setNow(value) { now = value; }
  };
}

test("menselijke multiplayerrollen worden niet door lokale agents uitgevoerd", () => {
  const clock = testEngine();
  const { engine } = clock;
  engine.start({
    humanRoleId: "customer",
    humanRoleIds: ["customer", "operations"],
    customerOrderMode: "required",
    productionProcesses: ["sequential"]
  });

  const order = engine.generateOrder();
  engine.updateRole("customer", 1_000);
  assert.equal(engine.roleRuntime.customer.state, ROLE_STATES.AWAITING_PLAYER);
  assert.equal(engine.playerTask("customer").order.id, order.id);

  const customerResult = engine.completePlayerAction({ customerOrder: {} }, "customer");
  assert.equal(customerResult.ok, true);
  const storedOrder = engine.orders.get(order.id);
  assert.equal(
    storedOrder.history.filter(item => item.roleId === "customer").length,
    1
  );
  assert.equal(
    storedOrder.history.filter(item => item.label === "Klantorder geplaatst").length,
    1
  );
  const customerTransferAt = engine.roleRuntime.customer.transfersAt;
  clock.setNow(customerTransferAt);
  engine.updateRole("customer", customerTransferAt);
  engine.updateRole("operations", customerTransferAt);

  // Plaatsing, rolafronding en de atomische batchoverdracht zijn drie geldige
  // lifecycle-events van dezelfde rol. Exactly-once wordt per eventtype
  // gecontroleerd en niet door alle customer-historyrecords samen te tellen.
  assert.equal(
    storedOrder.history.filter(item => item.roleId === "customer").length,
    3
  );
  assert.equal(
    storedOrder.history.filter(item => item.label === "Klantorder geplaatst").length,
    1
  );
  assert.equal(
    storedOrder.history.filter(item => item.type === "transferred").length,
    1
  );

  assert.equal(engine.roleRuntime.operations.state, ROLE_STATES.AWAITING_PLAYER);
  assert.equal(engine.roleRuntime.operations.completesAt, null);
  assert.equal(engine.playerTask("operations").order.id, order.id);
});

test("een tweede browser herstelt exact dezelfde snapshot met zijn eigen rol", () => {
  const controllerClock = testEngine();
  const controller = controllerClock.engine;
  controller.start({
    humanRoleId: "customer",
    humanRoleIds: ["customer", "operations"],
    customerOrderMode: "required"
  });
  const order = controller.generateOrder();
  controller.updateRole("customer", 1_000);
  controller.completePlayerAction({ customerOrder: {} }, "customer");
  const transferAt = controller.roleRuntime.customer.transfersAt;
  controllerClock.setNow(transferAt);
  controller.updateRole("customer", transferAt);
  controller.updateRole("operations", transferAt);

  const peer = testEngine().engine;
  const restored = peer.restoreSnapshot(controller.snapshot(), {
    humanRoleId: "operations",
    humanRoleIds: ["customer", "operations"],
    runLoop: false
  });

  assert.equal(restored.orders.length, 1);
  assert.equal(restored.orders[0].id, order.id);
  assert.equal(peer.playerTask().role.id, "operations");
  assert.equal(peer.loop.running, false);
  assert.deepEqual(peer.snapshot().humanRoleIds.sort(), ["customer", "operations"]);
});

test("rolvrijgave laat een agent het wachtende werk overnemen", () => {
  const clock = testEngine();
  const { engine } = clock;
  engine.start({
    humanRoleId: "customer",
    humanRoleIds: ["customer", "operations"],
    customerOrderMode: "required"
  });
  engine.generateOrder();
  engine.updateRole("customer", 1_000);
  engine.completePlayerAction({ customerOrder: {} }, "customer");
  const transferAt = engine.roleRuntime.customer.transfersAt;
  clock.setNow(transferAt);
  engine.updateRole("customer", transferAt);
  engine.updateRole("operations", transferAt);
  assert.equal(engine.roleRuntime.operations.state, ROLE_STATES.AWAITING_PLAYER);

  engine.humanRoleId = "customer";
  engine.setHumanRoles(["customer"]);

  assert.equal(engine.roleRuntime.operations.state, ROLE_STATES.PROCESSING);
  assert.ok(engine.roleRuntime.operations.completesAt > transferAt);
  assert.equal(engine.playerTask("operations"), null);
});

test("snapshots bevatten de CAS-kritieke klok- en ordervelden", () => {
  const { engine } = testEngine();
  engine.start({ humanRoleId: "customer", humanRoleIds: ["customer"] });
  engine.generateOrder();
  const snapshot = engine.snapshot();

  assert.equal(typeof snapshot.nextOrderAt, "number");
  assert.equal(snapshot.capturedAt, 1_000);
  assert.equal(typeof snapshot.orderCounter, "number");
  assert.ok(Array.isArray(snapshot.orders));
  assert.ok(Array.isArray(snapshot.humanRoleIds));
});

test("controllerfailover normaliseert deadlines over browserklokken", () => {
  const source = testEngine(1_000);
  source.engine.start({ humanRoleId: "customer", humanRoleIds: ["customer", "operations"] });
  const order = source.engine.generateOrder();
  source.engine.updateRole("customer", 1_000);
  source.engine.completePlayerAction({ customerOrder: {} }, "customer");
  const transferAt = source.engine.roleRuntime.customer.transfersAt;
  source.setNow(transferAt);
  source.engine.updateRole("customer", transferAt);
  source.engine.updateRole("operations", transferAt);
  const sourceRemaining = order.dueAt - transferAt;
  const snapshot = source.engine.snapshot();

  const aheadNow = transferAt + 300_000;
  const ahead = testEngine(aheadNow);
  ahead.engine.restoreSnapshot(snapshot, {
    humanRoleId: "operations",
    humanRoleIds: ["customer", "operations"],
    elapsedSinceSnapshotMs: 500
  });
  assert.equal(
    ahead.engine.orders.get(order.id).dueAt - aheadNow,
    sourceRemaining - 500
  );
  const task = ahead.engine.playerTask("operations");
  ahead.engine.completePlayerAction({
    parts: { ...task.requiredParts },
    transferred: true,
    transfer: ahead.engine.batchTransferDescriptor(task.order, task.role.id),
    signed: true,
    signature: [[{ x: 0, y: 0 }, { x: 1, y: 1 }]]
  }, "operations");
  assert.equal(
    ahead.engine.orders.get(order.id).history.find(item => item.type === "player_handling").handlingTimeMs,
    500
  );

  const behindNow = transferAt - 300_000;
  const behind = testEngine(behindNow);
  behind.engine.restoreSnapshot(snapshot, {
    humanRoleId: "operations",
    humanRoleIds: ["customer", "operations"],
    elapsedSinceSnapshotMs: 500
  });
  assert.equal(
    behind.engine.orders.get(order.id).dueAt - behindNow,
    sourceRemaining - 500
  );
});

test("alle LOM-rollen mappen deterministisch op exact zeven digitale stations", () => {
  const allRoles = [
    "customer", "customer1", "customer2", "customer3", "customer4",
    "logistics_manager", "opr", "operations", "sales", "finance",
    "raw_warehouse", "srm", "supplier",
    "production_1", "production_a", "pd1",
    "production_2", "production_b", "pd2",
    "production_3", "production_c", "pd3",
    "finished_warehouse", "mfp", "ssf", "transporter"
  ];
  allRoles.forEach(roleId => assert.equal(typeof runtimeRoles.stationId(roleId), "string"));
  assert.deepEqual(
    [...new Set(allRoles.map(roleId => runtimeRoles.stationId(roleId)))].sort(),
    ["customer", "operations", "pd1", "pd2", "pd3", "srm", "ssf"]
  );

  const fullLo4 = [
    "customer", "logistics_manager", "sales", "finance", "raw_warehouse",
    "production_a", "production_b", "production_c", "finished_warehouse", "supplier"
  ];
  assert.deepEqual(runtimeRoles.normalize(fullLo4), [
    "customer", "logistics_manager", "raw_warehouse",
    "production_a", "production_b", "production_c", "finished_warehouse"
  ]);
  const analysis = runtimeRoles.analyze([...fullLo4, "unknown-role"]);
  assert.deepEqual(analysis.unknown_role_ids, ["unknown-role"]);
  assert.deepEqual(analysis.collisions.map(item => item.role_id), ["sales", "finance", "supplier"]);
});

test("Entrepreneurship laat een order van twee Toren C-exemplaren door alle drie menselijke bouwstations lopen", () => {
  const sessionRoles = [
    "customer", "sales", "supplier", "production_1", "production_2",
    "production_3", "finished_warehouse"
  ];
  const stationRoles = sessionRoles.map(roleId => runtimeRoles.stationId(roleId));
  assert.equal(new Set(stationRoles).size, 7);

  const clock = testEngine();
  const { engine } = clock;
  engine.start({
    humanRoleId: "customer",
    humanRoleIds: stationRoles,
    gameType: "entrepreneurial",
    organizationModel: "independent_enterprises",
    productionProcesses: ["sequential"],
    customerOrderMode: "free",
    playMode: "digital"
  });

  const order = engine.generateOrder();
  engine.updateRole("customer", 1_000);
  assert.equal(engine.completePlayerAction({
    customerOrder: { productId: "C", quantity: 2, dueMinutes: 10 }
  }, "customer").ok, true);

  const expectedPartsByBuilder = {
    pd1: { base_green: 2, white_8: 4 },
    pd2: { blue_4: 2 },
    pd3: { red_4: 2 }
  };
  const handledRoles = [];
  let previousRoleId = "customer";
  for (const roleId of stationRoles.slice(1)) {
    const transferAt = engine.roleRuntime[previousRoleId].transfersAt;
    clock.setNow(transferAt);
    engine.updateRole(previousRoleId, transferAt);
    engine.updateRole(roleId, transferAt);

    const task = engine.playerTask(roleId);
    assert.equal(task.order.id, order.id);
    assert.equal(task.order.productId, "C");
    assert.equal(task.order.quantity, 2);
    if (expectedPartsByBuilder[roleId]) {
      assert.deepEqual(task.requiredParts, expectedPartsByBuilder[roleId]);
    }
    const result = engine.completePlayerAction({
      parts: { ...task.requiredParts },
      completedQuantity: task.order.quantity,
      transferred: true,
      transfer: engine.batchTransferDescriptor(task.order, task.role.id),
      signed: true,
      signature: [[{ x: 0, y: 0 }, { x: 2, y: 2 }]]
    }, roleId);
    assert.equal(result.ok, true, `${roleId}: ${result.errors.join(" ")}`);
    handledRoles.push(roleId);
    previousRoleId = roleId;
  }

  const deliveredAt = engine.roleRuntime.ssf.transfersAt;
  clock.setNow(deliveredAt);
  engine.updateRole("ssf", deliveredAt);
  const delivered = engine.orders.get(order.id);
  assert.equal(delivered.status, "DELIVERED");
  assert.deepEqual(
    handledRoles.filter(roleId => roleId.startsWith("pd")),
    ["pd1", "pd2", "pd3"]
  );
  assert.deepEqual(
    delivered.history
      .filter(item => item.type === "player_handling")
      .map(item => item.roleId),
    ["operations", "srm", "pd1", "pd2", "pd3", "ssf"]
  );
});

test("een identieke menselijke rollenset veroorzaakt geen runtime-write-event", () => {
  const { engine } = testEngine();
  engine.start({ humanRoleId: "customer", humanRoleIds: ["customer", "operations"] });
  const eventTypes = [];
  const unsubscribe = engine.subscribe(event => eventTypes.push(event.type));
  engine.setHumanRoles(["operations", "customer"]);
  unsubscribe();
  assert.deepEqual(eventTypes, []);
});

test("snapshotrestore verzoent agent- en mensownership in beide richtingen", () => {
  const first = testEngine();
  first.engine.start({
    humanRoleId: "customer",
    humanRoleIds: ["customer", "operations"],
    customerOrderMode: "required"
  });
  first.engine.generateOrder();
  first.engine.updateRole("customer", 1_000);
  first.engine.completePlayerAction({ customerOrder: {} }, "customer");
  const transferAt = first.engine.roleRuntime.customer.transfersAt;
  first.setNow(transferAt);
  first.engine.updateRole("customer", transferAt);
  first.engine.updateRole("operations", transferAt);
  assert.equal(first.engine.roleRuntime.operations.state, ROLE_STATES.AWAITING_PLAYER);

  const agentOwner = testEngine().engine;
  agentOwner.restoreSnapshot(first.engine.snapshot(), {
    humanRoleId: "customer",
    humanRoleIds: ["customer"],
    runLoop: false
  });
  assert.equal(agentOwner.roleRuntime.operations.state, ROLE_STATES.PROCESSING);
  assert.ok(agentOwner.roleRuntime.operations.completesAt !== null);

  const humanOwner = testEngine().engine;
  humanOwner.restoreSnapshot(agentOwner.snapshot(), {
    humanRoleId: "operations",
    humanRoleIds: ["customer", "operations"],
    runLoop: false
  });
  assert.equal(humanOwner.roleRuntime.operations.state, ROLE_STATES.AWAITING_PLAYER);
  assert.equal(humanOwner.roleRuntime.operations.completesAt, null);
});

test("ticks markeren alleen werkelijk synchroniseerbare statuswijzigingen", () => {
  const clock = testEngine();
  const events = [];
  clock.engine.start({ humanRoleId: "customer", humanRoleIds: ["customer"] });
  clock.engine.nextOrderAt = Number.MAX_SAFE_INTEGER;
  const unsubscribe = clock.engine.subscribe(event => {
    if (event.type === "tick") events.push(event.detail.synchronizationChanged);
  });
  clock.engine.update(1_000);
  assert.equal(events.at(-1), false);

  clock.engine.nextOrderAt = 1_001;
  clock.setNow(1_001);
  clock.engine.update(1_001);
  assert.equal(events.at(-1), true);
  unsubscribe();
});

test("mobiele digitale deelname start geen poll of gedeelde runtime", async () => {
  const source = readFileSync(new URL("../multiplayer-runtime.js", import.meta.url), "utf8");
  const handlers = {};
  const storage = new Map();
  let fetchCount = 0;
  let intervalCount = 0;
  const localStorageStub = {
    get length() { return storage.size; },
    key: index => [...storage.keys()][index] ?? null,
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  const windowStub = {
    addEventListener: (type, handler) => { handlers[type] = handler; },
    LeerpretAuth: { getSession: () => ({ apiBase: "https://engine.test" }) },
    LOMDeviceCapabilities: {
      current: () => ({ supportsDigitalPlay: false }),
      supportsSession: playMode => playMode === "physical"
    },
    LEARNGameOMSimulator: { stopSharedGame: () => {} }
  };
  vm.runInNewContext(source, {
    window: windowStub,
    document: { addEventListener: () => {}, visibilityState: "visible" },
    localStorage: localStorageStub,
    sessionStorage: localStorageStub,
    crypto: { randomUUID: () => "runtime-test-id" },
    fetch: async () => {
      fetchCount += 1;
      throw new Error("Een geblokkeerde runtime mag geen request doen.");
    },
    setInterval: () => {
      intervalCount += 1;
      return intervalCount;
    },
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    CustomEvent: class CustomEvent {},
    console,
    Date,
    Math,
    Promise,
    Set,
    Map,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Error,
    Uint8Array,
    encodeURIComponent
  });

  await windowStub.LOMMultiplayerRuntime.handleSessionStarted({
    session_id: "session-mobile-digital",
    status: "running",
    participation_status: "active",
    current_member_id: "member-mobile",
    game_config: { play_mode: "digital" }
  });

  assert.equal(fetchCount, 0);
  assert.equal(intervalCount, 0);
  assert.equal(windowStub.LOMMultiplayerRuntime.getState().sessionId, null);
});

test("service-worker cache en registerbusterversie dekken de multiplayerruntime", () => {
  const serviceWorker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
  const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");
  const cacheVersion = serviceWorker.match(/CACHE_VERSION\s*=\s*"([^"]+)"/)?.[1];
  const registerVersion = script.match(/service-worker\.js\?v=([^"']+)/)?.[1];
  assert.equal(registerVersion, cacheVersion);
  assert.match(serviceWorker, /"\.\/multiplayer-runtime\.js"/);
  assert.match(serviceWorker, /"\.\/runtime-role-contract\.js"/);
  assert.match(serviceWorker, /caches\.match\(event\.request, \{ ignoreSearch: true \}\)/);
  assert.match(serviceWorker, /event\.request\.mode === "navigate"/);
  assert.doesNotMatch(serviceWorker, /cached \|\| caches\.match\("\.\/index\.html"\)/);
});

test("service-worker levert offline de geversioneerde JS en gebruikt HTML alleen voor navigatie", async () => {
  const source = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
  const handlers = {};
  const scriptResponse = { kind: "script" };
  const indexResponse = { kind: "index" };
  const errorResponse = { kind: "error" };
  const matchCalls = [];
  vm.runInNewContext(source, {
    URL,
    Promise,
    Response: { error: () => errorResponse },
    fetch: async () => { throw new Error("offline"); },
    caches: {
      open: async () => ({ addAll: async () => {}, put: async () => {} }),
      keys: async () => [],
      delete: async () => true,
      match: async (request, options) => {
        matchCalls.push({ request, options });
        const target = typeof request === "string" ? request : request.url;
        if (String(target).includes("multiplayer-runtime.js")) return scriptResponse;
        if (target === "./index.html") return indexResponse;
        return null;
      }
    },
    self: {
      addEventListener: (type, handler) => { handlers[type] = handler; },
      skipWaiting: async () => {},
      clients: { claim: async () => {} }
    }
  });

  async function fetchOffline(path, mode = "same-origin") {
    let responsePromise;
    handlers.fetch({
      request: { method: "GET", url: `https://example.test/${path}`, mode },
      respondWith: promise => { responsePromise = promise; }
    });
    return responsePromise;
  }

  assert.equal(await fetchOffline("multiplayer-runtime.js?v=20260828.1"), scriptResponse);
  assert.equal(await fetchOffline("missing.js?v=1"), errorResponse);
  assert.equal(await fetchOffline("route", "navigate"), indexResponse);
  assert.ok(matchCalls.some(call => call.options?.ignoreSearch === true));
});
