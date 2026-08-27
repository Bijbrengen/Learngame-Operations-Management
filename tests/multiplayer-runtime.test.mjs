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

  assert.equal(await fetchOffline("multiplayer-runtime.js?v=20260827.1"), scriptResponse);
  assert.equal(await fetchOffline("missing.js?v=1"), errorResponse);
  assert.equal(await fetchOffline("route", "navigate"), indexResponse);
  assert.ok(matchCalls.some(call => call.options?.ignoreSearch === true));
});
