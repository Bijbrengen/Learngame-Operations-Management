(() => {
  "use strict";

  const SOURCE_ROOT = "source_docs/LE-boek%20Learngames/";
  const BOOK_FIGURES = Object.freeze({
    lo1: ["1-logistiek-schema-lo-game-1.svg", "Logistiek schema LO Game 1"],
    lo2: ["1-productieproces-lo-game-1.svg", "Basisproductieproces"],
    lo3: ["3-productiegeorienteerde-organisatie-lo-game-3.svg", "Productiegeoriënteerde organisatie"],
    lo4: ["4-productgestuurde-organisatie-lo-game-4.svg", "Productgestuurde organisatie"],
    lo5: ["5-functionele-organisatie-lo-game-5.svg", "Functionele organisatie"],
    lo6: ["6-productieorganisatie-lo-game-6.svg", "Productieorganisatie"],
    lo7: ["7-productieorganisatie-lo-game-7.svg", "Digitale productieorganisatie"],
    lo8: ["8-functionele-organisatie-lo-game-8.svg", "Functionele ketenorganisatie"],
    le_training: ["9-productieproces-organisatie-le-training.svg", "School als productieproces"],
    entrepreneurial: ["10-organisatiediagram-learngame-entrepreneurship.svg", "Zelfstandige ondernemingen"]
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(config = {}) {
    const processes = Array.isArray(config.production_processes)
      ? config.production_processes.filter(item => ["parallel", "sequential"].includes(item))
      : [];
    const gameType = String(config.game_type || "lo4");
    const organizationModel = ["independent_enterprises", "school_learning_path"].includes(config.organization_model)
      ? config.organization_model
      : "single_enterprise";
    return {
      game_type: gameType,
      organization_model: organizationModel,
      play_mode: config.play_mode === "digital" ? "digital" : "physical",
      production_processes: processes.length ? [...new Set(processes)] : ["parallel"],
      intermediate_stock: Boolean(config.intermediate_stock),
      enabled_roles: Array.isArray(config.enabled_roles) ? [...new Set(config.enabled_roles)] : null
    };
  }

  function roleEnabled(config, roleId, fallback = true) {
    return config.enabled_roles ? config.enabled_roles.includes(roleId) : fallback;
  }

  function processNodes(config) {
    if (config.organization_model === "school_learning_path") {
      return Array.from({ length: 8 }, (_, index) => ({
        id: `group-${index + 1}`,
        label: `Groep ${index + 1}`,
        kind: "internal"
      }));
    }
    if (config.organization_model === "independent_enterprises") {
      return [
        { id: "raw-business", label: "Grondstofbedrijf", kind: "enterprise" },
        { id: "producer", label: "Producent", kind: "enterprise" },
        { id: "trader", label: "Handelaar", kind: "enterprise" }
      ];
    }
    if (
      config.production_processes.includes("parallel")
      && !config.production_processes.includes("sequential")
    ) {
      return ["A", "B", "C"].map(id => ({
        id: `production-${id.toLowerCase()}`,
        label: `Productie ${id}`,
        kind: "internal"
      }));
    }
    const nodes = [];
    ["1", "2", "3"].forEach((id, index) => {
      nodes.push({ id: `production-${id}`, label: `Productie ${id}`, kind: "internal" });
      if (config.intermediate_stock && index < 2) {
        nodes.push({ id: `stock-${id}`, label: `SS${id}`, kind: "stock" });
      }
    });
    return nodes;
  }

  function topology(config = {}) {
    const value = normalize(config);
    const supplierVisible = value.organization_model === "independent_enterprises"
      || roleEnabled(value, "supplier", ["lo4", "lo5", "lo6", "lo7", "lo8"].includes(value.game_type));
    const customerVisible = roleEnabled(value, "customer", true);
    const internal = processNodes(value);
    const before = [];
    if (supplierVisible) before.push({ id: "supplier", label: "Leverancier", kind: "external" });
    if (value.organization_model === "single_enterprise") {
      before.push({ id: "raw", label: "Grondstoffen", kind: "internal" });
    }
    const after = value.organization_model === "single_enterprise"
      ? [{ id: "finished", label: "Gereed product", kind: "internal" }]
      : [];
    if (customerVisible) after.push({ id: "customer", label: "Klant", kind: "external" });
    return {
      config: value,
      before,
      internal,
      after,
      parallel: value.production_processes.includes("parallel")
        && !value.production_processes.includes("sequential"),
      hybrid: value.production_processes.length > 1
    };
  }

  function nodeMarkup(node) {
    return `
      <div class="configuration-layout-node is-${escapeHtml(node.kind)}" data-layout-node="${escapeHtml(node.id)}">
        <span>${escapeHtml(node.label)}</span>
      </div>
    `;
  }

  function groupMarkup(nodes, group, title) {
    if (!nodes.length) return "";
    return `
      <div class="configuration-layout-group is-${group}" data-layout-group="${group}">
        <small>${escapeHtml(title)}</small>
        <div class="configuration-layout-nodes">${nodes.map(nodeMarkup).join("")}</div>
      </div>
    `;
  }

  function diagramMarkup(config = {}) {
    const graph = topology(config);
    const movementLabel = graph.config.play_mode === "physical"
      ? "Loopafstand"
      : "Transportvertraging";
    const internalTitle = graph.config.organization_model === "independent_enterprises"
      ? "Zelfstandige ondernemingen"
      : graph.config.organization_model === "school_learning_path"
        ? "Onderwijsproces"
        : graph.parallel
          ? "Interne werkvloer · parallel"
          : graph.hybrid
            ? "Interne werkvloer · hybride"
            : "Interne werkvloer · sequentieel";
    return `
      <div class="configuration-layout-diagram" data-layout-topology="${graph.parallel ? "parallel" : graph.hybrid ? "hybrid" : "sequential"}">
        ${groupMarkup(graph.before.filter(node => node.kind === "external"), "external", "Buiten de organisatie")}
        <div class="configuration-layout-distance" aria-label="${movementLabel}">
          <span>${movementLabel}</span>
        </div>
        ${groupMarkup(
          [
            ...graph.before.filter(node => node.kind !== "external"),
            ...graph.internal,
            ...graph.after.filter(node => node.kind !== "external")
          ],
          graph.parallel ? "parallel" : "internal",
          internalTitle
        )}
        <div class="configuration-layout-distance" aria-label="${movementLabel}">
          <span>${movementLabel}</span>
        </div>
        ${groupMarkup(graph.after.filter(node => node.kind === "external"), "external", "Buiten de organisatie")}
      </div>
    `;
  }

  function bookFigure(config = {}) {
    const value = normalize(config);
    const variant = value.organization_model === "school_learning_path"
      ? "le_training"
      : value.organization_model === "independent_enterprises"
        ? "entrepreneurial"
        : value.game_type;
    const historicalBase = globalThis.GameVariantHistory?.get(variant)?.basePreset;
    const [file, title] = BOOK_FIGURES[variant]
      || BOOK_FIGURES[historicalBase]
      || BOOK_FIGURES.lo4;
    return {
      file,
      title,
      url: `${SOURCE_ROOT}${encodeURIComponent(file)}`
    };
  }

  function markup(config = {}, view = "diagram") {
    const value = normalize(config);
    const figure = bookFigure(value);
    const activeView = view === "book" ? "book" : "diagram";
    return `
      <div class="configuration-layout-preview-shell">
        <div class="configuration-layout-preview-head">
          <div>
            <small>Live voorbeeld</small>
            <strong>Logistieke opstelling</strong>
          </div>
          <div class="configuration-layout-tabs" role="group" aria-label="Weergave logistieke opstelling">
            <button type="button" data-layout-view="diagram" aria-pressed="${activeView === "diagram"}">Opstelling</button>
            <button type="button" data-layout-view="book" aria-pressed="${activeView === "book"}">Boekfiguur</button>
          </div>
        </div>
        <div data-layout-view-panel="diagram"${activeView === "diagram" ? "" : " hidden"}>
          ${diagramMarkup(value)}
        </div>
        <div class="configuration-layout-book" data-layout-view-panel="book"${activeView === "book" ? "" : " hidden"}>
          <img src="${escapeHtml(figure.url)}" alt="${escapeHtml(figure.title)}">
          <small>${escapeHtml(figure.title)} · LE-boek hoofdstuk 9</small>
        </div>
      </div>
    `;
  }

  function configFromForm(form) {
    const get = name => form?.elements?.namedItem(name);
    const selected = get("game_type")?.value || form?.dataset?.gameType || "lo4";
    const stored = globalThis.GameConfigurationStore?.getConfiguration?.(selected);
    const gameType = form?.dataset?.gameType || stored?.settings?.game_type || selected;
    const enabledRoles = [...(form?.querySelectorAll?.('.role-selector-grid input[name^="role_"]') || [])]
      .filter(control => control.checked)
      .map(control => control.name.slice(5));
    return normalize({
      game_type: gameType,
      organization_model: get("organization_model")?.value,
      play_mode: get("play_mode")?.value,
      production_processes: [
        get("parallel_production")?.checked ? "parallel" : null,
        get("sequential_production")?.checked ? "sequential" : null
      ].filter(Boolean),
      intermediate_stock: get("intermediate_stock")?.checked,
      ...(enabledRoles.length ? { enabled_roles: enabledRoles } : {})
    });
  }

  function update(target, config = null) {
    const host = target?.matches?.("[data-configuration-layout-preview]")
      ? target
      : target?.querySelector?.("[data-configuration-layout-preview]");
    if (!host) return null;
    const form = host.closest("form");
    const value = config || configFromForm(form);
    const view = host.dataset.layoutView || "diagram";
    host.innerHTML = markup(value, view);
    host.dataset.layoutView = view;
    return host;
  }

  function updateAll(root = document) {
    root.querySelectorAll("[data-configuration-layout-preview]").forEach(host => update(host));
  }

  if (typeof document !== "undefined") {
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-layout-view]");
      const host = button?.closest("[data-configuration-layout-preview]");
      if (!host) return;
      host.dataset.layoutView = button.dataset.layoutView;
      update(host);
    });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => updateAll());
    } else {
      updateAll();
    }
  }

  const api = Object.freeze({
    normalize,
    topology,
    bookFigure,
    diagramMarkup,
    markup,
    configFromForm,
    update,
    updateAll
  });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ConfigurationLayoutPreview = api;
})();
