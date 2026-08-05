(() => {
  "use strict";
  const theme = document.querySelector('link[data-leerpret-theme="engine"]');
  if (!theme) {
    document.documentElement.dataset.themeSource = "missing";
    return;
  }
  const markReady = () => { document.documentElement.dataset.themeSource = "leerpret-engine"; };
  const markUnavailable = () => { document.documentElement.dataset.themeSource = "engine-unavailable"; };
  theme.addEventListener("load", markReady, { once: true });
  theme.addEventListener("error", markUnavailable, { once: true });
  if (theme.sheet) markReady();
})();
