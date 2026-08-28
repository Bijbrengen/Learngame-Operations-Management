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
    mfp: "Magazijn Gereed Product",
    ssf: "Magazijn Gereed Product",
    customer: "Klant",
    logistics_manager: "Logistiek Manager",
    operations: "Operations",
    raw_warehouse: "Magazijn Grondstoffen",
    production_1: "Productie Afdeling 1",
    production_2: "Productie Afdeling 2",
    production_3: "Productie Afdeling 3",
    production_a: "Afdeling Toren A",
    production_b: "Afdeling Toren B",
    production_c: "Afdeling Toren C",
    finished_warehouse: "Magazijn Gereed Product",
    sales: "Verkoop / Sales Director",
    finance: "Financiële Administratie",
    supplier: "Leverancier Grondstoffen",
    transporter: "Transporteur / Freight Forwarder"
  };
  const SESSION_ROLE_OPTIONS = Object.freeze([
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
  ]);
  const TYPE_LABELS = {
    closed: "Gesloten",
    open: "Open",
    semi_closed: "Semi-gesloten"
  };
  const MOBILE_PLAY_MESSAGE = "Op dit apparaat kun je alleen als speler deelnemen aan een bestaande fysieke gamesessie. Een sessie aanmaken of beheren, de tutorial en digitale gamesessies werken alleen op een computer of laptop met muis.";
  const MOBILE_SESSION_CREATION_MESSAGE = "Op dit apparaat kun je geen gamesessie aanmaken. Neem als speler deel aan een bestaande fysieke sessie of gebruik een computer of laptop.";
  const SESSION_INSTANCE_ID = `session-${globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
  const MONEY_PRESET_GAMES = new Set([
    "entrepreneurial", "lo4", "lo5", "lo6", "lo7", "lo8", "le_training"
  ]);
  const REVENUE_BALANCE_PRESET_GAMES = new Set([
    "entrepreneurial", "lo5", "lo6", "lo7", "lo8", "le_training"
  ]);
  const PRODUCTION_PLANNING_PRESET_GAMES = new Set(["lo5", "lo6", "lo7", "lo8"]);
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
      organization_model: "independent_enterprises",
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
      role_freedom: false, organization_model: "school_learning_path",
      funding_incentive: "financing",
      multiple_colors: true,
      editable_color_layers: ["groundPlate", "layer1", "layer2", "layer3"],
      price_mode: "fixed", logistics_organization: "product",
      production_processes: ["parallel", "sequential"],
      product_type_count: 3, customer_order_mode: "required"
    }
  };
  window.GameVariantHistory?.derived.forEach(definition => {
    const base = GAME_CONFIG_PRESETS[definition.basePreset];
    if (!base || GAME_CONFIG_PRESETS[definition.id]) return;
    GAME_CONFIG_PRESETS[definition.id] = {
      ...base,
      ...definition.settings,
      label: definition.label
    };
    if (GAME_CONFIG_PRESETS[definition.id].money) MONEY_PRESET_GAMES.add(definition.id);
    if (
      REVENUE_BALANCE_PRESET_GAMES.has(definition.basePreset)
      || GAME_CONFIG_PRESETS[definition.id].revenue_balance_enabled === true
    ) {
      REVENUE_BALANCE_PRESET_GAMES.add(definition.id);
    }
    if (["lo5b", "lo7_digital", "lo9"].includes(definition.id)) {
      PRODUCTION_PLANNING_PRESET_GAMES.add(definition.id);
    }
  });
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
    refreshPromise: null,
    finishConfirmationUntil: 0,
    finishConfirmationTimer: null,
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
    startedSessionId: null,
    selectedSessionId: null,
    actionError: "",
    actionErrorNeedsAnnouncement: false
  };

  const elements = () => ({
    playerPanel: document.getElementById("playerSessionPanel"),
    playerMetricMount: document.getElementById("playerSessionMetricMount"),
    playerWorkbench: document.getElementById("playerWorkbench"),
    logisticsGameMount: document.getElementById("logisticsGameMount"),
    playerTitle: document.getElementById("playerSessionTitle"),
    playerContent: document.getElementById("playerSessionContent"),
    playerBadge: document.getElementById("playerSessionBadge"),
    managerContent: document.getElementById("managerSessionContent"),
    managerTitle: document.getElementById("managerSessionTitle"),
    managerBadge: document.getElementById("managerSessionBadge"),
    managerHeadingActions: document.querySelector(".game-session-heading-actions"),
    managerCreateButton: document.getElementById("managerSessionActionButton"),
    topPeopleButton: document.getElementById("topPeopleButton"),
    topPeopleCount: document.getElementById("topPeopleCount"),
    topAgentsButton: document.getElementById("topAgentsButton"),
    topAgentCount: document.getElementById("topAgentCount"),
    topSessionControls: document.getElementById("topSessionControls"),
    topSessionStatusButton: document.getElementById("topSessionStatusButton"),
    topSessionStatusValue: document.getElementById("topSessionStatusValue"),
    topSessionStatusTitle: document.getElementById("topSessionStatusTitle"),
    topSessionStatusCounts: document.getElementById("topSessionStatusCounts"),
    topSessionParticipationText: document.getElementById("topSessionParticipationText"),
    topSessionStopButton: document.getElementById("topSessionStopButton"),
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

  function deviceCapabilities() {
    return window.LOMDeviceCapabilities?.current?.() || {
      isMobileDevice: false,
      supportsDigitalPlay: true,
      supportsTutorial: true,
      supportsGameManagement: true,
      supportsSessionCreation: true
    };
  }

  function supportsDigitalPlay() {
    return deviceCapabilities().supportsDigitalPlay !== false;
  }

  function supportsSessionCreation() {
    const capabilities = deviceCapabilities();
    return capabilities.isMobileDevice !== true
      && capabilities.supportsDigitalPlay !== false
      && capabilities.supportsGameManagement !== false
      && capabilities.supportsSessionCreation !== false;
  }

  function supportsGameManagement() {
    const capabilities = deviceCapabilities();
    return capabilities.isMobileDevice !== true
      && capabilities.supportsDigitalPlay !== false
      && capabilities.supportsGameManagement !== false;
  }

  function availabilityPath() {
    return "/v1/game-sessions/availability"
      + `?contract_version=2&supports_digital_play=${supportsDigitalPlay()}`;
  }

  function freeGamePath() {
    return `/v1/game-sessions/free?supports_digital_play=${supportsDigitalPlay()}`;
  }

  function sessionPlayMode(session) {
    const value = session?.play_mode || session?.game_config?.play_mode;
    return value === "physical" || value === "digital" ? value : null;
  }

  function sessionSupportedOnDevice(session) {
    const playMode = sessionPlayMode(session);
    return window.LOMDeviceCapabilities?.supportsSession?.(playMode, deviceCapabilities())
      ?? (supportsDigitalPlay() || playMode === "physical");
  }

  function mobilePlayNoticeMarkup({ blocking = false } = {}) {
    if (supportsDigitalPlay()) return "";
    return `
      <aside class="mobile-play-notice${blocking ? " is-blocking" : ""}"
             role="note">
        <strong>Op dit apparaat ben je alleen speler</strong>
        <p>${escapeHtml(MOBILE_PLAY_MESSAGE)}</p>
      </aside>
    `;
  }

  function isTransientRequestError(error) {
    const message = String(error?.message || error || "");
    return error?.name === "AbortError"
      || error?.status === 503
      || /signal is aborted|operation was aborted|service tijdelijk ge.{0,4}soleerd/i.test(message);
  }

  function isStaleSessionStateError(error) {
    return error?.code === "consensus_not_open"
      || (error?.status === 409 && error?.message === "Er staat geen startverzoek open.");
  }

  function recoverLocalApiBase() {
    return window.LEARNGAME_OM_CONFIG?.configuredApiBase
      || window.LEARNGAME_OM_CONFIG?.apiBase
      || null;
  }

  async function request(path, options = {}, allowLocalRecovery = true) {
    const requestUrl = `${state.apiBase}${path}`;
    const response = await fetch(requestUrl, {
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Leerpret-Device-Kind": deviceCapabilities().deviceKind,
        "X-Leerpret-Game-Instance": SESSION_INSTANCE_ID,
        ...(options.headers || {})
      },
      service: "lom-game-sessions",
      timeoutMs: 30000,
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
      let code = null;
      let context = null;
      try {
        const raw = await response.text();
        const payload = raw ? JSON.parse(raw) : null;
        if (typeof payload?.detail === "string") {
          message = payload.detail;
        } else if (typeof payload?.detail?.message === "string") {
          message = payload.detail.message;
          code = payload.detail.code || null;
          context = payload.detail.context || null;
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
      error.code = code;
      error.context = context;
      throw error;
    }
    return response.json();
  }

  function roleLabel(roleId) {
    return ROLE_LABELS[roleId] || roleId || "Geen actieve rol";
  }

  function repairedLobbyRoleConfig(session) {
    if (!session?.is_game_master || !["lobby", "ready"].includes(session.status)) return null;
    const configuredRoles = session.game_config?.enabled_roles || session.required_role_ids || [];
    if (configuredRoles.length !== 1 || configuredRoles[0] !== "supplier") return null;
    const preset = window.GameConfigurationStore?.getConfiguration(session.game_config?.game_type);
    const presetRoles = preset?.settings?.enabled_roles || [];
    if (presetRoles.length <= 1) return null;
    const repairedRoles = window.LOMRuntimeRoles?.normalize(presetRoles) || [...presetRoles];
    const hasSupplier = typeof session.game_config?.has_supplier === "boolean"
      ? session.game_config.has_supplier
      : Boolean(preset?.settings?.has_supplier);
    return {
      ...session.game_config,
      enabled_roles: repairedRoles,
      has_supplier: hasSupplier
    };
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
    const explicitlyEmptyRoles = Array.isArray(config.enabled_roles)
      && config.enabled_roles.length === 0;
    const gameType = GAME_CONFIG_PRESETS[config.game_type] ? config.game_type : "lo4";
    const storedPresetSettings = window.GameConfigurationStore
      ?.getConfiguration(gameType)
      ?.settings || {};
    const merged = {
      ...GAME_CONFIG_PRESETS[gameType],
      ...storedPresetSettings,
      ...config
    };
    const productionProcesses = window.LogisticsProcess?.normalizeProcesses(
      merged.production_processes,
      gameType
    ) || ["parallel"];
    const multipleColors = Boolean(merged.multiple_colors);
    const money = Boolean(merged.money);
    const organizationModel = ["independent_enterprises", "school_learning_path"].includes(
      merged.organization_model
    ) ? merged.organization_model : "single_enterprise";
    const normalized = {
      ...merged,
      play_mode: merged.play_mode === "digital" ? "digital" : "physical",
      game_type: gameType,
      opening_balance_enabled: money && (
        merged.opening_balance_enabled === undefined
          ? MONEY_PRESET_GAMES.has(gameType)
          : Boolean(merged.opening_balance_enabled)
      ),
      revenue_balance_enabled: money && (
        merged.revenue_balance_enabled === undefined
          ? REVENUE_BALANCE_PRESET_GAMES.has(gameType)
          : Boolean(merged.revenue_balance_enabled)
      ),
      production_planning_enabled: merged.production_planning_enabled === undefined
        ? PRODUCTION_PLANNING_PRESET_GAMES.has(gameType)
        : Boolean(merged.production_planning_enabled),
      organization_model: organizationModel,
      funding_incentive: organizationModel === "school_learning_path"
        ? (["quality", "balanced", "financing"].includes(merged.funding_incentive)
          ? merged.funding_incentive
          : "financing")
        : "balanced",
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
    const stored = window.GameConfigurationStore?.normalizeSettings(normalized, gameType) || normalized;
    if (explicitlyEmptyRoles) stored.enabled_roles = [];
    if (Array.isArray(stored.enabled_roles)) {
      stored.enabled_roles = window.LOMRuntimeRoles?.normalize(stored.enabled_roles)
        || [...stored.enabled_roles];
    }
    return stored;
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
    const roles = SESSION_ROLE_OPTIONS.map(role => [role.id, role.label]);
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
      ["Organisatievorm", config => config.organization_model === "independent_enterprises"
        ? "Zelfstandige ondernemingen"
        : config.organization_model === "school_learning_path"
          ? "School / leertraject"
          : "Eén gezamenlijke organisatie", "text"],
      ["Parallelle productie", config => config.production_processes?.includes("parallel"), "bool"],
      ["Sequentiële productie", config => config.production_processes?.includes("sequential"), "bool"],
      ["Productgerichte organisatie", config => config.logistics_organization === "product", "bool"],
      ["Functionele organisatie", config => config.logistics_organization === "functional", "bool"],
      ["Tussenvoorraad", config => config.intermediate_stock, "bool"],
      ["Geld", config => config.money, "bool"],
      ["Openingsbalans", config => config.opening_balance_enabled, "bool"],
      ["Omzetbalans", config => config.revenue_balance_enabled, "bool"],
      ["Productieplanning", config => config.production_planning_enabled, "bool"],
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
    const settingsMarkup = `
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
    `;
    const rolesMarkup = `
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
    `;
    return { settings: settingsMarkup, roles: rolesMarkup };
  }

  function roleControls(form) {
    return [...(form?.elements || [])].filter(control => (
      control.matches?.('input[name^="role_"]')
    ));
  }

  function enforceRuntimeStationOwnership(form, preferredRoleId = null) {
    const controls = roleControls(form);
    const preferredStation = preferredRoleId
      ? window.LOMRuntimeRoles?.stationId(preferredRoleId)
      : null;
    if (preferredStation) {
      controls.forEach(control => {
        const roleId = control.name.slice("role_".length);
        if (roleId !== preferredRoleId && window.LOMRuntimeRoles?.stationId(roleId) === preferredStation) {
          control.checked = false;
        }
      });
    }
    const selected = controls
      .filter(control => control.checked)
      .map(control => control.name.slice("role_".length));
    const allowed = new Set(window.LOMRuntimeRoles?.normalize(selected) || selected);
    controls.forEach(control => {
      const roleId = control.name.slice("role_".length);
      if (control.checked && !allowed.has(roleId)) control.checked = false;
    });
    return [...allowed];
  }

  function roleSelectorMarkup(config = {}, formId = "gameSessionCreateForm") {
    const value = normalizedGameConfig(config);
    const grouped = SESSION_ROLE_OPTIONS.reduce((groups, role) => {
      if (!groups.has(role.category)) groups.set(role.category, []);
      groups.get(role.category).push(role);
      return groups;
    }, new Map());
    return `
      <div class="role-selector-board">
        <p class="role-selector-runtime-note">
          De digitale multiplayer heeft zeven onafhankelijke stations. Rollen binnen hetzelfde
          station zijn alternatieven; een nieuwe keuze vervangt daar de vorige spelerrol.
        </p>
        ${[...grouped.entries()].map(([category, roles]) => `
          <fieldset class="role-selector-category">
            <legend>${escapeHtml(category)}</legend>
            ${roles.map(role => {
              const isChecked = !value.enabled_roles || value.enabled_roles.includes(role.id);
              return `
                <label class="role-option-field">
                  <input type="checkbox"
                         name="role_${role.id}"
                         form="${escapeHtml(formId)}"
                         data-game-config-control
                         ${isChecked ? "checked" : ""}>
                  <span>${escapeHtml(role.label)}</span>
                </label>
              `;
            }).join("")}
          </fieldset>
        `).join("")}
      </div>
    `;
  }

  function renderGameAuxiliaryPanels(form, config = {}) {
    if (!form) return;
    if (!form.id) form.id = "gameSessionActiveConfigForm";
    const layoutConfig = normalizedGameConfig(config);
    const rolesHost = document.querySelector("[data-session-role-selector]");
    if (rolesHost) rolesHost.innerHTML = roleSelectorMarkup(config, form.id);
    const matrices = gameComparisonMatricesMarkup();
    const gamePresetsHost = document.querySelector("[data-game-presets-matrix]");
    const rolePresetsHost = document.querySelector("[data-role-presets-matrix]");
    if (gamePresetsHost) gamePresetsHost.innerHTML = matrices.settings;
    if (rolePresetsHost) rolePresetsHost.innerHTML = matrices.roles;
    const layoutHost = document.querySelector("[data-session-layout-host]");
    if (layoutHost) {
      layoutHost.innerHTML = `
        <section class="configuration-layout-preview"
                 data-configuration-layout-preview
                 aria-label="Live opstelling voor gekozen gamepreset">
          <div class="session-layout-lego"
               data-session-layout-lego
               aria-label="Actuele logistieke opstelling in LEGO-blokken">
            <p class="session-layout-loading">LEGO-opstelling wordt geladen…</p>
          </div>
          <details class="session-layout-config-summary">
            <summary>Bekijk schematische configuratie</summary>
            <div data-session-layout-config>
              ${window.ConfigurationLayoutPreview?.markup(layoutConfig) || ""}
            </div>
          </details>
        </section>
      `;
      window.LOMLogisticsScene?.mountSessionLayout?.(layoutConfig);
    }
  }

  function updateConfigurationLayout(form, config = null) {
    const host = document.querySelector("[data-session-layout-host] [data-session-layout-config]");
    if (!host) return;
    const layoutConfig = normalizedGameConfig(config || collectGameConfig(form));
    host.innerHTML = window.ConfigurationLayoutPreview?.markup(layoutConfig) || "";
    window.LOMLogisticsScene?.mountSessionLayout?.(layoutConfig);
  }

  function sessionCoreFieldsMarkup(draft) {
    return `
      <div class="session-core-fields">
        <label data-config-help="session-access">
          <span>Toegang</span>
          <select id="gameSessionType">
            <option value="closed"${draft.session_type === "closed" ? " selected" : ""}>Gesloten · alleen met gamecode</option>
            <option value="open"${draft.session_type === "open" ? " selected" : ""}>Open · zichtbaar en direct deelnemen</option>
            <option value="semi_closed"${draft.session_type === "semi_closed" ? " selected" : ""}>Semi-gesloten · zichtbaar, code vereist</option>
          </select>
        </label>
        <label data-config-help="difficulty">
          <span>Moeilijkheidsgraad</span>
          <select id="gameSessionDifficulty" data-create-difficulty-select>
            ${difficultyOptions(draft.difficulty_level)}
          </select>
        </label>
        <div class="difficulty-axis-summary" data-difficulty-summary>
          ${difficultyAxesMarkup(draft.difficulty_level)}
        </div>
      </div>
    `;
  }

  function gameConfigFieldsMarkup(config = {}, sessionFields = "") {
    const value = normalizedGameConfig(config);
    const digitalPlaySupported = supportsDigitalPlay();
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
    const helpIds = {
      money: "money",
      pnl: "pnl",
      intermediate_stock: "intermediate-stock",
      opportunity_costs: "opportunity-costs",
      role_freedom: "role-freedom",
      production_planning_enabled: "production-planning"
    };
    const toggle = (name, label, title = "") => `
      <label class="session-config-toggle"
             data-config-help="${helpIds[name] || name}"
             ${title ? ` title="${escapeHtml(title)}"` : ""}>
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
        <div class="session-config-select-board">
          <fieldset class="session-config-choice-group">
            <legend>Variant</legend>
            <label class="session-config-field session-play-mode" data-config-help="play-mode">
              <span>Spelmodus</span>
              <select name="play_mode" data-game-config-control>
                <option value="physical"${value.play_mode === "physical" ? " selected" : ""}>Fysiek · echte LEGO en administratief dashboard</option>
                <option value="digital"${value.play_mode === "digital" ? " selected" : ""}${digitalPlaySupported ? "" : " disabled"}>Digitaal · alleen op computer of laptop</option>
              </select>
              <small>${!digitalPlaySupported
                ? "Op dit apparaat kan alleen een fysieke gamesessie worden gebruikt."
                : value.play_mode === "digital"
                  ? "Bouwen, klaarleggen en transporteren gebeurt verplicht in de game."
                  : "Bouwen en transporteren gebeurt aan tafel; de game registreert de administratie."}</small>
            </label>
            <label class="session-config-field" data-config-help="game-type">
              <span>Gametype</span>
              <select name="game_type" data-session-game-type data-game-config-control>${gameTypeOptions}</select>
            </label>
            ${sessionFields}
          </fieldset>
          <fieldset class="session-config-choice-group">
            <legend>Organisatie</legend>
            <label class="session-config-field" data-config-help="organization-model">
              <span>Organisatievorm</span>
              <select name="organization_model" data-game-config-control>
                <option value="single_enterprise"${value.organization_model === "single_enterprise" ? " selected" : ""}>
                  Eén gezamenlijke organisatie · samenwerken als afdelingen
                </option>
                <option value="independent_enterprises"${value.organization_model === "independent_enterprises" ? " selected" : ""}>
                  Zelfstandige ondernemingen · handelen in een productieketen
                </option>
                <option value="school_learning_path"${value.organization_model === "school_learning_path" ? " selected" : ""}>
                  School / leertraject · budgetgedreven onderwijsproces
                </option>
              </select>
            </label>
            <label class="session-config-field"
                   data-school-funding-settings
                   data-config-help="funding-incentive"
                   ${value.organization_model === "school_learning_path" ? "" : "hidden"}>
              <span>Bekostigingsprikkel</span>
              <select name="funding_incentive" data-game-config-control>
                <option value="quality"${value.funding_incentive === "quality" ? " selected" : ""}>
                  Kwaliteit · snelle, goede doorstroom wordt beloond
                </option>
                <option value="balanced"${value.funding_incentive === "balanced" ? " selected" : ""}>
                  Gebalanceerd · kwaliteit en bekostiging wegen beide
                </option>
                <option value="financing"${value.funding_incentive === "financing" ? " selected" : ""}>
                  Financiering · leerlingvolume en verblijfsduur sturen het budget
                </option>
              </select>
              <small data-funding-incentive-preview></small>
            </label>
          </fieldset>
          <fieldset class="session-config-choice-group">
            <legend>Commercie</legend>
            <label class="session-config-field" data-config-help="customer-order">
              <span>Klantorder</span>
              <select name="customer_order_mode" data-game-config-control>
                <option value="free"${value.customer_order_mode === "free" ? " selected" : ""}>Vrij · klant kiest toren en aantal</option>
                <option value="required"${value.customer_order_mode === "required" ? " selected" : ""}>Verplicht · variant bepaalt de order</option>
              </select>
            </label>
            <label class="session-config-field" data-config-help="price">
              <span>Prijs</span>
              <select name="price_mode" data-game-config-control>
                <option value="fixed"${value.price_mode === "fixed" ? " selected" : ""}>Vast</option>
                <option value="free"${value.price_mode === "free" ? " selected" : ""}>Vrij</option>
              </select>
            </label>
          </fieldset>
        </div>
        <div class="session-config-checkbox-board">
          <fieldset class="session-config-choice-group">
            <legend>Financiën</legend>
            ${toggle("money", "Geld")}
            ${toggle("pnl", "Winst/verlies")}
            ${toggle("opportunity_costs", "Opportunity costs")}
          </fieldset>
          <fieldset class="session-config-choice-group">
            <legend>Logistiek</legend>
            ${toggle("intermediate_stock", "Tussenvoorraad")}
            ${toggle("has_supplier", "Leverancier actief")}
            ${toggle(
              "production_planning_enabled",
              "Productieplanning",
              "Toon het productieplan A/B/C, valideer de beschikbare grondstoffen en vergelijk plan met werkelijk gereed."
            )}
          </fieldset>
          <fieldset class="session-config-choice-group">
            <legend>Spelers</legend>
            ${toggle("role_freedom", "Rolvrijheid")}
            <fieldset class="session-config-field color-choice-settings" data-config-help="color-freedom">
              <legend>Kleurvrijheid</legend>
              <label class="session-config-toggle">
                <input type="checkbox"
                       name="multiple_colors"
                       data-multiple-colors
                       data-game-config-control
                       ${value.multiple_colors ? "checked" : ""}
                       ${window.GameConfigurationStore?.getVariantRules(value.game_type)?.colorModeEditable === false ? "disabled" : ""}>
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
              <small data-color-mode-note>LO-Games 1 t/m 5 gebruiken één vaste kleur; vanaf LO-Game 6 kan de spelleider meerdere kleuren kiezen.</small>
            </fieldset>
          </fieldset>
        </div>
        <div class="session-config-detail-board">
        <fieldset class="session-config-field financial-detail-settings"
                  data-financial-detail-settings
                  ${value.money ? "" : "hidden"}>
          <legend>Financiële verdieping</legend>
          <label class="session-config-toggle" data-config-help="opening-balance">
            <input type="checkbox"
                   name="opening_balance_enabled"
                   data-game-config-control
                   ${value.opening_balance_enabled ? "checked" : ""}
                   ${value.money ? "" : "disabled"}>
            <span>Openingsbalans</span>
          </label>
          <label class="session-config-toggle" data-config-help="revenue-balance">
            <input type="checkbox"
                   name="revenue_balance_enabled"
                   data-game-config-control
                   ${value.revenue_balance_enabled ? "checked" : ""}
                   ${value.money ? "" : "disabled"}>
            <span>Omzetbalans</span>
          </label>
          <small data-financial-advisor-preview>
            ${value.revenue_balance_enabled
              ? "Adviseur: omzet wordt met begin- en eindpositie vergeleken; dit maakt het effect op liquiditeit en resultaat zichtbaar."
              : value.opening_balance_enabled
                ? "Adviseur: de beginpositie maakt zichtbaar hoeveel financiële ruimte er vóór de eerste order beschikbaar is."
                : "Adviseur: alleen eenvoudige inkomsten, uitgaven en cashflow worden gevolgd."}
          </small>
        </fieldset>
        <fieldset class="session-config-field currency-settings is-wide"
                  data-currency-settings
                  title="Koersen zijn uitgedrukt als vreemde valuta per 1 eenheid van de basisvaluta."
                  ${value.money ? "" : "hidden"}>
          <legend>Valuta en wisselkoersen</legend>
          <label>
            <span>Basisvaluta</span>
            <select name="base_currency" data-game-config-control>
              ${["EUR", "USD", "GBP", "CHF", "JPY"].map(code => `
                <option value="${code}"${value.base_currency === code ? " selected" : ""}>${code}</option>
              `).join("")}
            </select>
          </label>
          <label class="session-config-toggle">
            <input type="checkbox"
                   name="multiple_currencies"
                   data-multiple-currencies
                   data-game-config-control
                   ${value.currency_mode === "multiple" ? "checked" : ""}>
            <span>Meerdere munteenheden</span>
          </label>
          <div class="currency-rate-options" data-currency-rate-options ${value.currency_mode === "multiple" ? "" : "hidden"}>
            ${["EUR", "USD", "GBP", "CHF", "JPY"].map(code => `
              <label>
                <input type="checkbox"
                       name="currency_${code}_enabled"
                       data-currency-enabled="${code}"
                       data-game-config-control
                       ${(value.enabled_currencies || []).includes(code) ? "checked" : ""}>
                <span>${code}</span>
                <input type="number"
                       name="exchange_rate_${code}"
                       min="0.0001"
                       step="0.0001"
                       value="${Number(value.exchange_rates?.[code] || 1)}"
                       aria-label="Wisselkoers ${code} per eenheid basisvaluta"
                       data-game-config-control>
              </label>
            `).join("")}
          </div>
        </fieldset>
        <fieldset class="session-config-field production-process-fields">
          <legend>Productieroutes</legend>
          <label class="session-config-toggle" data-config-help="parallel-production">
            <input type="checkbox" name="parallel_production" data-production-process data-game-config-control ${hasParallel ? "checked" : ""}>
            <span>Parallelle productie</span>
          </label>
          <label class="session-config-toggle" data-config-help="sequential-production">
            <input type="checkbox" name="sequential_production" data-production-process data-game-config-control ${hasSequential ? "checked" : ""}>
            <span>Sequentiële productie</span>
          </label>
          <small data-hybrid-production-tooltip
                 title="Hybride productie is toegestaan als aangepaste configuratie, maar is nog geen bestaande preset."
                 ${isHybrid ? "" : "hidden"}>
            Hybride productie · aangepaste configuratie, nog geen preset
          </small>
        </fieldset>
        <label class="session-config-field" data-config-help="product-types">
          <span>Torensoorten</span>
          <input name="product_type_count"
                 type="number"
                 min="1"
                 max="9"
                 value="${value.product_type_count}"
                 data-game-config-control
                 ${window.GameConfigurationStore?.getVariantRules(value.game_type)?.productTypeCountEditable === false ? "disabled" : ""}>
          <small data-product-type-note></small>
        </label>
        </div>
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
                  <td>Schoolmatrix · parallel + sequentieel (budget/lumpsum)</td>
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
    renderGameAuxiliaryPanels(form, settings);
    const gameType = settings.game_type || configurationId;
    form.dataset.gameType = gameType;
    Object.entries(settings).forEach(([name, value]) => {
      const control = form.elements.namedItem(name);
      if (!control) return;
      if (control.type === "checkbox") control.checked = Boolean(value);
      else control.value = String(value);
    });
    const playModeControl = form.elements.namedItem("play_mode");
    const preservesExistingDigitalSession = form.matches("[data-active-game-config]")
      && state.session?.game_config?.play_mode === "digital";
    if (
      playModeControl?.value === "digital"
      && !supportsDigitalPlay()
      && !preservesExistingDigitalSession
    ) {
      playModeControl.value = "physical";
    }
    const processes = window.LogisticsProcess?.normalizeProcesses(
      settings.production_processes,
      gameType
    ) || ["parallel"];
    form.elements.namedItem("parallel_production").checked = processes.includes("parallel");
    form.elements.namedItem("sequential_production").checked = processes.includes("sequential");
    if (Array.isArray(settings.enabled_roles)) {
      const enabledRoles = new Set(
        window.LOMRuntimeRoles?.normalize(settings.enabled_roles) || settings.enabled_roles
      );
      roleControls(form).forEach(control => {
        control.checked = enabledRoles.has(control.name.slice("role_".length));
      });
    }
    if (form.elements.namedItem("has_supplier")) {
      form.elements.namedItem("has_supplier").checked = Boolean(settings.has_supplier);
    }
    updateHybridProductionTooltip(form);
    updateFinancialDetailControls(form);
    updateSchoolFundingControls(form);
    const editableColorLayers = new Set(settings.editable_color_layers || []);
    form.querySelectorAll("[data-color-layer]").forEach(control => {
      control.checked = editableColorLayers.has(control.dataset.colorLayer);
    });
    updateColorLayerControls(form);
    updateVariantConstraintControls(form);
    updateSupplierRoleControl(form);
    enforceRuntimeStationOwnership(form);
    updateCurrencyControls(form);
    updateConfigurationLayout(form);
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
    const rules = window.GameConfigurationStore?.getVariantRules(form.dataset.gameType);
    const multipleColors = form.elements.namedItem("multiple_colors");
    const editable = rules?.colorModeEditable !== false;
    if (multipleColors) {
      multipleColors.disabled = !editable;
      if (!editable) multipleColors.checked = false;
    }
    const enabled = editable && Boolean(multipleColors?.checked);
    const layerOptions = form.querySelector("[data-editable-color-layers]");
    if (layerOptions) layerOptions.hidden = !enabled;
    form.querySelectorAll("[data-color-layer]").forEach(control => {
      control.disabled = !enabled;
    });
  }

  function updateVariantConstraintControls(form) {
    if (!form) return;
    const rules = window.GameConfigurationStore?.getVariantRules(form.dataset.gameType);
    const productCount = form.elements.namedItem("product_type_count");
    if (productCount && rules) {
      if (rules.fixedProductTypeCount !== null) {
        productCount.value = String(rules.fixedProductTypeCount);
      }
      productCount.disabled = !rules.productTypeCountEditable;
      const note = form.querySelector("[data-product-type-note]");
      if (note) {
        note.textContent = rules.productTypeCountEditable
          ? "Vrij instelbaar van 1 tot en met 9 vanaf LO-Game 6."
          : `Vast onderdeel van deze preset: ${rules.fixedProductTypeCount} torensoort${rules.fixedProductTypeCount === 1 ? "" : "en"}.`;
      }
    }
    updateColorLayerControls(form);
  }

  function updateSupplierRoleControl(form) {
    if (!form) return;
    const supplierEnabled = Boolean(form.elements.namedItem("has_supplier")?.checked);
    const supplierRole = form.elements.namedItem("role_supplier");
    if (supplierRole && !supplierEnabled) supplierRole.checked = false;
  }

  function updateCurrencyControls(form) {
    if (!form) return;
    const moneyEnabled = Boolean(form.elements.namedItem("money")?.checked);
    const multiple = moneyEnabled
      && Boolean(form.elements.namedItem("multiple_currencies")?.checked);
    const settings = form.querySelector("[data-currency-settings]");
    if (settings) settings.hidden = !moneyEnabled;
    const multipleControl = form.elements.namedItem("multiple_currencies");
    if (multipleControl) {
      multipleControl.disabled = !moneyEnabled;
      if (!moneyEnabled) multipleControl.checked = false;
    }
    const rateOptions = form.querySelector("[data-currency-rate-options]");
    if (rateOptions) rateOptions.hidden = !multiple;
    form.querySelectorAll("[data-currency-enabled], [name^='exchange_rate_']").forEach(control => {
      control.disabled = !multiple;
    });
  }

  function updateFinancialDetailControls(form) {
    if (!form) return;
    const moneyEnabled = Boolean(form.elements.namedItem("money")?.checked);
    const details = form.querySelector("[data-financial-detail-settings]");
    if (details) details.hidden = !moneyEnabled;
    const opening = form.elements.namedItem("opening_balance_enabled");
    const revenue = form.elements.namedItem("revenue_balance_enabled");
    [opening, revenue].forEach(control => {
      if (!control) return;
      control.disabled = !moneyEnabled;
      if (!moneyEnabled) control.checked = false;
    });
    updateCurrencyControls(form);
    const advice = form.querySelector("[data-financial-advisor-preview]");
    if (!advice) return;
    advice.textContent = !moneyEnabled
      ? "Adviseur: zonder Geld ligt de focus op doorstroom, kwaliteit en logistieke knelpunten."
      : revenue?.checked
        ? "Adviseur: omzet wordt met begin- en eindpositie vergeleken; dit maakt het effect op liquiditeit en resultaat zichtbaar."
        : opening?.checked
          ? "Adviseur: de beginpositie maakt zichtbaar hoeveel financiële ruimte er vóór de eerste order beschikbaar is."
          : "Adviseur: alleen eenvoudige inkomsten, uitgaven en cashflow worden gevolgd.";
  }

  function updateSchoolFundingControls(form) {
    if (!form) return;
    const isSchool = form.elements.namedItem("organization_model")?.value === "school_learning_path";
    const settings = form.querySelector("[data-school-funding-settings]");
    if (settings) settings.hidden = !isSchool;
    const incentive = form.elements.namedItem("funding_incentive");
    if (incentive) incentive.disabled = !isSchool;
    const preview = form.querySelector("[data-funding-incentive-preview]");
    if (!preview) return;
    preview.textContent = incentive?.value === "quality"
      ? "Goede en tijdige doorstroom levert de sterkste beloning op."
      : incentive?.value === "financing"
        ? "Leerlingvolume, extra verblijfsduur en ondersteuningsbehoefte vergroten de bekostiging; de simulatie maakt de spanning met onderwijskwaliteit zichtbaar."
        : "Budgetcontinuïteit en goede doorstroom tellen beide mee in de besluitvorming.";
  }

  function collectGameConfig(form) {
    const get = name => form.elements.namedItem(name);
    const selectedConfiguration = window.GameConfigurationStore?.getConfiguration(
      get("game_type")?.value
    );
    const requestedGameType = form.dataset.gameType
      || selectedConfiguration?.settings?.game_type
      || get("game_type")?.value
      || "lo4";
    const gameType = GAME_CONFIG_PRESETS[requestedGameType] ? requestedGameType : "lo4";
    form.dataset.gameType = gameType;
    const productionProcesses = selectedProductionProcesses(form, gameType);
    enforceRuntimeStationOwnership(form);
    const enabledRoles = roleControls(form)
      .filter(control => control.checked)
      .map(control => control.name.slice("role_".length));
    if (enabledRoles.length) {
      const note = form.querySelector(".role-selector-runtime-note.is-error");
      if (note) {
        note.classList.remove("is-error");
        note.removeAttribute("role");
        note.textContent = "De digitale multiplayer heeft zeven onafhankelijke stations. Rollen binnen hetzelfde station zijn alternatieven; een nieuwe keuze vervangt daar de vorige spelerrol.";
      }
    }
    updateHybridProductionTooltip(form);
    updateColorLayerControls(form);
    updateFinancialDetailControls(form);
    updateSchoolFundingControls(form);
    const multipleColors = Boolean(get("multiple_colors")?.checked);
    const hasSupplier = Boolean(get("has_supplier")?.checked);
    const requestedRoles = hasSupplier
      ? enabledRoles
      : enabledRoles.filter(roleId => roleId !== "supplier");
    const synchronizedRoles = window.LOMRuntimeRoles?.normalize(requestedRoles)
      || requestedRoles;
    const baseCurrency = String(get("base_currency")?.value || "EUR").toUpperCase();
    const currencyMode = get("multiple_currencies")?.checked ? "multiple" : "single";
    const selectedCurrencies = currencyMode === "multiple"
      ? [baseCurrency, ...[...form.querySelectorAll("[data-currency-enabled]")]
          .filter(control => control.checked)
          .map(control => control.dataset.currencyEnabled)]
      : [baseCurrency];
    const enabledCurrencies = [...new Set(selectedCurrencies)];
    const exchangeRates = Object.fromEntries(enabledCurrencies.map(code => [
      code,
      code === baseCurrency
        ? 1
        : Math.max(0.0001, Number(get(`exchange_rate_${code}`)?.value) || 1)
    ]));
    const organizationModel = get("organization_model")?.value === "independent_enterprises"
      ? "independent_enterprises"
      : get("organization_model")?.value === "school_learning_path"
        ? "school_learning_path"
        : "single_enterprise";
    return {
      play_mode: get("play_mode")?.value === "digital" ? "digital" : "physical",
      game_type: gameType,
      money: Boolean(get("money")?.checked),
      pnl: Boolean(get("pnl")?.checked),
      opening_balance_enabled: Boolean(get("money")?.checked)
        && Boolean(get("opening_balance_enabled")?.checked),
      revenue_balance_enabled: Boolean(get("money")?.checked)
        && Boolean(get("revenue_balance_enabled")?.checked),
      intermediate_stock: Boolean(get("intermediate_stock")?.checked),
      opportunity_costs: Boolean(get("opportunity_costs")?.checked),
      role_freedom: Boolean(get("role_freedom")?.checked),
      organization_model: organizationModel,
      funding_incentive: organizationModel === "school_learning_path"
        && ["quality", "balanced", "financing"].includes(get("funding_incentive")?.value)
        ? get("funding_incentive").value
        : "balanced",
      production_planning_enabled: Boolean(get("production_planning_enabled")?.checked),
      has_supplier: hasSupplier,
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
      currency_mode: currencyMode,
      base_currency: baseCurrency,
      enabled_currencies: enabledCurrencies,
      exchange_rates: exchangeRates,
      enabled_roles: synchronizedRoles
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
    form.dataset.gameType = GAME_CONFIG_PRESETS[config.game_type]
      ? config.game_type
      : GAME_CONFIG_PRESETS[form.dataset.gameType]
        ? form.dataset.gameType
        : "lo4";
    select.value = "custom_draft";
    return null;
  }

  function resetFinishConfirmation(button = elements().managerCreateButton) {
    state.finishConfirmationUntil = 0;
    clearTimeout(state.finishConfirmationTimer);
    state.finishConfirmationTimer = null;
    if (button?.hasAttribute("data-finish-game-session")) {
      button.textContent = "Sessie afsluiten";
    }
  }

  function requestFinishConfirmation(button) {
    if (state.finishConfirmationUntil > Date.now()) {
      resetFinishConfirmation(button);
      mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/finish`);
      return;
    }
    state.finishConfirmationUntil = Date.now() + 5000;
    button.textContent = "Nogmaals klikken om af te sluiten";
    clearTimeout(state.finishConfirmationTimer);
    state.finishConfirmationTimer = setTimeout(() => resetFinishConfirmation(button), 5000);
  }

  function saveSessionConfiguration(form) {
    if (!supportsGameManagement() || !form || !window.GameConfigurationStore) return null;
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
    document.querySelector(
      `.game-session-heading-actions .session-config-save[data-config-form-id="${form.id}"]`
    )?.removeAttribute("open");
    return saved;
  }

  function placePresetSaveAction(form, els) {
    const actions = els.managerHeadingActions;
    if (!actions) return;
    const current = actions.querySelector(".session-config-save");
    const presetSave = form?.querySelector(".session-config-save");
    if (!presetSave) {
      if (!form || current?.dataset.configFormId !== form.id) current?.remove();
      return;
    }
    current?.remove();
    presetSave.dataset.configFormId = form.id;
    presetSave.querySelectorAll("input, select, textarea, button").forEach(control => {
      control.setAttribute("form", form.id);
    });
    actions.insertBefore(presetSave, els.managerCreateButton || null);
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

  function sessionRoleDistributionMarkup(session) {
    const vacancies = new Set(session.role_vacancies || []);
    const agentsByRole = new Map(
      (session.virtual_agents || []).map(agent => [agent.role_id, agent])
    );
    const membersByRole = new Map(
      (session.members || [])
        .filter(member => member.assigned_role_id && member.present !== false)
        .map(member => [member.assigned_role_id, member])
    );
    const roles = (session.required_role_ids || []).map(roleId => {
      const agent = agentsByRole.get(roleId);
      const member = membersByRole.get(roleId);
      const vacant = vacancies.has(roleId) || (!agent && !member);
      const status = vacant ? "vacant" : agent ? "agent" : "human";
      const statusLabel = vacant
        ? "Nog niet vervuld"
        : agent
          ? "Virtuele agent"
          : member.member_id === session.game_master_member_id
            ? "Game Master · speler aanwezig"
            : "Speler aanwezig";
      return `
        <article class="session-role-state is-${status}">
          <span class="session-role-state-token">${escapeHtml(
            status === "agent" ? "AI" : roleLabel(roleId).slice(0, 2).toUpperCase()
          )}</span>
          <span>
            <strong>${escapeHtml(roleLabel(roleId))}</strong>
            <small>${escapeHtml(statusLabel)}</small>
          </span>
        </article>
      `;
    }).join("");
    const incomplete = vacancies.size > 0;
    return `
      <section class="session-role-distribution${incomplete ? " is-incomplete" : " is-complete"}"
               aria-label="Actieve rollenverdeling">
        <header>
          <div>
            <p class="eyebrow">Actieve rollen</p>
            <h3>Rollenverdeling</h3>
          </div>
          <strong>${incomplete
            ? `${vacancies.size} rol${vacancies.size === 1 ? "" : "len"} nog niet vervuld`
            : "Alle rollen zijn vervuld"}</strong>
        </header>
        <div class="session-role-state-grid">${roles}</div>
      </section>
    `;
  }

  function renderTopParticipation(session) {
    const els = elements();
    const visible = Boolean(session);
    const queued = ["waiting", "queued"].includes(session?.participation_status);
    const compactSessionVisible = Boolean(visible && session.status === "running" && !queued);
    const humanCount = visible
      ? (session.members || []).filter(member => member.present !== false).length
      : 0;
    const agentCount = visible ? (session.virtual_agents || []).length : 0;
    const capacity = visible
      ? Number(session.required_role_ids?.length || session.capacity || humanCount + agentCount)
      : 0;
    const currentMember = visible
      ? (session.members || []).find(member => member.member_id === session.current_member_id)
      : null;
    const assignedRole = currentMember?.assigned_role_id
      ? roleLabel(currentMember.assigned_role_id)
      : "Speler";
    const sessionType = visible
      ? (TYPE_LABELS[session.session_type] || session.session_type || "Game")
      : "Game";
    const creatorText = session?.created_by_current_player || session?.is_game_master
      ? " - door jou aangemaakt"
      : "";
    if (els.playerMetricMount) els.playerMetricMount.hidden = !compactSessionVisible;
    if (els.topSessionControls) els.topSessionControls.hidden = !compactSessionVisible;
    if (els.topSessionStatusValue) els.topSessionStatusValue.textContent = assignedRole;
    if (els.topSessionStatusTitle) {
      els.topSessionStatusTitle.textContent = `${sessionType} sessie - gestart${creatorText}`;
    }
    if (els.topSessionStatusCounts) {
      els.topSessionStatusCounts.textContent = `${humanCount}/${capacity} mensen - ${agentCount} agents`;
    }
    if (els.topSessionParticipationText) els.topSessionParticipationText.textContent = "Jij neemt deel";
    if (els.topSessionStatusButton) {
      els.topSessionStatusButton.setAttribute(
        "aria-label",
        `${sessionType} sessie gestart. Jouw rol: ${assignedRole}. Open sessie-overzicht.`
      );
    }
    if (els.topSessionStopButton) {
      els.topSessionStopButton.disabled = !compactSessionVisible;
    }
    if (els.topPeopleButton) {
      els.topPeopleButton.hidden = !visible;
      els.topPeopleButton.disabled = !visible;
      els.topPeopleButton.title = visible
        ? `${humanCount} van ${capacity} rollen zijn door mensen bezet. Open de sessie.`
        : "Open de actieve rollen in Sessie";
    }
    if (els.topAgentsButton) {
      els.topAgentsButton.hidden = !visible;
      els.topAgentsButton.disabled = !visible;
      els.topAgentsButton.title = visible
        ? `${agentCount} ${agentCount === 1 ? "virtuele agent neemt" : "virtuele agents nemen"} een rol over. Open de sessie.`
        : "Open de actieve rollen in Sessie";
    }
    if (els.topPeopleCount) els.topPeopleCount.textContent = String(humanCount);
    if (els.topAgentCount) els.topAgentCount.textContent = String(agentCount);
    document.querySelector(".metric-strip")?.classList.toggle("has-session", visible);
  }

  function gameMasterDifficultyMarkup(session) {
    if (!session.is_game_master || session.status === "running") return "";
    const level = session.difficulty_level || "normal";
    return `
      <div class="game-master-difficulty-form">
        <label data-config-help="difficulty">
          <span>Moeilijkheidsgraad</span>
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
    if (!session.is_game_master) return "";
    const running = session.status === "running";
    return `
      <form id="gameSessionActiveConfigForm"
            class="game-session-config-form${running ? " is-readonly" : ""}"
            data-active-game-config
            ${running ? 'data-session-config-readonly aria-label="Instellingen van de lopende gamesessie"' : ""}>
        ${gameConfigFieldsMarkup(session.game_config)}
        <small>${running
          ? "Dit zijn de vastgelegde instellingen van de lopende gamesessie."
          : "Deze spelregels gelden alleen voor deze gamesessie en worden direct opgeslagen."}</small>
      </form>
    `;
  }

  function setRunningConfigReadOnly(form, running) {
    if (!form || !running) return;
    form.querySelector(".session-config-save")?.remove();
    form.querySelectorAll("input, select, textarea").forEach(control => {
      control.disabled = true;
    });
    document.querySelectorAll(`[form="${form.id}"]`).forEach(control => {
      if (!control.matches(".configuration-help-button")) control.disabled = true;
    });
  }

  function createSessionMarkup() {
    if (!supportsSessionCreation()) {
      return mobilePlayNoticeMarkup({ blocking: true });
    }
    const draft = state.createSessionDraft;
    return `
      ${mobilePlayNoticeMarkup()}
      <form id="gameSessionCreateForm" class="game-session-create-form" data-runtime-session-form>
        ${gameConfigFieldsMarkup(draft.game_config, sessionCoreFieldsMarkup(draft))}
      </form>
    `;
  }

  function sessionMarkup(session, context) {
    const vacancies = session.role_vacancies || [];
    const running = session.status === "running";
    const participationStatus = session.participation_status || "active";
    if (context === "player" && !sessionSupportedOnDevice(session)) {
      return `
        <div class="mobile-blocked-session" aria-label="Digitale gamesessie niet beschikbaar">
          ${mobilePlayNoticeMarkup({ blocking: true })}
          <p>Je deelname wordt op dit apparaat niet gestart. Open LOM op een computer of laptop om deze digitale sessie te gebruiken.</p>
          <button class="secondary-button" type="button" data-leave-game-session>Gamesessie verlaten</button>
        </div>
      `;
    }
    if (context === "player" && ["waiting", "queued"].includes(participationStatus)) {
      const queuePosition = Number(session.queue_position || 1);
      return `
        <div class="player-queued-session" role="status" aria-live="polite">
          <span class="session-member-token">${queuePosition}</span>
          <span>
            <strong>Je staat op plek ${queuePosition} in de wachtrij</strong>
            <small>Alle rollen zijn nu door mensen vervuld. Zodra iemand stopt, neem jij automatisch die rol over.</small>
          </span>
          <button class="secondary-button" type="button" data-leave-game-session>Wachtrij verlaten</button>
        </div>
      `;
    }
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
          <button class="secondary-button" type="button" data-leave-game-session>Stoppen met spelen</button>
        </div>
      `;
    }
    const canRequest = !running && (!session.consensus || session.consensus.status !== "open");
    const managementSupported = supportsGameManagement();
    return `
      <div class="active-game-session">
        ${!managementSupported ? mobilePlayNoticeMarkup() : ""}
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
          <span>${session.game_config?.organization_model === "independent_enterprises"
            ? "Zelfstandige ondernemingen"
            : session.game_config?.organization_model === "school_learning_path"
              ? "School / leertraject"
              : "Eén gezamenlijke organisatie"}</span>
          <span>${session.game_config?.customer_order_mode === "free" ? "Vrije klantorders" : "Verplichte klantorders"}</span>
          <span>${session.game_config?.multiple_colors
            ? `Meerdere kleuren · ${(session.game_config.editable_color_layers || []).length}/4 lagen`
            : "Klassieke kleuren"}</span>
          <span>${session.members.length}/${session.required_role_ids.length} spelers</span>
          <span>${session.is_game_master
            ? managementSupported ? "Jij bent Game Master" : "Game Master-beheer op computer/laptop"
            : "Game Master aanwezig"}</span>
        </div>
        ${managementSupported ? gameMasterConfigMarkup(session) : ""}
        ${managementSupported ? gameMasterDifficultyMarkup(session) : ""}
        ${managementSupported ? gameMasterRoleMarkup(session) : ""}
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
        ${context === "player" ? `
          <button class="secondary-button session-leave-button" type="button" data-leave-game-session>Gamesessie verlaten</button>
        ` : ""}
        ${context === "manager" ? "<small>Nieuwe sessies kunnen uitsluitend vanuit deze beheerpagina worden aangemaakt.</small>" : ""}
      </div>
    `;
  }

  function availableMarkup(availability, { allowJoining = true, showCodeForm = true } = {}) {
    const discoverable = [
      ...(availability?.active_sessions || []),
      ...(availability?.discoverable_sessions || []),
      ...(availability?.created_sessions || []),
      ...(availability?.participating_sessions || []),
      ...(availability?.open_sessions || [])
    ];
    const games = [...new Map(discoverable
      .filter(game => game?.status !== "finished")
      .map(game => [game.session_id, game])).values()];
    const currentSessionId = availability?.current_session?.session_id;
    const gameButton = game => {
      const isCurrent = currentSessionId === game.session_id;
      const humanCount = Number(game.human_count ?? game.member_count ?? 0);
      const agentCount = Number(game.agent_count ?? 0);
      const queueCount = Number(game.queue_count ?? game.waiting_count ?? 0);
      const isRunning = game.status === "running";
      const joinMode = game.join_mode
        || (isRunning && agentCount ? "replace_agent" : isRunning ? "queue" : "join");
      const playMode = sessionPlayMode(game);
      const playModeLabel = playMode === "digital"
        ? "Digitaal"
        : playMode === "physical" ? "Fysiek" : "Spelmodus onbekend";
      const deviceUnsupported = !sessionSupportedOnDevice(game);
      const codeRequired = joinMode === "code_required"
        || (!game.join_mode && game.session_type !== "open");
      const unavailable = ["closed", "full"].includes(joinMode);
      const disabled = isCurrent || !allowJoining || codeRequired || unavailable || deviceUnsupported;
      const actionLabel = isCurrent
        ? ["waiting", "queued"].includes(availability?.current_session?.participation_status)
          ? "Jij staat in de wachtrij"
          : "Jij neemt deel"
        : deviceUnsupported
          ? "Alleen op computer of laptop"
          : codeRequired
          ? "Gebruik de gamecode"
          : joinMode === "replace_agent"
            ? "Agentrol overnemen"
            : joinMode === "queue"
              ? "Aansluiten in wachtrij"
              : joinMode === "full"
                ? "Lobby is vol"
                : joinMode === "closed"
                  ? "Sessie is gesloten"
                  : "Deelnemen";
      return `
        <button type="button"
                class="active-game-card${isCurrent ? " is-current" : ""}${deviceUnsupported ? " is-device-unsupported" : ""}"
                data-join-session="${escapeHtml(game.session_id)}"
                data-play-mode="${escapeHtml(playMode || "unknown")}"
                ${disabled ? "disabled" : ""}>
          <span>${escapeHtml(playModeLabel)} · ${escapeHtml(TYPE_LABELS[game.session_type] || game.session_type)} sessie · ${isRunning ? "gestart" : "lobby"}${game.created_by_current_player ? " · door jou aangemaakt" : ""}</span>
          <strong>${humanCount}/${game.capacity} mensen${agentCount ? ` · ${agentCount} agents` : ""}</strong>
          <small>${queueCount ? `${queueCount} wachtend · ` : ""}${escapeHtml(actionLabel)}</small>
        </button>
      `;
    };
    return `
      ${allowJoining ? mobilePlayNoticeMarkup() : ""}
      ${allowJoining && state.actionError ? `<p class="session-action-error"${state.actionErrorNeedsAnnouncement ? ' role="alert"' : ""}>${escapeHtml(state.actionError)}</p>` : ""}
      ${showCodeForm ? `<form class="game-code-join-form" data-game-code-join>
        <label>
          <span>Gamecode</span>
          <input name="join_code" minlength="6" maxlength="10" autocomplete="off" placeholder="Bijv. A1B2C3" required>
        </label>
        <button class="primary-button" type="submit">Deelnemen</button>
      </form>` : ""}
      ${games.length ? `
        <div class="open-game-list">
          <strong>Alle actieve gamesessies</strong>
          ${games.map(gameButton).join("")}
        </div>
      ` : `
        <p class="no-open-games">Er is nu geen actieve gamesessie om aan deel te nemen.</p>
      `}
      ${allowJoining && supportsSessionCreation() && availability?.can_start_free_game ? `
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
      && sessionSupportedOnDevice(state.session)
      && consensus.required_member_ids.includes(memberId)
      && !consensus.approved_member_ids.includes(memberId);
    els.dialog.hidden = !mustVote;
    if (!mustVote) return;
    els.dialogSummary.textContent = `${state.session.role_vacancies.length} ontbrekende rollen worden alleen na ieders akkoord door agents ingevuld.`;
  }

  function placePlayerSessionPanel(running) {
    const els = elements();
    if (!els.playerPanel) return;
    els.playerPanel.classList.remove("is-metric-session");
    els.playerPanel.hidden = Boolean(running);
    if (els.playerWorkbench && els.playerPanel.parentElement !== els.playerWorkbench) {
      els.playerWorkbench.insertBefore(els.playerPanel, els.logisticsGameMount || null);
    }
  }

  function render() {
    const els = elements();
    if (!state.authenticated) return;
    const currentJoinCodeInput = els.playerContent.querySelector(
      '[data-game-code-join] input[name="join_code"]'
    );
    const joinCodeDraft = currentJoinCodeInput
      ? {
          value: currentJoinCodeInput.value,
          focused: document.activeElement === currentJoinCodeInput,
          selectionStart: currentJoinCodeInput.selectionStart,
          selectionEnd: currentJoinCodeInput.selectionEnd
        }
      : null;
    const openPlayerIndices = Array.from(els.playerContent.querySelectorAll("details"))
      .map((el, i) => el.hasAttribute("open") ? i : -1)
      .filter(i => i !== -1);
    const openManagerIndices = Array.from(els.managerContent.querySelectorAll("details"))
      .map((el, i) => el.hasAttribute("open") ? i : -1)
      .filter(i => i !== -1);
    const sessionBlocked = Boolean(state.session && !sessionSupportedOnDevice(state.session));
    const sessionRunningOnDevice = Boolean(
      state.session?.status === "running"
      && !["waiting", "queued"].includes(state.session?.participation_status)
      && !sessionBlocked
    );

    if (state.session) {
      renderTopParticipation(sessionBlocked ? null : state.session);
      const queued = ["waiting", "queued"].includes(state.session.participation_status);
      placePlayerSessionPanel(sessionRunningOnDevice);
      els.playerTitle.textContent = sessionBlocked
        ? "Digitale gamesessie niet beschikbaar"
        : queued
        ? "Wachtrij voor gamesessie"
        : state.session.status === "running"
        ? "Jouw actieve gamesessie"
        : "Lobby van jouw gamesessie";
      els.playerBadge.textContent = sessionBlocked
        ? "Computer nodig"
        : queued
        ? `Wachtrij ${state.session.queue_position || ""}`.trim()
        : state.session.status === "running" ? "Gestart" : "In lobby";
      els.managerTitle.textContent = "Gamesessie";
      els.managerBadge.hidden = true;
      if (els.managerCreateButton) {
        const managementSupported = supportsGameManagement();
        els.managerCreateButton.hidden = (
          !managementSupported || queued || !state.session.is_game_master
        );
        els.managerCreateButton.disabled = (
          !managementSupported
          || (sessionBlocked && state.session.status !== "running")
        );
        els.managerCreateButton.type = "button";
        els.managerCreateButton.removeAttribute("form");
        els.managerCreateButton.removeAttribute("data-create-game-session");
        els.managerCreateButton.removeAttribute("data-request-game-start");
        els.managerCreateButton.removeAttribute("data-finish-game-session");
        if (state.session.status === "running") {
          els.managerCreateButton.setAttribute("data-finish-game-session", "");
          els.managerCreateButton.textContent = state.finishConfirmationUntil > Date.now()
            ? "Nogmaals klikken om af te sluiten"
            : "Sessie afsluiten";
        } else {
          resetFinishConfirmation(els.managerCreateButton);
          els.managerCreateButton.setAttribute("data-request-game-start", "");
          els.managerCreateButton.textContent = sessionBlocked
            ? "Start op computer of laptop"
            : "Sessie starten";
        }
      }
      els.playerContent.innerHTML = [
        sessionMarkup(state.session, "player"),
        `<section class="other-active-sessions" aria-label="Andere actieve gamesessies">
          ${availableMarkup(state.availability, { allowJoining: false, showCodeForm: false })}
        </section>`
      ].join("");
      els.managerContent.hidden = false;
      els.managerContent.innerHTML = supportsGameManagement()
        ? [
            sessionRoleDistributionMarkup(state.session),
            gameMasterConfigMarkup(state.session),
            gameMasterDifficultyMarkup(state.session),
            gameMasterRoleMarkup(state.session),
            `<section class="other-active-sessions" aria-label="Alle actieve gamesessies">
              ${availableMarkup(state.availability, { allowJoining: false, showCodeForm: false })}
            </section>`
          ].join("")
        : mobilePlayNoticeMarkup({ blocking: true });
      if (sessionBlocked) state.startedSessionId = null;
      if (sessionRunningOnDevice && state.startedSessionId !== state.session.session_id) {
        state.startedSessionId = state.session.session_id;
        window.dispatchEvent(new CustomEvent("learngame-session-started", {
          detail: { session: state.session }
        }));
      }
    } else {
      renderTopParticipation(null);
      placePlayerSessionPanel(false);
      els.playerTitle.textContent = "Neem deel aan een gamesessie";
      els.playerBadge.textContent = "Geen sessie";
      els.managerBadge.textContent = "Geen sessie";
      els.managerBadge.hidden = true;
      els.managerTitle.textContent = "Gamesessie";
      if (els.managerCreateButton) {
        const creationSupported = supportsSessionCreation();
        resetFinishConfirmation(els.managerCreateButton);
        els.managerCreateButton.hidden = !creationSupported;
        els.managerCreateButton.disabled = !creationSupported;
        els.managerCreateButton.type = creationSupported ? "submit" : "button";
        if (creationSupported) {
          els.managerCreateButton.setAttribute("form", "gameSessionCreateForm");
          els.managerCreateButton.setAttribute("data-create-game-session", "");
        } else {
          els.managerCreateButton.removeAttribute("form");
          els.managerCreateButton.removeAttribute("data-create-game-session");
        }
        els.managerCreateButton.removeAttribute("data-request-game-start");
        els.managerCreateButton.removeAttribute("data-finish-game-session");
        els.managerCreateButton.textContent = "Sessie aanmaken";
      }
      els.playerContent.innerHTML = availableMarkup(state.availability);
      els.managerContent.hidden = false;
      if (!els.managerContent.querySelector("#gameSessionCreateForm[data-runtime-session-form]")) {
        els.managerContent.innerHTML = createSessionMarkup();
      }
    }
    if (!state.session && joinCodeDraft) {
      const nextJoinCodeInput = els.playerContent.querySelector(
        '[data-game-code-join] input[name="join_code"]'
      );
      if (nextJoinCodeInput) {
        nextJoinCodeInput.value = joinCodeDraft.value;
        if (joinCodeDraft.focused) {
          nextJoinCodeInput.focus({ preventScroll: true });
          if (joinCodeDraft.selectionStart != null && joinCodeDraft.selectionEnd != null) {
            nextJoinCodeInput.setSelectionRange(
              joinCodeDraft.selectionStart,
              joinCodeDraft.selectionEnd
            );
          }
        }
      }
    }
    const playerDetails = els.playerContent.querySelectorAll("details");
    openPlayerIndices.forEach(i => playerDetails[i]?.setAttribute("open", ""));

    const managerDetails = els.managerContent.querySelectorAll("details");
    openManagerIndices.forEach(i => managerDetails[i]?.setAttribute("open", ""));
    const configForm = document.querySelector("#gameSessionCreateForm, [data-active-game-config]");
    const config = state.session?.game_config || state.createSessionDraft.game_config;
    placePresetSaveAction(state.session?.status === "running" ? null : configForm, els);
    renderGameAuxiliaryPanels(configForm, config);
    setRunningConfigReadOnly(configForm, state.session?.status === "running");
    renderConsensus();
    state.actionErrorNeedsAnnouncement = false;
    window.dispatchEvent(new CustomEvent("learngame-session-state", {
      detail: {
        session: state.session,
        running: sessionRunningOnDevice,
        accessBlocked: sessionBlocked
      }
    }));
  }

  async function refresh() {
    if (!state.authenticated || state.busy) return;
    if (state.refreshPromise) return state.refreshPromise;
    const refreshVersion = state.mutationVersion;
    const operation = (async () => {
      try {
        const availability = await request(availabilityPath());
        if (refreshVersion !== state.mutationVersion) return;
        state.availability = availability;
        state.session = availability.current_session;
        const repairedConfig = repairedLobbyRoleConfig(state.session);
        if (repairedConfig) {
          try {
            const repairedSession = await request(
              `/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/configuration`,
              { method: "POST", body: JSON.stringify({ game_config: repairedConfig }) }
            );
            if (!state.authenticated || refreshVersion !== state.mutationVersion) return;
            state.session = repairedSession;
            state.availability.current_session = state.session;
          } catch (error) {
            if (!state.authenticated || refreshVersion !== state.mutationVersion) return;
            console.warn("Conceptrollen konden niet automatisch worden hersteld.", error);
          }
        }
        if (!state.authenticated || refreshVersion !== state.mutationVersion) return;
        render();
      } catch (error) {
        if (!state.authenticated || refreshVersion !== state.mutationVersion) return;
        if (isTransientRequestError(error)) return;
        if (!state.session) {
          elements().playerContent.innerHTML = `<p class="session-error">${escapeHtml(error.message)}</p>`;
        } else {
          console.warn("Gamesessie verversen mislukt:", error);
        }
      }
    })();
    state.refreshPromise = operation;
    try {
      await operation;
    } finally {
      if (state.refreshPromise === operation) state.refreshPromise = null;
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
    if (!state.authenticated) return;
    state.busy = true;
    state.actionError = "";
    state.actionErrorNeedsAnnouncement = false;
    state.mutationVersion += 1;
    const mutationVersion = state.mutationVersion;
    try {
      const mutationResult = await request(path, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if (!state.authenticated || mutationVersion !== state.mutationVersion) return;
      const leftSession = mutationResult?.participation_status === "none"
        && ["left", "left_queue", "not_participating"].includes(mutationResult?.status);
      state.session = leftSession ? null : mutationResult;
      if (state.session?.status === "finished" || state.session?.participation_status === "left") {
        state.session = null;
      }
      if (!state.session) {
        state.startedSessionId = null;
      }
      pendingConfigOverlay();
      render();
      try {
        const refreshed = await refreshAfterMutation(mutationVersion);
        if (!refreshed) return;
        pendingConfigOverlay();
        render();
      } catch (refreshError) {
        // De mutatie is al bevestigd door de server. Houd dat resultaat
        // zichtbaar en meld een mislukte naverfrissing niet als mislukte actie.
        console.warn("Gamesessie is bijgewerkt, maar verversen mislukte:", refreshError);
      }
    } catch (error) {
      if (!state.authenticated || mutationVersion !== state.mutationVersion) return;
      if (
        error.code === "digital_session_requires_computer"
        || error.code === "session_creation_requires_computer"
        || error.code === "game_management_requires_computer"
      ) {
        state.actionError = error.message || MOBILE_PLAY_MESSAGE;
        state.actionErrorNeedsAnnouncement = true;
        render();
        return;
      }
      if (isTransientRequestError(error)) {
        console.warn("Gamesessieactie tijdelijk niet bevestigd; de huidige toestand blijft behouden.", error);
        return;
      }
      if (isStaleSessionStateError(error)) {
        // Een andere deelnemer of poll heeft het startverzoek al afgehandeld.
        // Synchroniseer de actuele sessie zonder de gebruiker met een popup te blokkeren.
        try {
          if (!await refreshAfterMutation(mutationVersion)) return;
          render();
        } catch (refreshError) {
          console.warn("De actuele startstatus kon niet worden opgehaald:", refreshError);
        }
        return;
      }
      if (error.code === "active_session_exists" || (
        error.status === 409
        && new Set([
          "Je neemt al deel aan een actieve gamesessie.",
          "Je neemt al deel aan een lobby of actieve gamesessie."
        ]).has(error.message)
      )) {
        try {
          if (!await refreshAfterMutation(mutationVersion)) return;
          render();
          if (state.session) return;
        } catch (refreshError) {
          console.warn("De bestaande gamesessie kon niet worden opgehaald:", refreshError);
        }
      }
      window.alert(error.message);
    } finally {
      if (mutationVersion === state.mutationVersion) state.busy = false;
    }
  }

  function mutate(path, body) {
    const operation = () => performMutation(path, body);
    state.mutationQueue = state.mutationQueue.then(operation, operation);
    return state.mutationQueue;
  }

  async function queueGameConfigSave(gameConfig) {
    if (!supportsGameManagement()) {
      state.pendingGameConfig = null;
      return;
    }
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

  async function refreshAfterMutation(expectedMutationVersion = state.mutationVersion) {
    const availability = await request(availabilityPath());
    if (!state.authenticated || expectedMutationVersion !== state.mutationVersion) return false;
    state.availability = availability;
    state.session = availability.current_session;
    return true;
  }

  function clearSessionForLogout() {
    state.mutationVersion += 1;
    clearInterval(state.pollTimer);
    state.pollTimer = null;
    state.authenticated = false;
    state.availability = null;
    state.session = null;
    state.startedSessionId = null;
    state.selectedSessionId = null;
    state.actionError = "";
    state.actionErrorNeedsAnnouncement = false;
    state.pendingGameConfig = null;
    state.savingGameConfig = false;
    state.busy = false;
    window.dispatchEvent(new CustomEvent("learngame-session-state", {
      detail: { session: null, running: false, reason: "logout" }
    }));
  }

  async function prepareLogout() {
    const sessionId = state.session?.session_id;
    const shouldLeave = Boolean(sessionId && state.authenticated);
    // Invalidate every in-flight/queued mutation before waiting for the
    // best-effort leave call. A delayed response may never resurrect the UI.
    clearSessionForLogout();
    clearInterval(state.pollTimer);
    state.pollTimer = null;
    try {
      if (shouldLeave) {
        await Promise.race([
          request(`/v1/game-sessions/${encodeURIComponent(sessionId)}/leave`, {
            method: "POST"
          }),
          new Promise((_, reject) => setTimeout(
            () => reject(new Error("Gamesessie verlaten duurde te lang.")),
            4_000
          ))
        ]);
      }
    } catch (error) {
      console.warn("De gamesessie kon bij uitloggen niet direct worden verlaten; de aanwezigheidstimeout blijft als vangnet actief.", error);
    }
  }

  function createSessionFromForm(form) {
    if (!form || state.busy) return false;
    if (!supportsSessionCreation()) {
      state.actionError = MOBILE_SESSION_CREATION_MESSAGE;
      state.actionErrorNeedsAnnouncement = true;
      return false;
    }
    const type = form.querySelector("#gameSessionType")?.value || "closed";
    const difficulty = form.querySelector("#gameSessionDifficulty")?.value || "normal";
    const gameConfig = collectGameConfig(form);
    if (!gameConfig.enabled_roles.length) {
      const note = form.querySelector(".role-selector-runtime-note");
      if (note) {
        note.classList.add("is-error");
        note.textContent = "Kies ten minste één spelersrol voor de digitale gamesessie.";
        note.setAttribute("role", "alert");
      }
      roleControls(form)[0]?.focus();
      return false;
    }
    state.createSessionDraft = {
      session_type: type,
      difficulty_level: difficulty,
      game_config: { ...gameConfig }
    };
    mutate("/v1/game-sessions", {
      session_type: type,
      difficulty_level: difficulty,
      game_config: gameConfig,
      supports_digital_play: supportsDigitalPlay()
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
        mutate("/v1/game-sessions/join", {
          join_code: String(code || "").toUpperCase(),
          supports_digital_play: supportsDigitalPlay()
        });
      }
    }, true);
    document.addEventListener("click", event => {
      const saveConfigurationButton = event.target.closest("[data-save-session-config]");
      if (saveConfigurationButton) {
        event.preventDefault();
        if (!supportsGameManagement()) return;
        saveSessionConfiguration(saveConfigurationButton.form || saveConfigurationButton.closest("form"));
        return;
      }
      const createButton = event.target.closest("[data-create-game-session]");
      if (!createButton) return;
      event.preventDefault();
      createSessionFromForm(createButton.form || document.getElementById("gameSessionCreateForm"));
    }, true);
    document.addEventListener("input", event => {
      if (event.target.matches('[data-game-code-join] input[name="join_code"]')) {
        if (state.actionError) {
          state.actionError = "";
          state.actionErrorNeedsAnnouncement = false;
          event.target.closest("[data-game-code-join]")
            ?.parentElement
            ?.querySelector(".session-action-error")
            ?.remove();
        }
        return;
      }
      const createForm = event.target.form?.matches("#gameSessionCreateForm")
        ? event.target.form
        : event.target.closest("#gameSessionCreateForm");
      if (!createForm) return;
      if (
        event.target.matches("[data-game-config-control]")
        && !event.target.matches("[data-session-game-type]")
      ) {
        updateHybridProductionTooltip(createForm);
        if (event.target.matches("[name='has_supplier']")) {
          updateSupplierRoleControl(createForm);
        } else if (event.target.matches("[name='role_supplier']")) {
          const supplierToggle = createForm.elements.namedItem("has_supplier");
          if (supplierToggle) supplierToggle.checked = event.target.checked;
        }
        const preferredRoleId = event.target.checked && event.target.name?.startsWith("role_")
          ? event.target.name.slice("role_".length)
          : null;
        enforceRuntimeStationOwnership(createForm, preferredRoleId);
        updateVariantConstraintControls(createForm);
        updateColorLayerControls(createForm);
        updateFinancialDetailControls(createForm);
        updateCurrencyControls(createForm);
        updateSchoolFundingControls(createForm);
        const config = collectGameConfig(createForm);
        updateConfigurationLayout(createForm, config);
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
        const form = event.target.form || event.target.closest("form");
        if (
          form?.matches("[data-active-game-config]")
          && !supportsGameManagement()
        ) return;
        const selectedPreset = event.target.matches("[data-session-game-type]")
          ? event.target.value
          : null;
        if (selectedPreset) applyGameConfigPreset(form, selectedPreset);
        if (event.target.matches("[name='has_supplier']")) {
          updateSupplierRoleControl(form);
        } else if (event.target.matches("[name='role_supplier']")) {
          const supplierToggle = form?.elements.namedItem("has_supplier");
          if (supplierToggle) supplierToggle.checked = event.target.checked;
        }
        const preferredRoleId = event.target.checked && event.target.name?.startsWith("role_")
          ? event.target.name.slice("role_".length)
          : null;
        enforceRuntimeStationOwnership(form, preferredRoleId);
        updateVariantConstraintControls(form);
        updateColorLayerControls(form);
        updateFinancialDetailControls(form);
        updateCurrencyControls(form);
        updateSchoolFundingControls(form);
        const config = collectGameConfig(form);
        updateConfigurationLayout(form, config);
        // Een expliciet gekozen preset is al de bron van waarheid. Meteen opnieuw
        // matchen kon op een nog niet gematerialiseerde standaardwaarde (zoals
        // play_mode) uitkomen en de dropdown onterecht naar custom_draft zetten.
        if (selectedPreset && selectedPreset !== "custom_draft") {
          event.target.value = selectedPreset;
        } else {
          syncGameConfigurationSelection(form, config);
        }
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
      if (
        event.target.matches("[data-game-master-role-select]")
        && state.session
        && supportsGameManagement()
      ) {
        mutate(
          `/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/game-master-role`,
          { role_id: String(event.target.value || "") }
        );
        return;
      }
      if (
        event.target.matches("[data-game-difficulty-select]")
        && state.session
        && supportsGameManagement()
      ) {
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
        state.selectedSessionId = target.dataset.joinSession;
        mutate("/v1/game-sessions/join", {
          session_id: target.dataset.joinSession,
          supports_digital_play: supportsDigitalPlay()
        });
      } else if (target.hasAttribute("data-start-free-game")) {
        if (!supportsSessionCreation()) {
          state.actionError = MOBILE_SESSION_CREATION_MESSAGE;
          state.actionErrorNeedsAnnouncement = true;
          render();
          return;
        }
        mutate(freeGamePath());
      } else if (
        target.hasAttribute("data-request-game-start")
        && state.session
        && sessionSupportedOnDevice(state.session)
      ) {
        mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/start-requests`);
      } else if (
        target.hasAttribute("data-finish-game-session")
        && state.session
        && supportsGameManagement()
      ) {
        requestFinishConfirmation(target);
      } else if (target.hasAttribute("data-open-game-session-overview")) {
        document.querySelector('.app-view-switcher [data-main-menu-tab="session"]')?.click();
      } else if (target.hasAttribute("data-leave-game-session") && state.session) {
        mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/leave`);
      } else if (target.dataset.copyGameCode) {
        navigator.clipboard?.writeText(target.dataset.copyGameCode);
        target.textContent = "Gekopieerd";
      }
    });
    elements().waitButton?.addEventListener("click", () => {
      if (state.session && sessionSupportedOnDevice(state.session)) mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/consensus`, { decision: "wait" });
    });
    elements().startButton?.addEventListener("click", () => {
      if (state.session && sessionSupportedOnDevice(state.session)) mutate(`/v1/game-sessions/${encodeURIComponent(state.session.session_id)}/consensus`, { decision: "start_with_agents" });
    });
    window.addEventListener("leerpret-auth-changed", event => {
      state.authenticated = Boolean(event.detail?.authenticated);
      state.apiBase = event.detail?.apiBase || "";
      if (!state.authenticated) {
        clearSessionForLogout();
        return;
      }
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

  // script.js is loaded asynchronously after the Engine SDK. On a refresh the
  // authenticated session can therefore be rendered before that script has
  // attached its `learngame-session-state` listener. Expose only a defensive
  // snapshot so telemetry can recover the already-known member identity.
  window.LOMGameSessions = Object.freeze({
    getCurrentSession: () => state.session ? {
      ...state.session,
      members: (state.session.members || []).map(member => ({ ...member })),
      virtual_agents: (state.session.virtual_agents || []).map(agent => ({ ...agent }))
    } : null,
    prepareLogout
  });
})();
