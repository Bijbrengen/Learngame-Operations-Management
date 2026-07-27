(function () {
  "use strict";
  var nativeFetch = window.fetch.bind(window);
  var apiBase = String(window.LEARNGAME_OM_CONFIG.apiBase || "").replace(/\/+$/, "");
  var ready = nativeFetch(apiBase + "/sdk/manifest.json", { credentials: "include" })
    .then(function (response) {
      if (!response.ok) throw new Error("LeerpretSDK-manifest niet beschikbaar");
      return response.json();
    })
    .then(function (manifest) {
      var component = manifest.components["api-client"];
      return new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = apiBase + "/sdk/api-client/client.js?v=" + encodeURIComponent(manifest.version);
        script.integrity = component.integrity["client.js"];
        script.crossOrigin = "anonymous";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    })
    .then(function () {
      var client = window.LeerpretSDK.create({
        apiBase: apiBase,
        clientId: "learngame-om",
        fetch: nativeFetch
      });
      return client.bootstrap().then(function () { return client; });
    });

  window.LeerpretSDKReady = ready;
  window.fetch = function (input, options) {
    var url = typeof input === "string" ? input : input.url;
    if (url.indexOf(apiBase) !== 0 || url.indexOf(apiBase + "/sdk/") === 0) {
      return nativeFetch(input, options);
    }
    return ready.then(function (client) { return client.request(url, options || {}); });
  };
})();
