(() => {
  "use strict";

  const LEERBOX_ID = "learngame-operations-management";
  const STORAGE_API = "leerpret.apiBase";
  const state = {
    apiBase: "",
    authenticated: false,
    user: null,
    roles: [],
    online: false,
    googleInitialized: false,
    googleCodeClient: null
  };

  function loopbackHost(hostname) {
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(String(hostname || "").toLowerCase());
  }

  function localApiForCurrentPage() {
    const pageHost = location.hostname || "127.0.0.1";
    const formattedHost = pageHost.includes(":") && !pageHost.startsWith("[")
      ? `[${pageHost}]`
      : pageHost;
    const protocol = location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${formattedHost}:8011/api`;
  }

  function alignStoredLoopbackHost(value) {
    if (!value || !loopbackHost(location.hostname)) return value;
    try {
      const url = new URL(String(value), location.origin);
      if (!loopbackHost(url.hostname) || url.hostname === location.hostname) return value;
      url.hostname = location.hostname;
      return url.toString().replace(/\/+$/, "");
    } catch {
      return value;
    }
  }

  function normalizedApiBase(value) {
    const fallback = location.pathname.startsWith("/tools/leerbox/")
      ? `${location.origin}/api`
      : localApiForCurrentPage();
    try {
      const url = new URL(String(value || fallback).trim(), location.origin);
      return ["http:", "https:"].includes(url.protocol)
        ? url.toString().replace(/\/+$/, "")
        : fallback;
    } catch {
      return fallback;
    }
  }

  function resolveApiBase() {
    const params = new URLSearchParams(location.search);
    const explicitApi = params.get("api");
    const rememberedApi = localStorage.getItem("api_base") || localStorage.getItem(STORAGE_API);
    state.apiBase = normalizedApiBase(
      explicitApi || alignStoredLoopbackHost(rememberedApi)
    );
    localStorage.setItem("api_base", state.apiBase);
    localStorage.setItem(STORAGE_API, state.apiBase);
    if (params.has("api")) {
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete("api");
      history.replaceState({}, "", cleanUrl);
    }
  }

  async function parseError(response) {
    try {
      const payload = await response.json();
      return typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail || payload);
    } catch {
      return response.text().catch(() => `${response.status} ${response.statusText}`);
    }
  }

  async function request(path, options = {}) {
    const response = await fetch(`${state.apiBase}${path}`, {
      cache: "no-store",
      credentials: "include",
      ...options
    });
    if (!response.ok) {
      const error = new Error(await parseError(response));
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  function elements() {
    return {
      gate: document.getElementById("leerpretAuthGate"),
      message: document.getElementById("leerpretAuthMessage"),
      googleMount: document.getElementById("leerpretGoogleSignIn"),
      statusButton: document.getElementById("leerpretAuthStatus")
    };
  }

  function roleLabels() {
    const labels = [];
    if (state.roles.includes("learner")) labels.push("Lerende");
    if (state.roles.includes("attraction")) labels.push("Leerattractie");
    return labels;
  }

  function announceSession() {
    window.dispatchEvent(new CustomEvent("leerpret-auth-changed", {
      detail: {
        authenticated: state.authenticated,
        online: state.online,
        user: state.user ? { ...state.user } : null,
        roles: [...state.roles],
        apiBase: state.apiBase
      }
    }));
  }

  function acceptSession(payload) {
    state.online = true;
    state.authenticated = Boolean(payload.authenticated);
    state.user = payload.user || null;
    state.roles = Array.isArray(payload.roles)
      ? payload.roles.filter(role => role === "learner" || role === "attraction")
      : [];
    if (!state.authenticated || !state.roles.includes("learner")) {
      throw new Error("De Lerende-rol ontbreekt in deze sessie.");
    }
    renderAuthenticated();
  }

  function renderAuthenticated() {
    const els = elements();
    document.body.classList.remove("auth-pending", "auth-required");
    document.body.classList.add("auth-authenticated");
    if (els.gate) els.gate.hidden = true;
    if (els.statusButton) {
      const identity = state.user?.label || "Aangemeld";
      els.statusButton.textContent = `${identity} · ${roleLabels().join(" + ") || "Lerende"}`;
      els.statusButton.classList.add("is-authenticated");
      els.statusButton.title = "Klik om af te melden";
      els.statusButton.disabled = false;
    }
    announceSession();
  }

  function renderRequired(message, online = state.online) {
    const els = elements();
    document.body.classList.remove("auth-pending", "auth-authenticated");
    document.body.classList.add("auth-required");
    if (els.gate) els.gate.hidden = false;
    if (els.message) {
      els.message.textContent = message || "Meld je met Google aan om de LO-game te openen.";
      els.message.className = `auth-message ${online ? "is-info" : "is-error"}`;
    }
    if (els.statusButton) {
      els.statusButton.textContent = online ? "Niet aangemeld" : "Service offline";
      els.statusButton.classList.remove("is-authenticated");
      els.statusButton.title = online ? "Meld je aan in dit venster" : "De Leerpret-service is niet bereikbaar";
      els.statusButton.disabled = true;
    }
    announceSession();
    if (online) initializeGoogleSignIn();
  }

  async function waitForGoogleLibrary() {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (window.google?.accounts?.oauth2) return window.google.accounts.oauth2;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("De Google-aanmeldknop kon niet worden geladen.");
  }

  async function handleGoogleCode(response) {
    const els = elements();
    const scopes = new Set(String(response.scope || "").split(/\s+/).filter(Boolean));
    if (!response.code || !scopes.has("openid") || scopes.has("email") || scopes.has("profile")) {
      renderRequired("Google gaf niet de afgesproken minimale aanmeldrechten terug.", true);
      return;
    }
    if (els.message) {
      els.message.textContent = "Pseudonieme accountkoppeling controleren…";
      els.message.className = "auth-message is-info";
    }
    try {
      await request("/auth/leerbox/google-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XmlHttpRequest"
        },
        body: JSON.stringify({
          code: response.code,
          leerbox_id: LEERBOX_ID,
          redirect_uri: location.origin
        })
      });
      // Do not trust only the login response: verify that the browser actually
      // retained and returns the restricted HttpOnly cookie.
      const confirmed = await request(
        `/auth/leerbox/session?leerbox_id=${encodeURIComponent(LEERBOX_ID)}`
      );
      acceptSession(confirmed);
    } catch (error) {
      renderRequired(
        error.status === 401
          ? "De browser kon de LO-sessie niet bewaren. Open de game en backend via dezelfde hostnaam (bijvoorbeeld beide via localhost) en meld opnieuw aan."
          : error.message || "Aanmelden met Google is niet gelukt.",
        true
      );
    }
  }

  async function initializeGoogleSignIn() {
    if (state.googleInitialized) return;
    const els = elements();
    if (!els.googleMount) return;
    state.googleInitialized = true;
    try {
      const config = await request("/auth/google/config");
      if (!config.enabled || !config.client_id) {
        throw new Error("Google Sign-In is nog niet geconfigureerd op de Leerpret-backend.");
      }
      const googleOAuth = await waitForGoogleLibrary();
      state.googleCodeClient = googleOAuth.initCodeClient({
        client_id: config.client_id,
        scope: "openid",
        include_granted_scopes: false,
        ux_mode: "popup",
        select_account: true,
        callback: handleGoogleCode,
        error_callback: () => renderRequired("De Google-aanmelding is afgebroken.", true)
      });
      const button = document.createElement("button");
      button.type = "button";
      button.className = "google-minimal-login-button";
      button.textContent = "Pseudoniem aanmelden met Google";
      button.addEventListener("click", () => state.googleCodeClient?.requestCode());
      els.googleMount.replaceChildren(button);
    } catch (error) {
      state.googleInitialized = false;
      if (els.message) {
        els.message.textContent = error.message || "Google Sign-In kon niet worden gestart.";
        els.message.className = "auth-message is-error";
      }
    }
  }

  async function checkSession() {
    try {
      const payload = await request(`/auth/leerbox/session?leerbox_id=${encodeURIComponent(LEERBOX_ID)}`);
      acceptSession(payload);
      return true;
    } catch (sessionError) {
      if (sessionError.status !== 401) {
        state.online = false;
        renderRequired("De Leerpret-service is niet bereikbaar. Start de backend en probeer opnieuw.", false);
        return false;
      }
    }

    // When opened from the signed-in Leerpret dashboard, exchange that session
    // silently. A standalone visitor simply receives 401 and sees Google.
    try {
      await request(
        `/auth/leerbox/exchange?leerbox_id=${encodeURIComponent(LEERBOX_ID)}`,
        { method: "POST" }
      );
      const confirmed = await request(
        `/auth/leerbox/session?leerbox_id=${encodeURIComponent(LEERBOX_ID)}`
      );
      acceptSession(confirmed);
      return true;
    } catch (exchangeError) {
      state.online = exchangeError.status === 401;
      state.authenticated = false;
      state.user = null;
      state.roles = [];
      renderRequired(
        exchangeError.status === 401
          ? "Meld je hier met je Google-account aan."
          : "De Leerpret-service is niet bereikbaar. Start de backend en probeer opnieuw.",
        state.online
      );
      return false;
    }
  }

  async function logout() {
    try {
      await request("/auth/leerbox/logout", { method: "POST" });
    } catch {
      // De lokale vergrendeling wint ook wanneer de service net offline ging.
    }
    state.authenticated = false;
    state.user = null;
    state.roles = [];
    state.googleInitialized = false;
    state.googleCodeClient = null;
    const mount = elements().googleMount;
    if (mount) mount.replaceChildren();
    renderRequired("Je bent afgemeld. Je kunt opnieuw met Google aanmelden.", state.online);
  }

  function wire() {
    elements().statusButton?.addEventListener("click", () => {
      if (state.authenticated) logout();
    });
  }

  async function init() {
    resolveApiBase();
    wire();
    await checkSession();
  }

  window.LeerpretAuth = {
    init,
    checkSession,
    logout,
    getSession: () => ({
      apiBase: state.apiBase,
      authenticated: state.authenticated,
      online: state.online,
      user: state.user ? { ...state.user } : null,
      roles: [...state.roles]
    })
  };

  init();
})();
