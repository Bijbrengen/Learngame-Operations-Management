(function () {
  "use strict";

  var LEERBOX_ID = "learngame-operations-management";
  var nativeFetch = window.fetch.bind(window);
  var apiBase = String(window.LEARNGAME_OM_CONFIG.apiBase || "").replace(/\/+$/, "");

  function loadSdkLoader() {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = apiBase + "/sdk/sdk-loader/loader.js";
      script.onload = resolve;
      script.onerror = function () { reject(new Error("LeerpretSDK-loader kon niet laden")); };
      document.head.appendChild(script);
    });
  }

  function slug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "interaction";
  }

  function roleFor(record) {
    var explicit = String(record.objectRole || record.object_role || "").toLowerCase();
    if (["self-starting", "self_starting", "starter"].indexOf(explicit) !== -1) return "self-starting";
    if (["success", "succes", "completion", "outcome"].indexOf(explicit) !== -1) return "success";
    if (["resistance", "weerstand", "friction", "blocked"].indexOf(explicit) !== -1) return "resistance";
    var result = String(record.result || "").toLowerCase();
    if (["success", "completed", "accepted", "delivered", "done"].indexOf(result) !== -1) return "success";
    if (["blocked", "rejected", "delayed", "failed", "opportunity_cost"].indexOf(result) !== -1) return "resistance";
    var action = slug(record.actionType);
    if (/^(session-start|game-start|tutorial-start|start-session|resume-session)/.test(action)) return "self-starting";
    if (/(complete|accepted|delivered|success)$/.test(action)) return "success";
    if (/(disruption|blocked|rejected|failure|delay)/.test(action)) return "resistance";
    return "other";
  }

  function objectIdFor(record) {
    var candidate = record.learningObjectID || record.leerobject_id || record.stage || record.screen || record.partId || record.productType;
    var normalized = slug(candidate);
    if (normalized === "leerbox-learngame-operations-management" || normalized === LEERBOX_ID) {
      normalized = "interface." + slug(record.actionType);
    }
    return normalized.indexOf("lom.") === 0 ? normalized : "lom." + normalized;
  }

  var ready = loadSdkLoader()
    .then(function () {
      return window.LeerpretSDK.Loader.create({ base: apiBase, fetch: nativeFetch }).load(["api-client", "leerobject"]);
    })
    .then(function () {
      var client = window.LeerpretSDK.create({
        apiBase: apiBase,
        clientId: "learngame-om",
        fetch: nativeFetch
      });
      return client.bootstrap().then(function () { return client; });
    })
    .then(function (client) {
      return client.get("/leerbox-runtime/" + LEERBOX_ID).then(function (runtime) {
        var classes = {
          "self-starting": window.LeerpretSDK.SelfStartingLeerobject,
          success: window.LeerpretSDK.SuccesLeerobject,
          resistance: window.LeerpretSDK.WeerstandLeerobject,
          other: window.LeerpretSDK.OverigLeerobject
        };
        var instances = new Map();
        var bridge = {
          client: client,
          runtime: runtime,
          leerboxId: LEERBOX_ID,
          track: function (record) {
            var role = roleFor(record || {});
            var leerobjectId = objectIdFor(record || {});
            var personId = String(record.personID || record.person_id || "lom-anonymous");
            var key = [personId, leerobjectId, role].join("|");
            if (!instances.has(key)) {
              var Type = classes[role] || classes.other;
              instances.set(key, new Type({
                client: client,
                personId: personId,
                leerboxId: LEERBOX_ID,
                leerobjectId: leerobjectId
              }));
            }
            return instances.get(key).interact(record.actionType || "interaction", {
              timestamp: record.timestamp || new Date().toISOString(),
              session_id: record.sessionID || null,
              simulated_minute: record.simulatedMinute,
              result: record.result || null,
              stage: record.stage == null ? null : String(record.stage),
              version: record.version || "ICG2-v2"
            });
          }
        };
        window.LEARNGameOMSDK = Object.freeze(bridge);
        window.dispatchEvent(new CustomEvent("learngame-om-sdk-ready", { detail: { runtime: runtime } }));
        return bridge;
      });
    });

  window.LeerpretSDKReady = ready;
  window.fetch = function (input, options) {
    var url = typeof input === "string" ? input : input.url;
    if (url.indexOf(apiBase) !== 0 || url.indexOf(apiBase + "/sdk/") === 0) {
      return nativeFetch(input, options);
    }
    return ready.then(function (bridge) { return bridge.client.request(url, options || {}); });
  };
})();
