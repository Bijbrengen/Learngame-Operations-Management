(() => {
  "use strict";

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
    const supplierGames = ["lo4", "lo5", "lo6", "lo7", "lo8"];
    const hasSupplier = config.has_supplier === undefined
      ? supplierGames.includes(gameType) || (
          Array.isArray(config.enabled_roles) && config.enabled_roles.includes("supplier")
        )
      : Boolean(config.has_supplier);
    return {
      game_type: gameType,
      organization_model: organizationModel,
      play_mode: config.play_mode === "digital" ? "digital" : "physical",
      production_processes: processes.length ? [...new Set(processes)] : ["parallel"],
      intermediate_stock: Boolean(config.intermediate_stock),
      has_supplier: hasSupplier,
      enabled_roles: Array.isArray(config.enabled_roles) ? [...new Set(config.enabled_roles)] : null
    };
  }

  function stationEnabled(config, stationId, fallback = true) {
    if (!config.enabled_roles) return fallback;
    return config.enabled_roles.some(roleId => (
      globalThis.LOMRuntimeRoles?.stationId?.(roleId) === stationId
    ));
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
      // De drie historische ondernemingsfamilies omvatten samen zes
      // operationele stations. Toon elk werkelijk speelstation, zodat de
      // opstelling meebeweegt met de rolkeuze en de drie bouwstappen niet
      // verdwijnen achter één generieke Producent-kaart.
      return [
        { id: "trader-orders", label: "Handelaar · Order & verkoop", kind: "enterprise", stationId: "operations" },
        { id: "raw-business", label: "Grondstofbedrijf · Materialen", kind: "enterprise", stationId: "srm" },
        { id: "producer-build-1", label: "Producent · Torenbouw 1", kind: "enterprise", stationId: "pd1" },
        { id: "producer-build-2", label: "Producent · Torenbouw 2", kind: "enterprise", stationId: "pd2" },
        { id: "producer-build-3", label: "Producent · Torenbouw 3", kind: "enterprise", stationId: "pd3" },
        { id: "trader-finished", label: "Handelaar · Gereed product", kind: "enterprise", stationId: "ssf" }
      ].filter(node => stationEnabled(config, node.stationId));
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
    // In Entrepreneurship ís het Grondstofbedrijf de leveranciersfamilie voor
    // station SRM; een extra externe Leverancier zou hetzelfde station dubbel
    // tekenen.
    const supplierVisible = value.organization_model !== "independent_enterprises"
      && value.has_supplier;
    const customerVisible = stationEnabled(value, "customer", true);
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

  function distanceMarkup(label, id) {
    const cables = globalThis.LeerpretSDK?.components?.["lego-cables"];
    const cable = cables?.connectionMarkup?.({
      id: `configuration-${id}`,
      from: [8, 18],
      to: [82, 18],
      bend: 18,
      sag: 22,
      direction: "forward",
      className: "configuration-flow-cable"
    }) || "";
    return `
      <div class="configuration-layout-distance" aria-label="${escapeHtml(label)}">
        <span>${escapeHtml(label)}</span>
        <svg viewBox="0 0 90 52" aria-hidden="true">${cable}</svg>
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
        ${distanceMarkup(movementLabel, "inbound")}
        ${groupMarkup(
          [
            ...graph.before.filter(node => node.kind !== "external"),
            ...graph.internal,
            ...graph.after.filter(node => node.kind !== "external")
          ],
          graph.parallel ? "parallel" : "internal",
          internalTitle
        )}
        ${distanceMarkup(movementLabel, "outbound")}
        ${groupMarkup(graph.after.filter(node => node.kind === "external"), "external", "Buiten de organisatie")}
      </div>
    `;
  }

  function markup(config = {}) {
    const value = normalize(config);
    return `
      <div class="configuration-layout-preview-shell">
        <div class="configuration-layout-preview-head">
          <div>
            <small>Live voorbeeld</small>
            <strong>Logistieke opstelling</strong>
          </div>
        </div>
        <div data-layout-view-panel="diagram">
          ${diagramMarkup(value)}
        </div>
      </div>
    `;
  }

  function configFromForm(form) {
    const get = name => form?.elements?.namedItem(name);
    const selected = get("game_type")?.value || form?.dataset?.gameType || "lo4";
    const stored = globalThis.GameConfigurationStore?.getConfiguration?.(selected);
    const gameType = form?.dataset?.gameType || stored?.settings?.game_type || selected;
    const enabledRoles = [...(form?.elements || [])]
      .filter(control => control.matches?.('input[name^="role_"]'))
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
      has_supplier: get("has_supplier")
        ? Boolean(get("has_supplier").checked)
        : stored?.settings?.has_supplier,
      enabled_roles: enabledRoles
    });
  }

  function update(target, config = null) {
    const host = target?.matches?.("[data-configuration-layout-preview]")
      ? target
      : target?.querySelector?.("[data-configuration-layout-preview]");
    if (!host) return null;
    const form = host.closest("form");
    const value = config || configFromForm(form);
    host.innerHTML = markup(value);
    return host;
  }

  function updateAll(root = document) {
    root.querySelectorAll("[data-configuration-layout-preview]").forEach(host => update(host));
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => updateAll());
    } else {
      updateAll();
    }
  }

  const api = Object.freeze({
    normalize,
    topology,
    diagramMarkup,
    markup,
    configFromForm,
    update,
    updateAll
  });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ConfigurationLayoutPreview = api;
})();
