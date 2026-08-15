(function() {
  var endpoints = Object.freeze({
    "localApiBase": "http://127.0.0.1:47111/api",
    "localAppUrl": "http://127.0.0.1:47113/",
    "productionApiBase": "https://api.leerpretpark.nl/api",
    "productionAppUrl": "https://bijbrengen.github.io/Learngame-Operations-Management/"
  });
  var isLocal = typeof window !== "undefined" && (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  );
  window.LEARNGAME_OM_CONFIG = Object.freeze({
    apiBase: isLocal ? endpoints.localApiBase : endpoints.productionApiBase,
    appUrl: isLocal ? endpoints.localAppUrl : endpoints.productionAppUrl
  });
})();
