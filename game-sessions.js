(() => {
  "use strict";

  const ROLE_LABELS = {
    customer1: "Klant 1",
    customer2: "Klant 2",
    customer3: "Klant 3",
    customer4: "Klant 4",
    opr: "Operations Manager",
    srm: "Magazijn Grondstoffen",
    pd1: "Productie Afdeling 1",
    pd2: "Productie Afdeling 2",
    pd3: "Productie Afdeling 3",
    mfp: "Magazijn Gereed Product"
  };
  const TYPE_LABELS = {
    closed: "Gesloten",
    open: "Open",
    semi_closed: "Semi-gesloten"
  };
  const DIFFICULTY_LEVELS = {
    easy: {
      label: "Makkelijk",
      requestRate: "Lage aanvraagdruk",
      failureRate: "Zeldzame fouten",
      reactionTime: "Rustig en voorspelbaar"
    },
    normal: {
      label: "Gemiddeld",
      requestRate: "Normale aanvraagdruk",
      failureRate: "Incidentele fouten",
      reactionTime: "Wisselende reactietijd"
    },
    hard: {
      label: "Moeilijk",
      requestRate: "Hoge piekbelasting",
      failureRate: "Veel ruis en fouten",
      reactionTime: "Agressieve piekmomenten"
    }
  };
  const GAME_CONFIG_PRESETS = {
    entrepreneurial: {
      label: "Entrepreneurial Game",
      money: true,
      pnl: true,
      intermediate_stock: true,
      opportunity_costs: true,
      role_freedom: true,
      price_mode: "free",
      logistics_organization: "functional",
      product_type_count: 3,
      customer_order_mode: "free"
    },
    lo1: {
      label: "LO Game 1",
      money: false, pnl: false, intermediate_stock: false, opportunity_costs: false,
      role_freedom: false, price_mode: "fixed", logistics_organization: "functional",
      product_type_count: 1, customer_order_mode: "required"
    },
    lo2: {
      label: "LO Game 2",
      money: false, pnl: false, intermediate_stock: true, opportunity_costs: false,
      role_freedom: false, price_mode: "fixed", logistics_organization: "functional",
      product_type_count: 3, customer_order_mode: "required"
    },
    lo3: {
      label: "LO Game 3",
      money: false, pnl: false, intermediate_stock: false, opportunity_costs: false,
      role_freedom: false, price_mode: "fixed", logistics_organization: "product",
      product_type_count: 3, customer_order_mode: "required"
    },
    lo4: {
      label: "LO Game 4",
      money: true, pnl: true, intermediate_stock: false, opportunity_costs: true,
      role_freedom: false, price_mode: "fixed", logistics_organization: "product",
      product_type_count: 3, customer_order_mode: "required"
    },
    lo5: {
      label: "LO Game 5",
      money: true, pnl: true, intermediate_stock: true, opportunity_costs: true,
      role_freedom: false, price_mode: "fixed", logistics_organization: "functional",
      product_type_count: 3, customer_order_mode: "required"
    },
    lo6: {
      label: "LO Game 6",
      money: true, pnl: true, intermediate_stock: true, opportunity_costs: true,
      role_freedom: true, price_mode: "fixed", logistics_organization: "functional",
      multiple_colors: true,
      editable_color_layers: ["groundPlate", "layer1", "layer2", "layer3"],
      product_type_count: 9, customer_order_mode: "required"
    },
    lo7: {
      label: "LO Game 7",
      money: true, pnl: true, intermediate_stock: true, opportunity_costs: true,
      role_freedom: true, price_mode: "free", logistics_organization: "functional",
      product_type_count: 9, customer_order_mode: "free"
    },
    lo8: {
      label: "LO Game 8",
      money: true, pnl: true, intermediate_stock: true, opportunity_costs: true,
      role_freedom: true, price_mode: "free", logistics_organization: "functional",
      product_type_count: 9, customer_order_mode: "free"
    },
    le_training: {
      label: "LE-Training",
      money: true, pnl: true, intermediate_stock: false, opportunity_costs: true,
      role_freedom: false, price_mode: "fixed", logistics_organization: "product",
      product_type_count: 3, customer_order_mode: "required"
    }
  };
  const state = {
    authenticated: false,
    apiBase: "",
    availability: null,
    session: null,
    busy: false,
    mutationVersion: 0,
    mutationQueue: Promise.resolve(),
    pendingGameConfig: null,
    savingGameConfig: false,
    createSessionDraft: {
      session_type: "closed",
      difficulty_level: "normal",
      game_config: {
        ...GAME_CONFIG_PRESETS.lo4,
        play_mode: "physical",
        game_type: "lo4"
      }
    },
    pollTimer: null,
    startedSessionId: null
  };

  const elements = () => ({
    playerPanel: document.getElementById("playerSessionPanel"),
    playerUtilityActions: document.querySelector(".player-utility-actions"),
    playerTitle: document.getElementById("playerSessionTitle"),
    playerContent: document.getElementById("playerSessionContent"),
    playerBadge: document.getElementById("playerSessionBadge"),
    managerContent: document.getElementById("managerSessionContent"),
    managerBadge: document.getElementById("managerSessionBadge"),
    createForm: document.getElementById("gameSessionCreateForm"),
    sessionType: document.getElementById("gameSessionType"),
    dialog: document.getElementById("gameConsensusDialog"),
    dialogSummary: document.getElementById("gameConsensusSummary"),
    waitButton: document.getElementById("gameConsensusWaitButton"),
    startButton: document.getElementById("gameConsensusStartButton")
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function recoverLocalApiBase() {
    return window.LEARNGAME_OM_CONFIG?.apiBase || null;
  }

  async function request(path, options = {}, allowLocalRecovery = true) {
    const requestUrl = `${state.apiBase}${path}`;
    const response = await fetch(requestUrl, {
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    if (response.status === 501 && allowLocalRecovery) {
      const recoveredApiBase = recoverLocalApiBase();
      if (recoveredApiBase && recoveredApiBase !== state.apiBase) {
        state.apiBase = recoveredApiBase;
        localStorage.setItem("api_base", recoveredApiBase);
        localStorage.setItem("leerpret.apiBase", recoveredApiBase);
        return request(path, options, false);
      }
    }
    if (!response.ok) {
      const fallback = `De gamesessie kon niet worden bijgewerkt (${response.status}, ${requestUrl}).`;
      let message = fallback;
      try {
        const raw = await response.text();
        const payload = raw ? JSON.parse(raw) : null;
        if (typeof payload?.detail === "string") {
          message = payload.detail;
        } else if (Array.isArray(payload?.detail)) {
          message = payload.detail.map(item => item?.msg).filter(Boolean).join(" · ") || fallback;
        } else if (raw && !raw.trim().startsWith("<")) {
          message = raw;
        }
      } catch {
        // Keep the status-bearing fallback.
      }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  function roleLabel(roleId) {
    return ROLE_LABELS[roleId] || roleId || "Geen actieve rol";
  }

  function difficultyLevel(level) {
    return DIFFICULTY_LEVELS[level] || DIFFICULTY_LEVELS.normal;
  }

  function difficultyOptions(selectedLevel = "normal") {
    return Object.entries(DIFFICULTY_LEVELS).map(([level, definition]) => `
      <option value="${level}"${level === selectedLevel ? " selected" : ""}>${definition.label}</option>
    `).join("");
  }

  function difficultyAxesMarkup(level = "normal") {
    const definition = difficultyLevel(level);
    return `
      <span><strong>Aanvragen</strong><small>${escapeHtml(definition.requestRate)}</small></span>
      <span><strong>Foutmarge</strong><small>${escapeHtml(definition.failureRate)}</small></span>
      <span><strong>Reactietijd</strong><small>${escapeHtml(definition.reactionTime)}</small></span>
    `;
  }

  function normalizedGameConfig(config = {}) {
    const gameType = GAME_CONFIG_PRESETS[config.game_type] ? config.game_type : "lo4";
    const storedPresetSettings = window.GameConfigurationStore
      ?.getConfiguration(gameType)
      ?.settings || {};
    const productionProcesses = window.LogisticsProcess?.normalizeProcesses(
      config.production_processes,
      gameType
    ) || ["parallel"];
    const merged = {
      ...GAME_CONFIG_PRESETS[gameType],
      ...storedPresetSettings,
      ...config
    };
    const multipleColors = Boolean(merged.multiple_colors);
    return {
      ...merged,
      play_mode: config.play_mode === "digital" ? "digital" : "physical",
      game_type: gameType,
      multiple_colors: multipleColors,
      editable_color_layers: multipleColors && Array.isArray(merged.editable_color_layers)
        ? [...new Set(merged.editable_color_layers)].filter(layerId => (
            ["groundPlate", "layer1", "layer2", "layer3"].includes(layerId)
          ))
        : [],
      production_processes: productionProcesses,
      logistics_organization: productionProcesses.length === 1
        && productionProcesses[0] === "sequential"
        ? "functional"
        : "product"
    };
  }

  function gameComparisonMatricesMarkup() {
    const gameIds = ["lo1", "lo2", "lo3", "lo4", "lo5", "lo6", "lo7"];
    const settingsByGame = Object.fromEntries(gameIds.map(gameId => {
      const stored = window.GameConfigurationStore?.getConfiguration(gameId)?.settings;
      const preset = GAME_CONFIG_PRESETS[gameId];
      const sequential = ["lo1", "lo2", "lo5", "lo6", "lo7"].includes(gameId);
      return [gameId, stored || {
        ...preset,
        production_processes: sequential ? ["sequential"] : ["parallel"],
        enabled_roles: []
      }];
    }));
    const roles = [
      ["customer", "Klant"],
      ["logistics_manager", "Logistiek Manager"],
      ["raw_warehouse", "Magazijn Grondstoffen"],
      ["production_1", "Productie Afdeling 1"],
      ["production_2", "Productie Afdeling 2"],
      ["production_3", "Productie Afdeling 3"],
      ["production_a", "Productie Toren A"],
      ["production_b", "Productie Toren B"],
      ["production_c", "Productie Toren C"],
      ["finished_warehouse", "Magazijn Gereed Product"],
      ["sales", "Verkoop / Sales"],
      ["finance", "Financiën / Admin"],
      ["supplier", "Leverancier"],
      ["transporter", "Transporteur"]
    ];
    const yesNo = value => value
      ? '<span class="badge-on" aria-label="Aan">✅</span>'
      : '<span class="badge-excluded" aria-label="Uit">❌</span>';
    const header = firstColumn => `
      <thead><tr>
        <th scope="col">${firstColumn}</th>
        ${gameIds.map((_, index) => `<th scope="col">Game ${index + 1}</th>`).join("")}
      </tr></thead>
    `;
    const settingRows = [
      ["Parallelle productie", config => config.production_processes?.includes("parallel"), "bool"],
      ["Sequentiële productie", config => config.production_processes?.includes("sequential"), "bool"],
      ["Productgerichte organisatie", config => config.logistics_organization === "product", "bool"],
      ["Functionele organisatie", config => config.logistics_organization === "functional", "bool"],
      ["Tussenvoorraad", config => config.intermediate_stock, "bool"],
      ["Geld", config => config.money, "bool"],
      ["Winst/verlies", config => config.pnl, "bool"],
      ["Opportunity costs", config => config.opportunity_costs, "bool"],
      ["Rolvrijheid", config => config.role_freedom, "bool"],
      ["Meerdere kleuren", config => config.multiple_colors, "bool"],
      ["Grondplaatkleur vrij", config => config.editable_color_layers?.includes("groundPlate"), "bool"],
      ["Kleur laag 1 vrij", config => config.editable_color_layers?.includes("layer1"), "bool"],
      ["Kleur laag 2 vrij", config => config.editable_color_layers?.includes("layer2"), "bool"],
      ["Kleur laag 3 vrij", config => config.editable_color_layers?.includes("layer3"), "bool"],
      ["Vrije verkoopprijs", config => config.price_mode === "free", "bool"],
      ["Vrije klantorder", config => config.customer_order_mode === "free", "bool"],
      ["Aantal torensoorten", config => config.product_type_count, "text"]
    ];
    return `
      <details class="game-matrix-details is-wide">
        <summary class="game-matrix-summary">📊 Bekijk overzicht instellingen per LO-Game spelvariant</summary>
        <div class="game-matrix-wrapper">
          <table class="game-matrix-table">
            <caption>Automatisch opgebouwd uit de ingebouwde gamesessiepresets.</caption>
            ${header("Optie")}
            <tbody>
              ${settingRows.map(([label, read, type]) => `
                <tr>
                  <th scope="row">${escapeHtml(label)}</th>
                  ${gameIds.map(gameId => {
                    const value = read(settingsByGame[gameId]);
                    return `<td>${type === "bool" ? yesNo(Boolean(value)) : escapeHtml(value)}</td>`;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </details>
      <details class="game-matrix-details is-wide">
        <summary class="game-matrix-summary">👥 Bekijk actieve rollen per LO-Game spelvariant</summary>
        <div class="game-matrix-wrapper">
          <table class="game-matrix-table">
            <caption>Rollen per ingebouwde gamesessiepreset.</caption>
            ${header("Rol")}
            <tbody>
              ${roles.map(([roleId, label]) => `
                <tr>
                  <th scope="row">${escapeHtml(label)}</th>
                  ${gameIds.map(gameId => yesNo(
                    (settingsByGame[gameId].enabled_roles || []).includes(roleId)
                  )).map(cell => `<td>${cell}</td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </details>
    `;
  }

  function gameConfigFieldsMarkup(config = {}) {
    const value = normalizedGameConfig(config);
    const matchingConfiguration = typeof window !== "undefined" && window.GameConfigurationStore
      ? window.GameConfigurationStore.findMatchingConfiguration(value)
      : null;
    const selectedConfigId = matchingConfiguration?.config_id || "custom_draft";
    let gameTypeOptions = "";
    if (typeof window !== "undefined" && window.GameConfigurationStore) {
      const presets = window.GameConfigurationStore.getPresets();
      const customConfigs = window.GameConfigurationStore.getCustomConfigurations();

      gameTypeOptions += `<optgroup label="🔒 Ingebouwde Presets">`;
      presets.forEach(p => {
        gameTypeOptions += `<option value="${p.config_id}" ${selectedConfigId === p.config_id ? "selected" : ""}>${escapeHtml(p.name)}</option>`;
      });
      gameTypeOptions += `</optgroup>`;

      if (customConfigs.length > 0) {
        gameTypeOptions += `<optgroup label="💾 Mijn Opgeslagen Scenario's">`;
        customConfigs.forEach(c => {
          gameTypeOptions += `<option value="${c.config_id}" ${selectedConfigId === c.config_id ? "selected" : ""}>💾 ${escapeHtml(c.name)}</option>`;
        });
        gameTypeOptions += `</optgroup>`;
      }
      if (!matchingConfiguration) {
        gameTypeOptions += `<option value="custom_draft" selected>⚙️ Aangepast scenario (nog niet opgeslagen)</option>`;
      }
    } else {
      gameTypeOptions = Object.entries(GAME_CONFIG_PRESETS).map(([id, preset]) => `
        <option value="${id}"${value.game_type === id ? " selected" : ""}>${preset.label}</option>
      `).join("");
    }
    const toggle = (name, label) => `
      <label class="session-config-toggle">
        <input type="checkbox" name="${name}" data-game-config-control ${value[name] ? "checked" : ""}>
        <span>${label}</span>
      </label>
    `;
    const hasParallel = value.production_processes.includes("parallel");
    const hasSequential = value.production_processes.includes("sequential");
    const isHybrid = hasParallel && hasSequential;
    const editableColorLayers = new Set(value.editable_color_layers || []);
    return `
      <fieldset class="session-game-config">
        <legend>Spelvariant en spelregels</legend>
        <label class="session-config-field session-play-mode is-wide">
          <span>Spelmodus</span>
          <select name="play_mode" data-game-config-control>
            <option value="physical"${value.play_mode === "physical" ? " selected" : ""}>Fysiek · echte LEGO en administratief dashboard</option>
            <option value="digital"${value.play_mode === "digital" ? " selected" : ""}>Digitaal · volledig bouwen en verplaatsen op het scherm</option>
          </select>
          <small>${value.play_mode === "digital"
            ? "Bouwen, klaarleggen en transporteren gebeurt verplicht in de game."
            : "Bouwen en transporteren gebeurt aan tafel; de game registreert de administratie."}</small>
        </label>
        <label class="session-config-field is-wide">
          <span>Gametype</span>
          <select name="game_type" data-session-game-type data-game-config-control>${gameTypeOptions}</select>
        </label>
        <div class="session-config-toggles">
          ${toggle("money", "Geld")}
          ${toggle("pnl", "Winst/verlies")}
          ${toggle("intermediate_stock", "Tussenvoorraad")}
          ${toggle("opportunity_costs", "Opportunity costs")}
          ${toggle("role_freedom", "Rolvrijheid")}
        </div>
        <fieldset class="session-config-field color-choice-settings is-wide">
          <legend>Kleurvrijheid</legend>
          <label class="session-config-toggle">
            <input type="checkbox"
                   name="multiple_colors"
                   data-multiple-colors
                   data-game-config-control
                   ${value.multiple_colors ? "checked" : ""}>
            <span>Meerdere kleuren</span>
          </label>
          <div class="color-layer-options"
               data-editable-color-layers
               ${value.multiple_colors ? "" : "hidden"}>
            <span>Kleur zelf kiezen voor:</span>
            ${[
              ["groundPlate", "Grondplaat"],
              ["layer1", "Laag 1"],
              ["layer2", "Laag 2"],
              ["layer3", "Laag 3"]
            ].map(([layerId, label]) => `
              <label>
                <input type="checkbox"
                       name="color_${layerId}"
                       data-color-layer="${layerId}"
                       data-game-config-control
                       ${editableColorLayers.has(layerId) ? "checked" : ""}
                       ${value.multiple_colors ? "" : "disabled"}>
                ${label}
              </label>
            `).join("")}
          </div>
          <small>LO Game 6 ontgrendelt standaard alle vier kleurlagen.</small>
        </fieldset>
        <label class="session-config-field">
          <span>Klantorder</span>
          <select name="customer_order_mode" data-game-config-control>
            <option value="free"${value.customer_order_mode === "free" ? " selected" : ""}>Vrij · klant kiest toren en aantal</option>
            <option value="required"${value.customer_order_mode === "required" ? " selected" : ""}>Verplicht · variant bepaalt de order</option>
          </select>
        </label>
        <label class="session-config-field">
          <span>Prijs</span>
          <select name="price_mode" data-game-config-control>
            <option value="fixed"${value.price_mode === "fixed" ? " selected" : ""}>Vast</option>
            <option value="free"${value.price_mode === "free" ? " selected" : ""}>Vrij</option>
          </select>
        </label>
        <fieldset class="session-config-field production-process-fields">
          <legend>Productieroutes</legend>
          <label class="session-config-toggle">
            <input type="checkbox" name="parallel_production" data-production-process data-game-config-control ${hasParallel ? "checked" : ""}>
            <span>Parallelle productie</span>
          </label>
          <label class="session-config-toggle">
            <input type="checkbox" name="sequential_production" data-production-process data-game-config-control ${hasSequential ? "checked" : ""}>
            <span>Sequentiële productie</span>
          </label>
          <small data-hybrid-production-tooltip
                 title="Hybride productie is toegestaan als aangepaste configuratie, maar is nog geen bestaande preset."
                 ${isHybrid ? "" : "hidden"}>
            Hybride productie · aangepaste configuratie, nog geen preset
          </small>
        </fieldset>
        <label class="session-config-field">
          <span>Torensoorten</span>
          <input name="product_type_count" type="number" min="1" max="9" value="${value.product_type_count}" data-game-config-control>
        </label>
        <details class="session-config-save is-wide">
          <summary>Opslaan als nieuwe preset…</summary>
          <div>
            <label>
              <span>Naam *</span>
              <input name="configuration_name" maxlength="100" placeholder="Bijv. Hybride klantorderroute">
            </label>
            <label>
              <span>Beschrijving</span>
              <input name="configuration_description" maxlength="300" placeholder="Optionele toelichting">
            </label>
            <button type="button" class="secondary-button" data-save-session-config>Preset opslaan</button>
          </div>
        </details>
        <details class="role-selector-details is-wide">
          <summary class="role-selector-summary">⚙️ Rollen af- of aanvinken voor deze sessie (Afwijken van preset)</summary>
          <div class="role-selector-grid">
            ${[
              { id: "customer", label: "Klant", category: "Extern" },
              { id: "logistics_manager", label: "Logistiek Manager", category: "Management" },
              { id: "raw_warehouse", label: "Magazijn Grondstoffen", category: "Magazijn" },
              { id: "production_1", label: "Productie Afdeling 1 (Stap 1)", category: "F-org" },
              { id: "production_2", label: "Productie Afdeling 2 (Stap 2)", category: "F-org" },
              { id: "production_3", label: "Productie Afdeling 3 (Stap 3)", category: "F-org" },
              { id: "production_a", label: "Afdeling Toren A", category: "P-org" },
              { id: "production_b", label: "Afdeling Toren B", category: "P-org" },
              { id: "production_c", label: "Afdeling Toren C", category: "P-org" },
              { id: "finished_warehouse", label: "Magazijn Gereed Product", category: "Magazijn" },
              { id: "sales", label: "Verkoop / Sales Director", category: "Commercie" },
              { id: "finance", label: "Financiële Admin", category: "Financiën" },
              { id: "supplier", label: "Leverancier Grondstoffen", category: "Extern" },
              { id: "transporter", label: "Transporteur / Freight Forwarder", category: "Logistiek" }
            ].map(role => {
              const isChecked = !value.enabled_roles || value.enabled_roles.includes(role.id);
              return `
                <label class="role-option-field">
                  <input type="checkbox" name="role_${role.id}" data-game-config-control ${isChecked ? 'checked' : ''}>
                  <span>${role.label}</span>
                  <span class="role-option-category">${role.category}</span>
                </label>
              `;
            }).join("")}
          </div>
        </details>
        ${gameComparisonMatricesMarkup()}
        <details class="game-matrix-details is-wide" hidden aria-hidden="true">
          <summary class="game-matrix-summary">📊 Bekijk overzicht instellingen per LO-Game spelvariant</summary>
          <div class="game-matrix-wrapper">
            <table class="game-matrix-table">
              <thead>
                <tr>
                  <th>Spelvariant</th>
                  <th>Logistieke Organisatie</th>
                  <th>Tussenvoorraad</th>
                  <th>Geldstroom</th>
                  <th>Winst / Verlies</th>
                  <th>Opportunity Costs</th>
                  <th>Rolvrijheid</th>
                  <th>Prijs</th>
                  <th>Torensoorten</th>
                  <th>Klantorder</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>LO Game 1</strong></td>
                  <td>Functionele keten</td>
                  <td><span class="badge-off">Optioneel / Uit</span></td>
                  <td>❌ Nee</td>
                  <td>❌ Nee</td>
                  <td>❌ Nee</td>
                  <td>❌ Nee</td>
                  <td>Vast</td>
                  <td>1</td>
                  <td>Verplicht</td>
                </tr>
                <tr>
                  <td><strong>LO Game 2</strong></td>
                  <td>Functionele keten</td>
                  <td><span class="badge-on">✅ Actief</span></td>
                  <td>❌ Nee</td>
                  <td>❌ Nee</td>
                  <td>❌ Nee</td>
                  <td>❌ Nee</td>
                  <td>Vast</td>
                  <td>3</td>
                  <td>Verplicht</td>
                </tr>
                <tr>
                  <td><strong>LO Game 3</strong></td>
                  <td>Productgericht (P-org)</td>
                  <td><span class="badge-excluded">⛔ Uitgesloten</span></td>
                  <td>❌ Nee</td>
                  <td>❌ Nee</td>
                  <td>❌ Nee</td>
                  <td>❌ Nee</td>
                  <td>Vast</td>
                  <td>3</td>
                  <td>Verplicht</td>
                </tr>
                <tr>
                  <td><strong>LO Game 4</strong></td>
                  <td>Productgericht (P-org)</td>
                  <td><span class="badge-excluded">⛔ Uitgesloten</span></td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>❌ Nee</td>
                  <td>Vast</td>
                  <td>3</td>
                  <td>Verplicht</td>
                </tr>
                <tr>
                  <td><strong>LO Game 5</strong></td>
                  <td>Functionele keten (gepland)</td>
                  <td><span class="badge-on">✅ Actief</span></td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>❌ Nee</td>
                  <td>Vast</td>
                  <td>3</td>
                  <td>Verplicht</td>
                </tr>
                <tr>
                  <td><strong>LO Game 6</strong></td>
                  <td>Functioneel (flexibel)</td>
                  <td><span class="badge-on">✅ Actief</span></td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>Vast</td>
                  <td>9</td>
                  <td>Verplicht</td>
                </tr>
                <tr>
                  <td><strong>LO Game 7</strong></td>
                  <td>Functioneel (vrije markt)</td>
                  <td><span class="badge-on">✅ Actief</span></td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>Vrij</td>
                  <td>9</td>
                  <td>Vrij</td>
                </tr>
                <tr>
                  <td><strong>LO Game 8</strong></td>
                  <td>Functioneel (ketensimulatie)</td>
                  <td><span class="badge-on">✅ Actief</span></td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>Vrij</td>
                  <td>9</td>
                  <td>Vrij</td>
                </tr>
                <tr>
                  <td><strong>LE-Training</strong></td>
                  <td>Productgericht (budget/lumpsum)</td>
                  <td><span class="badge-on">✅ Actief</span></td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td><span class="badge-excluded">❌ Geen</span></td>
                  <td>✅ Ja</td>
                  <td>Vast</td>
                  <td>3</td>
                  <td>Verplicht</td>
                </tr>
                <tr>
                  <td><strong>Entrepreneurial</strong></td>
                  <td>Vrije markt / Ondernemerschap</td>
                  <td><span class="badge-on">✅ Actief</span></td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>✅ Ja</td>
                  <td>Vrij</td>
                  <td>3</td>
                  <td>Vrij</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
        <details class="game-matrix-details is-wide" hidden aria-hidden="true">
          <summary class="game-matrix-summary">👥 Bekijk actieve rollen & deelnemersbezetting per LO-Game spelvariant</summary>
          <div class="game-matrix-wrapper">
            <table class="game-matrix-table">
              <thead>
                <tr>
                  <th>Spelvariant</th>
                  <th>Klant</th>
                  <th>Logistiek Manager</th>
                  <th>Magazijn Grondstoffen</th>
                  <th>Prod 1, 2, 3 (F-org)</th>
                  <th>Prod A, B, C (P-org)</th>
                  <th>Magazijn Gereed</th>
                  <th>Verkoop / Sales</th>
                  <th>Financiën / Admin</th>
                  <th>Leverancier</th>
                  <th>Transporteur</th>
                  <th>Deelnemers</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>LO Game 1</strong></td>
                  <td><span class="badge-on">✅ (1-4)</span></td>
                  <td><span class="badge-on">✅ (1)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (3-12)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><strong>7 - 23</strong></td>
                </tr>
                <tr>
                  <td><strong>LO Game 2</strong></td>
                  <td><span class="badge-on">✅ (1-4)</span></td>
                  <td><span class="badge-on">✅ (1-3)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (3-12)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><strong>7 - 23</strong></td>
                </tr>
                <tr>
                  <td><strong>LO Game 3</strong></td>
                  <td><span class="badge-on">✅ (1-4)</span></td>
                  <td><span class="badge-on">✅ (1-3)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-on">✅ (3-12)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><strong>7 - 23</strong></td>
                </tr>
                <tr>
                  <td><strong>LO Game 4</strong></td>
                  <td><span class="badge-on">✅ (1-4)</span></td>
                  <td><span class="badge-on">✅ (1)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-on">✅ (3-12)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><strong>9 - 25</strong></td>
                </tr>
                <tr>
                  <td><strong>LO Game 5</strong></td>
                  <td><span class="badge-on">✅ (1-4)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (3-9)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-3)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><strong>10 - 26</strong></td>
                </tr>
                <tr>
                  <td><strong>LO Game 6</strong></td>
                  <td><span class="badge-on">✅ (1-4)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (3-12)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-3)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><strong>11 - 28</strong></td>
                </tr>
                <tr>
                  <td><strong>LO Game 7</strong></td>
                  <td><span class="badge-on">✅ (1-4)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (3-12)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-3)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><strong>11 - 30</strong></td>
                </tr>
                <tr>
                  <td><strong>LO Game 8</strong></td>
                  <td><span class="badge-on">✅ (1-4)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (3-12)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-3)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><strong>11 - 32</strong></td>
                </tr>
                <tr>
                  <td><strong>LE-Training</strong></td>
                  <td><span class="badge-on">✅ (1-4)</span></td>
                  <td><span class="badge-on">✅ (1)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-on">✅ (3-12)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-on">✅ (1-2)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><strong>9 - 25</strong></td>
                </tr>
                <tr>
                  <td><strong>Entrepreneurial</strong></td>
                  <td><span class="badge-on">✅ Klant (1-6)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-on">✅ Handelaar (2-8)</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><span class="badge-on">✅ Producent/Lev.</span></td>
                  <td><span class="badge-excluded">❌</span></td>
                  <td><strong>8 - 36</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </fieldset>
    `;
  }

  function applyGameConfigPreset(form, configurationId) {
    if (!form || configurationId === "custom_draft") return;
    const stored = window.GameConfigurationStore?.getConfiguration(configurationId);
    const settings = stored?.settings || GAME_CONFIG_PRESETS[configurationId];
    if (!settings) return;
    const gameType = settings.game_type || configurationId;
    form.dataset.gameType = gameType;
    Object.entries(settings).forEach(([name, value]) => {
      const control = form.elements.namedItem(name);
      if (!control) return;
      if (control.type === "checkbox") control.checked = Boolean(value);
      else control.value = String(value);
    });
    const processes = window.LogisticsProcess?.normalizeProcesses(
      settings.production_processes,
      gameType
    ) || ["parallel"];
    form.elements.namedItem("parallel_production").checked = processes.includes("parallel");
    form.elements.namedItem("sequential_production").checked = processes.includes("sequential");
    if (Array.isArray(settings.enabled_roles)) {
      const enabledRoles = new Set(settings.enabled_roles);
      form.querySelectorAll('.role-selector-grid input[name^="role_"]').forEach(control => {
        control.checked = enabledRoles.has(control.name.slice("role_".length));
      });
    }
    updateHybridProductionTooltip(form);
    const editableColorLayers = new Set(settings.editable_color_layers || []);
    form.querySelectorAll("[data-color-layer]").forEach(control => {
      control.checked = editableColorLayers.has(control.dataset.colorLayer);
    });
    updateColorLayerControls(form);
  }

  function selectedProductionProcesses(form, gameType) {
    const requested = [
      form.elements.namedItem("parallel_production")?.checked ? "parallel" : null,
      form.elements.namedItem("sequential_production")?.checked ? "sequential" : null
    ].filter(Boolean);
    const normalized = window.LogisticsProcess?.normalizeProcesses(requested, gameType)
      || ["parallel"];
    form.elements.namedItem("parallel_production").checked = normalized.includes("parallel");
    form.elements.namedItem("sequential_production").checked = normalized.includes("sequential");
    return normalized;
  }

  function updateHybridProductionTooltip(form) {
    if (!form) return;
    const tooltip = form.querySelector("[data-hybrid-production-tooltip]");
    if (!tooltip) return;
    tooltip.hidden = !(
      form.elements.namedItem("parallel_production")?.checked
      && form.elements.namedItem("sequential_production")?.checked
    );
  }

  function updateColorLayerControls(form) {
    if (!form) return;
    const enabled = Boolean(form.elements.namedItem("multiple_colors")?.checked);
    const layerOptions = form.querySelector("[data-editable-color-layers]");
    if (layerOptions) layerOptions.hidden = !enabled;
    form.querySelectorAll("[data-color-layer]").forEach(control => {
      control.disabled = !enabled;
    });
  }

  function collectGameConfig(form) {
    const get = name => form.elements.namedItem(name);
    const selectedConfiguration = window.GameConfigurationStore?.getConfiguration(
      get("game_type")?.value
    );
    const gameType = form.dataset.gameType
      || selectedConfiguration?.settings?.game_type
      || get("game_type")?.value
      || "lo4";
    const productionProcesses = selectedProductionProcesses(form, gameType);
    const enabledRoles = [...form.querySelectorAll('.role-selector-grid input[name^="role_"]')]
      .filter(control => control.checked)
      .map(control => control.name.slice("role_".length));
    updateHybridProductionTooltip(form);
    updateColorLayerControls(form);
    const multipleColors = Boolean(get("multiple_colors")?.checked);
    return {
      play_mode: get("play_mode")?.value === "digital" ? "digital" : "physical",
      game_type: gameType,
      money: Boolean(get("money")?.checked),
      pnl: Boolean(get("pnl")?.checked),
      intermediate_stock: Boolean(get("intermediate_stock")?.checked),
      opportunity_costs: Boolean(get("opportunity_costs")?.checked),
      role_freedom: Boolean(get("role_freedom")?.checked),
      multiple_colors: multipleColors,
      editable_color_layers: multipleColors
        ? [...form.querySelectorAll("[data-color-layer]")]
            .filter(control => control.checked)
            .map(control => control.dataset.colorLayer)
        : [],
      price_mode: get("price_mode")?.value || "fixed",
      production_processes: productionProcesses,
      logistics_organization: productionProcesses.length === 1
        && productionProcesses[0] === "sequential"
        ? "functional"
        : "product",
      product_type_count: Math.max(1, Math.min(9, Number(get("product_type_count")?.value) || 3)),
      customer_order_mode: get("customer_order_mode")?.value || "required",
      ...(enabledRoles.length ? { enabled_roles: enabledRoles } : {})
    };
  }

  function syncGameConfigurationSelection(form, config) {
    const select = form?.elements.namedItem("game_type");
    if (!select || !window.GameConfigurationStore) return null;
    const match = window.GameConfigurationStore.findMatchingConfiguration(config);
    if (match) {
      if (![...select.options].some(option => option.value === match.config_id)) {
        select.add(new Option(`💾 ${match.name}`, match.config_id));
      }
      select.value = match.config_id;
      form.dataset.gameType = match.settings.game_type || match.base_template;
      return match;
    }
    if (![...select.options].some(option => option.value === "custom_draft")) {
      select.add(new Option("⚙️ Aangepast scenario (nog niet opgeslagen)", "custom_draft"));
    }
    select.value = "custom_draft";
    return null;
  }

  function saveSessionConfiguration(form) {
    if (!form || !window.GameConfigurationStore) return null;
    const name = String(form.elements.namedItem("configuration_name")?.value || "").trim();
    if (!name) {
      form.elements.namedItem("configuration_name")?.focus();
      return null;
    }
    const description = String(
      form.elements.namedItem("configuration_description")?.value || ""
    ).trim();
    const settings = collectGameConfig(form);
    const saved = window.GameConfigurationStore.saveConfiguration({
      name,
      description,
      baseTemplate: settings.game_type,
      settings
    });
    const select = form.elements.namedItem("game_type");
    if (![...select.options].some(option => option.value === saved.config_id)) {
      select.add(new Option(`💾 ${saved.name}`, saved.config_id));
    }
    select.value = saved.config_id;
    form.dataset.gameType = saved.settings.game_type || saved.base_template;
    form.querySelector(".session-config-save")?.removeAttribute("open");
    return saved;
  }

  function memberCards(session) {
    const cards = session.members.map(member => `
      <li>
        <span class="session-member-token">${escapeHtml(roleLabel(member.assigned_role_id).slice(0, 2).toUpperCase())}</span>
        <span>
          <strong>${escapeHtml(roleLabel(member.assigned_role_id))}</strong>
          <small>${member.member_id === session.game_master_member_id ? "Game Master · " : ""}speler aanwezig</small>
        </span>
      </li>
    `);
    (session.virtual_agents || []).forEach(agent => {
      cards.push(`
        <li class="is-agent">
          <span class="session-member-token">AI</span>
          <span><strong>${escapeHtml(roleLabel(agent.role_id))}</strong><small>virtuele agent</small></span>
        </li>
      `);
    });
    return cards.join("");
  }

  function gameMasterRoleMarkup(session) {
    if (!session.is_game_master || session.status === "running") return "";
    const currentMember = session.members.find(
      member => member.member_id === session.current_member_id
    );
    const occupiedRoles = new Map(
      session.members.map(member => [member.assigned_role_id, member.member_id])
    );
    const options = session.required_role_ids.map(roleId => {
      const isCurrent = roleId === currentMember?.assigned_role_id;
      const isOccupiedByOther = occupiedRoles.has(roleId)
        && occupiedRoles.get(roleId) !== session.current_member_id;
      const suffix = isCurrent ? " (jouw huidige rol)" : isOccupiedByOther ? " (rolruil)" : "";
      return `<option value="${escapeHtml(roleId)}"${isCurrent ? " selected" : ""}>${escapeHtml(roleLabel(roleId) + suffix)}</option>`;
    }).join("");
    return `
      <div class="game-master-role-form">
        <label>
          <span>Jouw spelersrol</span>
          <select name="role_id" data-game-master-role-select>${options}</select>
        </label>
        <small>De keuze wordt direct opgeslagen. Kies je een bezette rol, dan krijgt die speler automatisch jouw huidige rol.</small>
      </div>
    `;
  }

  function gameMasterDifficultyMarkup(session) {
    if (!session.is_game_master || session.status === "running") return "";
    const level = session.difficulty_level || "normal";
    return `
      <div class="game-master-difficulty-form">
        <label>
          <span>Moeilijkheidsgraad · Systeemdruk &amp; Ruis</span>
          <select data-game-difficulty-select>${difficultyOptions(level)}</select>
        </label>
        <div class="difficulty-axis-summary" data-difficulty-summary>
          ${difficultyAxesMarkup(level)}
        </div>
        <small>Deze instelling geldt alleen voor deze gamesessie en wordt direct opgeslagen.</small>
      </div>
    `;
  }

  function gameMasterConfigMarkup(session) {
    if (!session.is_game_master || session.status === "running") return "";
    return `
      <form class="game-session-config-form" data-active-game-config>
        ${gameConfigFieldsMarkup(session.game_config)}
        <small>Deze spelregels gelden alleen voor deze gamesessie en worden direct opgeslagen.</small>
      </form>
    `;
  }

  function createSessionMarkup() {
    const draft = state.createSessionDraft;
    return `
      <form id="gameSessionCreateForm" class="game-session-create-form">
        <label>
          <span>Toegang</span>
          <select id="gameSessionType">
            <option value="closed"${draft.session_type === "closed" ? " selected" : ""}>Gesloten · alleen met gamecode</option>
            <option value="open"${draft.session_type === "open" ? " selected" : ""}>Open · zichtbaar en direct deelnemen</option>
            <option value="semi_closed"${draft.session_type === "semi_closed" ? " selected" : ""}>Semi-gesloten · zichtbaar, code vereist</option>
          </select>
        </label>
        <label>
          <span>Moeilijkheidsgraad · Systeemdruk &amp; Ruis</span>
          <select id="gameSessionDifficulty" data-create-difficulty-select>
            ${difficultyOptions(draft.difficulty_level)}
          </select>
        </label>
        <button class="primary-button"
                type="submit"
                data-create-game-session>Sessie aanmaken</button>
        <div class="difficulty-axis-summary" data-difficulty-summary>
          ${difficultyAxesMarkup(draft.difficulty_level)}
        </div>
        ${gameConfigFieldsMarkup(draft.game_config)}
      </form>
      <p class="manager-create-note">Alleen hier, in Beheer, kan een reguliere gamesessie worden aangemaakt.</p>
    `;
  }

  function sessionMarkup(session, context) {
    const vacancies = session.role_vacancies || [];
    const running = session.status === "running";
    if (context === "player" && running) {
      const currentMember = session.members.find(
        member => member.member_id === session.current_member_id
      );
      const assignedRole = roleLabel(currentMember?.assigned_role_id);
      const customerOrderLabel = session.game_config?.customer_order_mode === "free"
        ? "vrije klantorders"
        : "verplichte klantorders";
      const playModeLabel = session.game_config?.play_mode === "digital" ? "digitaal" : "fysiek";
      return `
        <div class="player-running-session">
          <span class="session-member-token">${escapeHtml(assignedRole.slice(0, 2).toUpperCase())}</span>
          <span>
            <strong>${escapeHtml(assignedRole)}</strong>
            <small>Gamesessie gestart · ${playModeLabel} · ${customerOrderLabel}${session.virtual_agents?.length ? ` · ${session.virtual_agents.length} virtuele agents actief` : ""}</small>
          </span>
        </div>
      `;
    }
    const canRequest = !running && (!session.consensus || session.consensus.status !== "open");
    return `
      <div class="active-game-session">
        <div class="game-code-block">
          <span>Gamecode</span>
          <strong>${escapeHtml(session.join_code)}</strong>
          <button type="button" data-copy-game-code="${escapeHtml(session.join_code)}">Kopieer code</button>
        </div>
        <div class="session-facts">
          <span>${session.game_config?.play_mode === "digital" ? "Digitaal" : "Fysiek"}</span>
          <span>${escapeHtml(TYPE_LABELS[session.session_type])}</span>
          <span>${escapeHtml(difficultyLevel(session.difficulty_level).label)}</span>
          <span>${escapeHtml(GAME_CONFIG_PRESETS[session.game_config?.game_type]?.label || "LO Game 4")}</span>
          <span>${session.game_config?.customer_order_mode === "free" ? "Vrije klantorders" : "Verplichte klantorders"}</span>
          <span>${session.game_config?.multiple_colors
            ? `Meerdere kleuren · ${(session.game_config.editable_color_layers || []).length}/4 lagen`
            : "Klassieke kleuren"}</span>
          <span>${session.members.length}/${session.required_role_ids.length} spelers</span>
          <span>${session.is_game_master ? "Jij bent Game Master" : "Game Master aanwezig"}</span>
        </div>
        ${gameMasterConfigMarkup(session)}
        ${gameMasterDifficultyMarkup(session)}
        ${gameMasterRoleMarkup(session)}
        <ul class="session-member-list">${memberCards(session)}</ul>
        ${vacancies.length ? `
          <div class="session-vacancies">
            <strong>Nog niet bezet</strong>
            <p>${vacancies.map(roleLabel).map(escapeHtml).join(" · ")}</p>
          </div>
        ` : ""}
        ${running ? `
          <p class="session-running-message">De gamesessie is gestart${session.virtual_agents?.length ? ` met ${session.virtual_agents.length} virtuele agents` : ""}.</p>
        ` : canRequest ? `
          <button class="primary-button" type="button" data-request-game-start>
            ${vacancies.length ? "Verzoek om nu te starten" : "Game starten"}
          </button>
        ` : `
          <p class="session-vote-progress">Startverzoek loopt: ${session.consensus.approved_member_ids.length}/${session.consensus.required_member_ids.length} akkoord.</p>
        `}
        ${context === "manager" && session.is_game_master ? `
          <button class="session-finish-button" type="button" data-finish-game-session>Sessie sluiten</button>
        ` : ""}
        ${context === "manager" ? "<small>Nieuwe sessies kunnen uitsluitend vanuit deze beheerpagina worden aangemaakt.</small>" : ""}
      </div>
    `;
  }

  function availableMarkup(availability) {
    const games = availability?.discoverable_sessions || availability?.open_sessions || [];
    return `
      <form class="game-code-join-form" data-game-code-join>
        <label>
          <span>Gamecode</span>
          <input name="join_code" minlength="6" maxlength="10" autocomplete="off" placeholder="Bijv. A1B2C3" required>
        </label>
        <button class="primary-button" type="submit">Deelnemen</button>
      </form>
      ${games.length ? `
        <div class="open-game-list">
          <strong>Open games met plek</strong>
          ${games.map(game => game.session_type === "open" ? `
            <button type="button" data-join-session="${escapeHtml(game.session_id)}">
              <span>${escapeHtml(TYPE_LABELS[game.session_type])} sessie</span>
              <strong>${game.member_count}/${game.capacity} spelers</strong>
              <small>${game.available_places} plaatsen vrij</small>
            </button>
          ` : `
            <div class="discoverable-game">
              <span>${escapeHtml(TYPE_LABELS[game.session_type])} sessie</span>
              <strong>${game.member_count}/${game.capacity} spelers</strong>
              <small>Gebruik de gedeelde gamecode om deel te nemen.</small>
            </div>
          `).join("")}
        </div>
      ` : `
        <p class="no-open-games">Er is nu geen open game met een vrije plek.</p>
      `}
      ${availability?.can_start_free_game ? `
        <button class="free-game-button" type="button" data-start-free-game>
          <strong>Vrije game starten</strong>
          <span>Je wordt automatisch Game Master van de nieuwe sessie.</span>
        </button>
      ` : ""}
    `;
  }

  function renderConsensus() {
    const els = elements();
    const consensus = state.session?.consensus;
    const memberId = state.session?.current_member_id;
    const mustVote = consensus?.status === "open"
      && consensus.required_member_ids.includes(memberId)
      && !consensus.approved_member_ids.includes(memberId);
    els.dialog.hidden = !mustVote;
    if (!mustVote) return;
    els.dialogSummary.textContent = `${state.session.role_vacancies.length} ontbrekende rollen worden alleen na ieders akkoord door agents ingevuld.`;
  }

  function placePlayerSessionPanel(running) {
    const els = elements();
    if (!els.playerPanel || !els.playerUtilityActions) return;
    if (running) {
      const characterButton = els.playerUtilityActions.querySelector("[data-character-edit]");
      els.playerPanel.classList.add("is-utility-session");
      els.playerUtilityActions.insertBefore(els.playerPanel, characterButton);
      return;
    }
    els.playerPanel.classList.remove("is-utility-session");
    els.playerUtilityActions.after(els.playerPanel);
  }

  function render() {
    const els = elements();
    if (!state.authenticated) return;
    const openPlayerIndices = Array.from(els.playerContent.querySelectorAll("details"))
      .map((el, i) => el.hasAttribute("open") ? i : -1)
      .filter(i => i !== -1);
    const openManagerIndices = Array.from(els.managerContent.querySelectorAll("details"))
      .map((el, i) => el.hasAttribute("open") ? i : -1)
      .filter(i => i !== -1);

    if (state.session) {
      placePlayerSessionPanel(state.session.status === "running");
      els.playerTitle.textContent = state.session.status === "running"
        ? "Jouw actieve gamesessie"
        : "Lobby van jouw gamesessie";
      els.playerBadge.textContent = state.session.status === "running" ? "Gestart" : "In lobby";
      els.managerBadge.textContent = state.session.is_game_master ? "Game Master" : "Deelnemer";
      els.playerContent.innerHTML = sessionMarkup(state.session, "player");
      els.managerContent.innerHTML = sessionMarkup(state.session, "manager");
      if (state.session.status === "running" && state.startedSessionId !== state.session.session_id) {
        state.startedSessionId = state.session.session_id;
        window.dispatchEvent(new CustomEvent("learngame-session-started", {
          detail: { session: state.session }
        }));
      }
    } else {
      placePlayerSessionPanel(false);
      els.playerTitle.textContent = "Neem deel aan een gamesessie";
      els.playerBadge.textContent = "Geen sessie";
      els.managerBadge.textContent = "Geen sessie";
      els.playerContent.innerHTML = availableMarkup(state.availability);
      if (!els.managerContent.querySelector("#gameSessionCreateForm .session-config-save")) {
        els.managerContent.innerHTML = createSessionMarkup();
      }
    }
    const playerDetails = els.playerContent.querySelectorAll("details");
    openPlayerIndices.forEach(i => playerDetails[i]?.setAttribute("open", ""));

    const managerDetails = els.managerContent.querySelectorAll("details");
    openManagerIndices.forEach(i => managerDetails[i]?.setAttribute("open", ""));
    renderConsensus();
    window.dispatchEvent(new CustomEvent("learngame-session-state", {
      detail: {
        session: state.session,
        running: state.session?.status === "running"
      }
    }));
  }

  async function refresh() {
    if (!state.authenticated || state.busy) return;
    const refreshVersion = state.mutationVersion;
    try {
      const availability = await request("/v1/game-sessions/availability");
      if (refreshVersion !== state.mutationVersion) return;
      state.availability = availability;
      state.session = availability.current_session;
      render();
    } catch (error) {
      if (!state.session) {
        elements().playerContent.innerHTML = `<p class="session-error">${escapeHtml(error.message)}</p>`;
      } else {
        console.warn("Gamesessie verversen mislukt:", error);
      }
    }
  }

  function pendingConfigOverlay() {
    if (!state.session || !state.pendingGameConfig) return;
    state.session = {
      ...state.session,
      game_config: { ...state.pendingGameConfig }
    };
  }

  async function performMutation(path, body) {
    state.busy = true;
    state.mutationVersion += 1;
    try {
      state.session = await request(path, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if (state.session.status === "finished") {
        state.session = null;
      }
      pendingConfigOverlay();
      render();
      try {
        await refreshAfterMutation();
        pendingConfigOverlay();
        render();
      } catch (refreshError) {
        // De mutatie is al bevestigd door de server. Houd dat resultaat
        // zichtbaar en meld een mislukte naverfrissing niet als mislukte actie.
        console.warn("Gamesessie is bijgewerkt, maar verversen mislukte:", refreshError);
      }
    } catch (error) {
      if (
        error.status === 409
        && new Set([
          "Je neemt al deel aan een actieve gamesessie.",
          "Je neemt al deel aan een lobby of actieve gamesessie."
        ]).has(error.message)
      ) {
        try {
          await refreshAfterMutation();
          render();
          if (state.session) return;
        } catch (refreshError) {
          console.warn("De bestaande gamesessie kon niet worden opgehaald:", refreshError);
        }
      }
      window.alert(error.message);
    } finally {
      state.busy = false;
    }
  }

  function mutate(path, body) {
    const operation = () => performMutation(path, body);
    state.mutationQueue = state.mutationQueue.then(operation, operation);
    return state.mutationQueue;
  }

  async function queueGameConfigSave(gameConfig) {
    state.pendingGameConfig = { ...gameConfig };
    if (state.savingGameConfig || !state.session) return;
    state.savingGameConfig = true;
    try {
      while (state.pendingGameConfig && state.session) {
        const nextConfig = state.pendingGameConfig;
        state.pendingGameConfig = null;
        await mutate(
          `/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/configuration`,
          { game_config: nextConfig }
        );
      }
    } finally {
      state.savingGameConfig = false;
      if (state.pendingGameConfig && state.session) {
        queueGameConfigSave(state.pendingGameConfig);
      }
    }
  }

  async function refreshAfterMutation() {
    state.availability = await request("/v1/game-sessions/availability");
    state.session = state.availability.current_session;
  }

  function createSessionFromForm(form) {
    if (!form || state.busy) return false;
    const type = form.querySelector("#gameSessionType")?.value || "closed";
    const difficulty = form.querySelector("#gameSessionDifficulty")?.value || "normal";
    const gameConfig = collectGameConfig(form);
    state.createSessionDraft = {
      session_type: type,
      difficulty_level: difficulty,
      game_config: { ...gameConfig }
    };
    mutate("/v1/game-sessions", {
      session_type: type,
      difficulty_level: difficulty,
      game_config: gameConfig
    });
    return true;
  }

  function wire() {
    document.addEventListener("submit", event => {
      if (event.target.matches("#gameSessionCreateForm")) {
        event.preventDefault();
        createSessionFromForm(event.target);
      }
      if (event.target.matches("[data-game-code-join]")) {
        event.preventDefault();
        const code = new FormData(event.target).get("join_code");
        mutate("/v1/game-sessions/join", { join_code: String(code || "").toUpperCase() });
      }
    }, true);
    document.addEventListener("click", event => {
      const saveConfigurationButton = event.target.closest("[data-save-session-config]");
      if (saveConfigurationButton) {
        event.preventDefault();
        saveSessionConfiguration(saveConfigurationButton.closest("form"));
        return;
      }
      const createButton = event.target.closest("[data-create-game-session]");
      if (!createButton) return;
      event.preventDefault();
      createSessionFromForm(createButton.closest("#gameSessionCreateForm"));
    }, true);
    document.addEventListener("input", event => {
      const createForm = event.target.closest("#gameSessionCreateForm");
      if (!createForm) return;
      if (
        event.target.matches("[data-game-config-control]")
        && !event.target.matches("[data-session-game-type]")
      ) {
        updateHybridProductionTooltip(createForm);
        updateColorLayerControls(createForm);
        const config = collectGameConfig(createForm);
        syncGameConfigurationSelection(createForm, config);
        state.createSessionDraft.game_config = config;
      } else if (event.target.matches("[data-create-difficulty-select]")) {
        state.createSessionDraft.difficulty_level = String(event.target.value || "normal");
      } else if (event.target.matches("#gameSessionType")) {
        state.createSessionDraft.session_type = String(event.target.value || "closed");
      }
    });
    document.addEventListener("change", event => {
      if (event.target.matches("[data-game-config-control]")) {
        const form = event.target.closest("form");
        if (event.target.matches("[data-session-game-type]")) {
          applyGameConfigPreset(form, event.target.value);
        }
        updateColorLayerControls(form);
        const config = collectGameConfig(form);
        syncGameConfigurationSelection(form, config);
        if (form?.matches("#gameSessionCreateForm")) {
          state.createSessionDraft.game_config = config;
        }
        if (form?.matches("[data-active-game-config]") && state.session) {
          queueGameConfigSave(config);
        }
        return;
      }
      if (event.target.matches("[data-create-difficulty-select]")) {
        state.createSessionDraft.difficulty_level = String(event.target.value || "normal");
        const summary = event.target.closest("form")?.querySelector("[data-difficulty-summary]");
        if (summary) summary.innerHTML = difficultyAxesMarkup(event.target.value);
        return;
      }
      if (event.target.matches("#gameSessionType")) {
        state.createSessionDraft.session_type = String(event.target.value || "closed");
        return;
      }
      if (event.target.matches("[data-game-master-role-select]") && state.session) {
        mutate(
          `/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/game-master-role`,
          { role_id: String(event.target.value || "") }
        );
        return;
      }
      if (event.target.matches("[data-game-difficulty-select]") && state.session) {
        mutate(
          `/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/difficulty`,
          { difficulty_level: String(event.target.value || "normal") }
        );
      }
    });
    document.addEventListener("click", event => {
      const target = event.target.closest("button");
      if (!target) return;
      if (target.dataset.joinSession) {
        mutate("/v1/game-sessions/join", { session_id: target.dataset.joinSession });
      } else if (target.hasAttribute("data-start-free-game")) {
        mutate("/v1/game-sessions/free");
      } else if (target.hasAttribute("data-request-game-start") && state.session) {
        mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/start-requests`);
      } else if (target.hasAttribute("data-finish-game-session") && state.session) {
        if (window.confirm("Wil je deze gamesessie sluiten?")) {
          mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/finish`);
        }
      } else if (target.dataset.copyGameCode) {
        navigator.clipboard?.writeText(target.dataset.copyGameCode);
        target.textContent = "Gekopieerd";
      }
    });
    elements().waitButton?.addEventListener("click", () => {
      if (state.session) mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/consensus`, { decision: "wait" });
    });
    elements().startButton?.addEventListener("click", () => {
      if (state.session) mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/consensus`, { decision: "start_with_agents" });
    });
    window.addEventListener("leerpret-auth-changed", event => {
      state.authenticated = Boolean(event.detail?.authenticated);
      state.apiBase = event.detail?.apiBase || "";
      if (!state.authenticated) return;
      refresh();
      clearInterval(state.pollTimer);
      state.pollTimer = setInterval(refresh, 3000);
    });
  }

  wire();

  // Authentication can finish before this module has registered its event
  // listener. Recover the current session so the manager form never remains
  // stuck on the static fallback markup.
  const initialAuthSession = window.LeerpretAuth?.getSession?.();
  if (initialAuthSession?.authenticated) {
    state.authenticated = true;
    state.apiBase = initialAuthSession.apiBase || "";
    refresh();
    clearInterval(state.pollTimer);
    state.pollTimer = setInterval(refresh, 3000);
  }
})();
