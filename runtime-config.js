(function() {
  var isLocal = typeof window !== "undefined" && (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  );
  var tunnelUrl = "https://intent-carries-travelers-media.trycloudflare.com/api";

  window.LEARNGAME_OM_CONFIG = Object.freeze({
    "apiBase": isLocal ? "http://127.0.0.1:47111/api" : tunnelUrl,
    "appUrl": isLocal ? "http://127.0.0.1:47113/" : "https://bijbrengen.github.io/Learngame-Operations-Management/",
    "dashboardUrl": isLocal ? "http://127.0.0.1:47112/" : "https://bijbrengen.github.io/LeerpretDashboard/",
    "editorUrl": "http://127.0.0.1:47114/"
  });
})();
