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

  var loaderReady = loadSdkLoader().then(function () {
    return window.LeerpretSDK.Loader.create({ base: apiBase, fetch: nativeFetch });
  });
  window.LeerpretSDKLoaderReady = loaderReady;

  var componentsReady = loaderReady.then(function (loader) {
    return loader.load(["api-client", "leerobject", "lego-spatial"]);
  });
  window.LeerpretSDKComponentsReady = componentsReady;

  var ready = componentsReady
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
        var tracker = window.LeerpretSDK.createLeerobjectTracker({
          client: client,
          leerboxId: LEERBOX_ID,
          namespace: "lom",
          rootIds: ["leerbox-learngame-operations-management", LEERBOX_ID],
          defaultPersonId: "lom-anonymous",
          version: "ICG2-v2"
        });
        var bridge = {
          client: client,
          runtime: runtime,
          leerboxId: LEERBOX_ID,
          track: tracker.track
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
