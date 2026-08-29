import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("../leerpret-sdk.js", import.meta.url),
  "utf8"
);

test("LOM configureert en gebruikt de generieke SDK-leerobjecttracker zonder lokale eventvertaling", async () => {
  const calls = {
    loader: [],
    load: [],
    createClient: [],
    tracker: [],
    track: [],
    events: []
  };
  const runtime = { id: "learngame-operations-management", version: "ICG2-v2" };
  const client = {
    bootstrap: async () => client,
    get: async path => {
      assert.equal(path, "/leerbox-runtime/learngame-operations-management");
      return runtime;
    },
    request: async () => ({ ok: true })
  };
  const trackedResult = Object.freeze({ accepted: true });
  const tracker = {
    track(record) {
      calls.track.push(record);
      return Promise.resolve(trackedResult);
    }
  };
  const context = {
    console,
    LEARNGAME_OM_CONFIG: { apiBase: "https://engine.example/api/" },
    fetch: async () => ({ ok: true }),
    document: {
      createElement: () => ({}),
      head: { appendChild: script => script.onload() }
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    dispatchEvent(event) {
      calls.events.push(event);
    }
  };
  context.window = context;
  context.globalThis = context;
  context.LeerpretSDK = {
    Loader: {
      create(options) {
        calls.loader.push(options);
        return {
          async load(components) {
            calls.load.push(components);
          }
        };
      }
    },
    create(options) {
      calls.createClient.push(options);
      return client;
    },
    createLeerobjectTracker(options) {
      calls.tracker.push(options);
      return tracker;
    }
  };

  vm.runInNewContext(source, context, { filename: "leerpret-sdk.js" });
  const bridge = await context.LeerpretSDKReady;
  const record = Object.freeze({
    actionType: "order-delivered",
    learningObjectID: "warehouse",
    sessionID: "session-1"
  });
  const result = await bridge.track(record);

  assert.equal(result, trackedResult);
  assert.equal(bridge.client, client);
  assert.equal(bridge.runtime, runtime);
  assert.equal(bridge.leerboxId, "learngame-operations-management");
  assert.deepEqual(Array.from(calls.load[0]), ["api-client", "leerobject", "lego-spatial"]);
  assert.equal(calls.tracker.length, 1);
  assert.equal(calls.tracker[0].client, client);
  assert.deepEqual(
    {
      leerboxId: calls.tracker[0].leerboxId,
      namespace: calls.tracker[0].namespace,
      rootIds: Array.from(calls.tracker[0].rootIds),
      defaultPersonId: calls.tracker[0].defaultPersonId,
      version: calls.tracker[0].version
    },
    {
      leerboxId: "learngame-operations-management",
      namespace: "lom",
      rootIds: ["leerbox-learngame-operations-management", "learngame-operations-management"],
      defaultPersonId: "lom-anonymous",
      version: "ICG2-v2"
    }
  );
  assert.equal(calls.track[0], record);
  assert.equal(calls.events[0].type, "learngame-om-sdk-ready");
  assert.equal(calls.events[0].detail.runtime, runtime);

  assert.doesNotMatch(source, /function slug\(/);
  assert.doesNotMatch(source, /function roleFor\(/);
  assert.doesNotMatch(source, /function objectIdFor\(/);
  assert.doesNotMatch(source, /var instances = new Map\(\)/);
  assert.doesNotMatch(source, /SelfStartingLeerobject|SuccesLeerobject|WeerstandLeerobject|OverigLeerobject/);
});
