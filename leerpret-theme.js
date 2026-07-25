(() => {
  "use strict";

  const FALLBACK = Object.freeze({
    bg: "#071014",
    panel: "#0b171d",
    surface_soft: "#102830",
    ink: "#eaf8f7",
    muted: "#8ca4aa",
    line: "#29434b",
    accent: "#32ddd2",
    accent_soft: "#0e2f2d",
    accent_border: "#28aa9e",
    blue: "#59bce8",
    coral: "#ff7d62",
    amber: "#e6ad43",
    violet: "#8d83df",
    font_heading: '"Rajdhani", "Arial Narrow", sans-serif',
    font_body: '"Plus Jakarta Sans", system-ui, sans-serif',
    radius_small: "8px",
    radius_panel: "14px",
    touch_target: "48px"
  });

  const CSS_VARIABLES = Object.freeze({
    bg: "--lp-bg",
    panel: "--lp-panel",
    surface_soft: "--lp-surface-soft",
    ink: "--lp-ink",
    muted: "--lp-muted",
    line: "--lp-line",
    accent: "--lp-accent",
    accent_soft: "--lp-accent-soft",
    accent_border: "--lp-accent-border",
    blue: "--lp-blue",
    coral: "--lp-coral",
    amber: "--lp-amber",
    violet: "--lp-violet",
    font_heading: "--lp-font-heading",
    font_body: "--lp-font-body",
    radius_small: "--lp-radius-small",
    radius_panel: "--lp-radius-panel",
    touch_target: "--lp-touch-target"
  });

  function apply(tokens, source = "fallback") {
    const root = document.documentElement;
    Object.entries(CSS_VARIABLES).forEach(([key, variable]) => {
      root.style.setProperty(variable, String(tokens?.[key] || FALLBACK[key]));
    });
    root.dataset.themeSource = source;
  }

  async function load(apiBase) {
    let base = String(apiBase || "").replace(/\/+$/, "");
    if (!base) return apply(FALLBACK);
    if (base.endsWith("/api")) {
      base = base.slice(0, -4);
    }
    try {
      const response = await fetch(`${base}/api/ui/theme-tokens?surface=learngame-om`, {
        credentials: "include",
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Theme service ${response.status}`);
      const payload = await response.json();
      apply({ ...FALLBACK, ...(payload.tokens || {}) }, payload.version || "api");
    } catch {
      apply(FALLBACK);
    }
  }

  apply(FALLBACK);
  window.addEventListener("leerpret-auth-changed", event => load(event.detail?.apiBase));
  window.LeerpretTheme = Object.freeze({ apply, load });
  const currentSession = window.LeerpretAuth?.getSession?.();
  if (currentSession?.apiBase) load(currentSession.apiBase);
})();
