/**
 * LEARNGame OM - GameConfigurationStore
 * Central repository for official built-in presets (Henk's standard configurations)
 * and user-saved custom game configurations with localStorage persistence.
 */
(function (global) {
  const STORAGE_KEY = "learngame_custom_configurations_v1";
  const MONEY_PRESET_GAMES = new Set([
    "entrepreneurial", "lo4", "lo5", "lo6", "lo7", "lo8", "le_training"
  ]);
  const REVENUE_BALANCE_PRESET_GAMES = new Set([
    "entrepreneurial", "lo5", "lo5b", "lo6", "lo7", "lo7_digital", "lo8", "lo9", "le_training"
  ]);
  const PRODUCTION_PLANNING_PRESET_GAMES = new Set(["lo5", "lo6", "lo7", "lo8"]);
  const DEFAULT_CURRENCY = "EUR";
  const MAX_PRODUCT_TYPES = 9;

  function loGameNumber(gameType) {
    const match = /^lo(\d+)/i.exec(String(gameType || ""));
    return match ? Number(match[1]) : null;
  }

  function variantRulesFor(gameType) {
    const gameNumber = loGameNumber(gameType);
    const isLoGame = gameNumber !== null;
    const flexibleProductsAndColors = isLoGame && gameNumber >= 6;
    return {
      gameNumber,
      productTypeCountEditable: !isLoGame || flexibleProductsAndColors,
      fixedProductTypeCount: gameNumber === 1
        ? 1
        : isLoGame && gameNumber <= 5
          ? 3
          : null,
      colorModeEditable: !isLoGame || flexibleProductsAndColors,
      defaultHasSupplier: isLoGame ? gameNumber >= 4 : null
    };
  }

  function normalizeCurrencyCode(value, fallback = DEFAULT_CURRENCY) {
    const normalized = String(value || "").trim().toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
  }

  function normalizeCurrencySettings(settings, money) {
    const baseCurrency = normalizeCurrencyCode(settings.base_currency);
    const requestedCurrencies = Array.isArray(settings.enabled_currencies)
      ? settings.enabled_currencies.map(code => normalizeCurrencyCode(code, "")).filter(Boolean)
      : [];
    const enabledCurrencies = [...new Set([baseCurrency, ...requestedCurrencies])];
    const multiple = money
      && settings.currency_mode === "multiple"
      && enabledCurrencies.length > 1;
    const currencies = multiple ? enabledCurrencies : [baseCurrency];
    const requestedRates = settings.exchange_rates && typeof settings.exchange_rates === "object"
      ? settings.exchange_rates
      : {};
    const exchangeRates = Object.fromEntries(currencies.map(code => {
      const requested = Number(requestedRates[code]);
      return [code, code === baseCurrency || !Number.isFinite(requested) || requested <= 0 ? 1 : requested];
    }));
    return {
      currency_mode: multiple ? "multiple" : "single",
      base_currency: baseCurrency,
      enabled_currencies: currencies,
      exchange_rates: exchangeRates
    };
  }

  const BUILTIN_PRESETS = [
    {
      config_id: "lo1",
      name: "LO Game 1",
      description: "Basisvariant met één product, functionele keten en zonder geldstroom.",
      is_preset: true,
      base_template: "lo1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      settings: {
        game_type: "lo1",
        money: false,
        pnl: false,
        intermediate_stock: false,
        opportunity_costs: false,
        role_freedom: false,
        price_mode: "fixed",
        logistics_organization: "functional",
        product_type_count: 1,
        customer_order_mode: "required",
        enabled_roles: ["customer", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse"]
      }
    },
    {
      config_id: "lo2",
      name: "LO Game 2",
      description: "Meerproductvariant in een functionele keten, nog zonder financiële besturing.",
      is_preset: true,
      base_template: "lo2",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      settings: {
        game_type: "lo2",
        money: false,
        pnl: false,
        intermediate_stock: true,
        opportunity_costs: false,
        role_freedom: false,
        price_mode: "fixed",
        logistics_organization: "functional",
        product_type_count: 3,
        customer_order_mode: "required",
        enabled_roles: ["customer", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse"]
      }
    },
    {
      config_id: "lo3",
      name: "LO Game 3",
      description: "De meest effectieve productgerichte organisatie; zonder geldstroom is de inefficiënte capaciteitsinzet nog niet zichtbaar.",
      is_preset: true,
      base_template: "lo3",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      settings: {
        game_type: "lo3",
        money: false,
        pnl: false,
        intermediate_stock: false,
        opportunity_costs: false,
        role_freedom: false,
        price_mode: "fixed",
        logistics_organization: "product",
        product_type_count: 3,
        customer_order_mode: "required",
        enabled_roles: ["customer", "logistics_manager", "raw_warehouse", "production_a", "production_b", "production_c", "finished_warehouse"]
      }
    },
    {
      config_id: "lo4",
      name: "LO Game 4",
      description: "Dezelfde effectieve productorganisatie als versie 3, nu met geld en opportunity costs die laten zien dat zij niet de efficiëntste is.",
      is_preset: true,
      base_template: "lo4",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      settings: {
        game_type: "lo4",
        money: true,
        pnl: true,
        intermediate_stock: false,
        opportunity_costs: true,
        role_freedom: false,
        price_mode: "fixed",
        logistics_organization: "product",
        product_type_count: 3,
        customer_order_mode: "required",
        enabled_roles: ["customer", "logistics_manager", "sales", "finance", "raw_warehouse", "production_a", "production_b", "production_c", "finished_warehouse", "supplier"]
      }
    },
    {
      config_id: "lo5",
      name: "LO Game 5",
      description: "Functionele herinrichting die de in versie 4 zichtbaar gemaakte inefficiëntie probeert te verbeteren.",
      is_preset: true,
      base_template: "lo5",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      settings: {
        game_type: "lo5",
        money: true,
        pnl: true,
        intermediate_stock: true,
        opportunity_costs: true,
        role_freedom: false,
        price_mode: "fixed",
        logistics_organization: "functional",
        product_type_count: 3,
        customer_order_mode: "required",
        enabled_roles: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier"]
      }
    },
    {
      config_id: "lo6",
      name: "LO Game 6",
      description: "Flexibele functionele keten met negen torensoorten, extra grondplaatkleuren en vrije kleurkeuze per laag.",
      is_preset: true,
      base_template: "lo6",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      settings: {
        game_type: "lo6",
        money: true,
        pnl: true,
        intermediate_stock: true,
        opportunity_costs: true,
        role_freedom: true,
        multiple_colors: true,
        editable_color_layers: ["groundPlate", "layer1", "layer2", "layer3"],
        price_mode: "fixed",
        logistics_organization: "functional",
        product_type_count: 9,
        customer_order_mode: "required",
        enabled_roles: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier", "transporter"]
      }
    },
    {
      config_id: "lo7",
      name: "LO Game 7",
      description: "Volledig vrije functionele keten met negen torensoorten en vrije orderinvoer.",
      is_preset: true,
      base_template: "lo7",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      settings: {
        game_type: "lo7",
        money: true,
        pnl: true,
        intermediate_stock: true,
        opportunity_costs: true,
        role_freedom: true,
        price_mode: "free",
        logistics_organization: "functional",
        product_type_count: 9,
        customer_order_mode: "free",
        enabled_roles: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier", "transporter"]
      }
    },
    {
      config_id: "lo8",
      name: "LO Game 8",
      description: "Ketenintegratie en expediteursfunctie (Freight Forwarder) met digitale sturing.",
      is_preset: true,
      base_template: "lo8",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      settings: {
        game_type: "lo8",
        money: true,
        pnl: true,
        intermediate_stock: true,
        opportunity_costs: true,
        role_freedom: true,
        price_mode: "free",
        logistics_organization: "functional",
        product_type_count: 9,
        customer_order_mode: "free",
        enabled_roles: ["customer", "sales", "finance", "logistics_manager", "raw_warehouse", "production_1", "production_2", "production_3", "finished_warehouse", "supplier", "transporter"]
      }
    },
    {
      config_id: "entrepreneurial",
      name: "Entrepreneurial Game",
      description: "Vrije markt met zelfstandige ondernemingen die inkopen, produceren, verkopen, concurreren en strategisch samenwerken.",
      is_preset: true,
      base_template: "entrepreneurial",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      settings: {
        game_type: "entrepreneurial",
        money: true,
        pnl: true,
        intermediate_stock: true,
        opportunity_costs: true,
        role_freedom: true,
        organization_model: "independent_enterprises",
        price_mode: "free",
        logistics_organization: "functional",
        product_type_count: 3,
        customer_order_mode: "free",
        // Entrepreneurship gebruikt dezelfde volledige, speelbare keten als de
        // overige digitale varianten. De historische families leverancier,
        // producent en handelaar groeperen gedrag; het zijn geen drie stations.
        enabled_roles: ["customer", "sales", "supplier", "production_1", "production_2", "production_3", "finished_warehouse"]
      }
    },
    {
      config_id: "le_training",
      name: "LE-Training",
      description: "School als budgetgedreven leertraject: leerinhouden lopen parallel per jaarlaag en leerlingen stromen sequentieel door.",
      is_preset: true,
      base_template: "le_training",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      settings: {
        game_type: "le_training",
        money: true,
        pnl: true,
        intermediate_stock: false,
        opportunity_costs: true,
        role_freedom: false,
        organization_model: "school_learning_path",
        funding_incentive: "financing",
        multiple_colors: true,
        editable_color_layers: ["groundPlate", "layer1", "layer2", "layer3"],
        price_mode: "fixed",
        logistics_organization: "product",
        production_processes: ["parallel", "sequential"],
        product_type_count: 3,
        customer_order_mode: "required",
        enabled_roles: ["customer", "logistics_manager", "sales", "finance", "raw_warehouse", "production_a", "production_b", "production_c", "finished_warehouse"]
      }
    }
  ];

  global.GameVariantHistory?.derived.forEach(definition => {
    const base = BUILTIN_PRESETS.find(preset => preset.config_id === definition.basePreset);
    if (!base || BUILTIN_PRESETS.some(preset => preset.config_id === definition.id)) return;
    BUILTIN_PRESETS.push({
      ...base,
      config_id: definition.id,
      name: definition.label,
      description: definition.development,
      base_template: definition.basePreset,
      settings: {
        ...base.settings,
        ...definition.settings,
        game_type: definition.id
      }
    });
  });

  BUILTIN_PRESETS.forEach(preset => {
    const history = global.GameVariantHistory?.get(preset.config_id);
    if (!history) return;
    preset.history = history;
    preset.description = `${history.year} · ${history.organization}. Leerdoel: ${history.objective}. ${history.development}`;
    if (preset.settings.money) MONEY_PRESET_GAMES.add(preset.config_id);
    if (preset.settings.revenue_balance_enabled === true) {
      REVENUE_BALANCE_PRESET_GAMES.add(preset.config_id);
    }
    if (["lo5b", "lo7_digital", "lo9"].includes(preset.config_id)) {
      PRODUCTION_PLANNING_PRESET_GAMES.add(preset.config_id);
    }
  });

  function normalizeSettings(settings = {}, gameType = settings.game_type) {
    const rules = variantRulesFor(gameType);
    const productionProcesses = global.LogisticsProcess?.normalizeProcesses(
      settings.production_processes,
      gameType
    ) || (settings.logistics_organization === "functional"
      ? ["sequential"]
      : ["parallel"]);
    const multipleColors = rules.colorModeEditable && Boolean(settings.multiple_colors);
    const editableColorLayers = multipleColors && Array.isArray(settings.editable_color_layers)
      ? [...new Set(settings.editable_color_layers)].filter(layerId => (
          ["groundPlate", "layer1", "layer2", "layer3"].includes(layerId)
        ))
      : [];
    const money = Boolean(settings.money);
    const openingBalanceEnabled = money && (
      settings.opening_balance_enabled === undefined
        ? MONEY_PRESET_GAMES.has(gameType)
        : Boolean(settings.opening_balance_enabled)
    );
    const revenueBalanceEnabled = money && (
      settings.revenue_balance_enabled === undefined
        ? REVENUE_BALANCE_PRESET_GAMES.has(gameType)
        : Boolean(settings.revenue_balance_enabled)
    );
    const productionPlanningEnabled = settings.production_planning_enabled === undefined
      ? PRODUCTION_PLANNING_PRESET_GAMES.has(gameType)
      : Boolean(settings.production_planning_enabled);
    const organizationModel = settings.organization_model === undefined
      ? (gameType === "entrepreneurial"
        ? "independent_enterprises"
        : gameType === "le_training"
          ? "school_learning_path"
          : "single_enterprise")
      : (["independent_enterprises", "school_learning_path"].includes(settings.organization_model)
        ? settings.organization_model
        : "single_enterprise");
    const requestedEnabledRoles = Array.isArray(settings.enabled_roles)
      ? [...new Set(settings.enabled_roles)]
      : [];
    const presetEnabledRoles = BUILTIN_PRESETS.find(preset => (
      preset.config_id === gameType
    ))?.settings?.enabled_roles || [];
    const enabledRoles = requestedEnabledRoles.length === 1
      && requestedEnabledRoles[0] === "supplier"
      && presetEnabledRoles.length > 1
      ? [...presetEnabledRoles]
      : requestedEnabledRoles;
    const hasSupplier = settings.has_supplier === undefined
      ? (rules.defaultHasSupplier === null
        ? enabledRoles.includes("supplier")
        : rules.defaultHasSupplier)
      : Boolean(settings.has_supplier);
    const synchronizedRoles = hasSupplier
      ? [...new Set([...enabledRoles, "supplier"])]
      : enabledRoles.filter(roleId => roleId !== "supplier");
    const runtimeRoles = global.LOMRuntimeRoles?.normalize(synchronizedRoles)
      || synchronizedRoles;
    const requestedProductTypeCount = Math.max(
      1,
      Math.min(MAX_PRODUCT_TYPES, Number(settings.product_type_count) || 3)
    );
    const productTypeCount = rules.fixedProductTypeCount ?? requestedProductTypeCount;
    const currencySettings = normalizeCurrencySettings(settings, money);
    return {
      ...settings,
      opening_balance_enabled: openingBalanceEnabled,
      revenue_balance_enabled: revenueBalanceEnabled,
      production_planning_enabled: productionPlanningEnabled,
      organization_model: organizationModel,
      funding_incentive: organizationModel === "school_learning_path"
        ? (["quality", "balanced", "financing"].includes(settings.funding_incentive)
          ? settings.funding_incentive
          : "financing")
        : "balanced",
      multiple_colors: multipleColors,
      editable_color_layers: editableColorLayers,
      product_type_count: productTypeCount,
      has_supplier: hasSupplier,
      enabled_roles: runtimeRoles,
      ...currencySettings,
      production_processes: productionProcesses,
      logistics_organization: productionProcesses.length === 1
        && productionProcesses[0] === "sequential"
        ? "functional"
        : "product"
    };
  }

  BUILTIN_PRESETS.forEach(preset => {
    preset.settings = normalizeSettings(preset.settings, preset.settings.game_type);
  });

  function normalizeConfiguration(configuration) {
    return {
      ...configuration,
      settings: normalizeSettings(
        configuration.settings,
        configuration.settings?.game_type || configuration.base_template
      )
    };
  }

  function loadCustomConfigurations() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Failed to load custom game configurations from localStorage:", e);
      return [];
    }
  }

  function saveCustomConfigurations(configs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    } catch (e) {
      console.error("Failed to save custom game configurations to localStorage:", e);
    }
  }

  class GameConfigurationStore {
    getVariantRules(gameType) {
      return variantRulesFor(gameType);
    }

    normalizeSettings(settings, gameType = settings?.game_type) {
      return normalizeSettings(settings, gameType);
    }

    getPresets() {
      return BUILTIN_PRESETS.map(normalizeConfiguration);
    }

    getCustomConfigurations() {
      return loadCustomConfigurations().map(normalizeConfiguration);
    }

    getAllConfigurations() {
      return [...this.getPresets(), ...this.getCustomConfigurations()];
    }

    getConfiguration(configId) {
      if (configId === "custom_draft") return null;
      const all = this.getAllConfigurations();
      return all.find(c => c.config_id === configId)
        || this.getPresets().find(p => p.config_id === "lo4");
    }

    findMatchingConfiguration(currentSettings) {
      if (!currentSettings) return null;
      const all = this.getAllConfigurations();

      const currentRolesSorted = Array.isArray(currentSettings.enabled_roles)
        ? [...currentSettings.enabled_roles].sort().join(",")
        : null;

      for (const config of all) {
        const s = config.settings;
        if (!s) continue;

        const moneyMatch = Boolean(s.money) === Boolean(currentSettings.money);
        const pnlMatch = Boolean(s.pnl) === Boolean(currentSettings.pnl);
        const intermediateStockMatch = Boolean(s.intermediate_stock) === Boolean(currentSettings.intermediate_stock);
        const opportunityCostsMatch = Boolean(s.opportunity_costs) === Boolean(currentSettings.opportunity_costs);
        const roleFreedomMatch = Boolean(s.role_freedom) === Boolean(currentSettings.role_freedom);
        const openingBalanceMatch = Boolean(s.opening_balance_enabled)
          === Boolean(currentSettings.opening_balance_enabled);
        const revenueBalanceMatch = Boolean(s.revenue_balance_enabled)
          === Boolean(currentSettings.revenue_balance_enabled);
        const productionPlanningMatch = Boolean(s.production_planning_enabled)
          === Boolean(currentSettings.production_planning_enabled);
        const multipleColorsMatch = Boolean(s.multiple_colors)
          === Boolean(currentSettings.multiple_colors);
        const editableColorLayersMatch = [...(s.editable_color_layers || [])].sort().join(",")
          === [...(currentSettings.editable_color_layers || [])].sort().join(",");
        const supplierMatch = Boolean(s.has_supplier) === Boolean(currentSettings.has_supplier);
        const currencyModeMatch = (s.currency_mode || "single")
          === (currentSettings.currency_mode || "single");
        const baseCurrencyMatch = (s.base_currency || DEFAULT_CURRENCY)
          === (currentSettings.base_currency || DEFAULT_CURRENCY);
        const enabledCurrenciesMatch = [...(s.enabled_currencies || [DEFAULT_CURRENCY])].sort().join(",")
          === [...(currentSettings.enabled_currencies || [DEFAULT_CURRENCY])].sort().join(",");
        const exchangeRatesMatch = JSON.stringify(s.exchange_rates || { [DEFAULT_CURRENCY]: 1 })
          === JSON.stringify(currentSettings.exchange_rates || { [DEFAULT_CURRENCY]: 1 });
        const priceModeMatch = (s.price_mode || "fixed") === (currentSettings.price_mode || "fixed");
        const customerOrderModeMatch = (s.customer_order_mode || "required")
          === (currentSettings.customer_order_mode || "required");
        const defaultOrganizationModel = gameType => gameType === "entrepreneurial"
          ? "independent_enterprises"
          : gameType === "le_training"
            ? "school_learning_path"
            : "single_enterprise";
        const organizationModelMatch = (
          s.organization_model || defaultOrganizationModel(s.game_type)
        ) === (
          currentSettings.organization_model || defaultOrganizationModel(currentSettings.game_type)
        );
        const fundingIncentiveMatch = (s.funding_incentive || "balanced")
          === (currentSettings.funding_incentive || "balanced");
        const logisticsOrgMatch = (s.logistics_organization || "functional") === (currentSettings.logistics_organization || "functional");
        const processMatch = [...(s.production_processes || [])].sort().join(",")
          === [...(currentSettings.production_processes || [])].sort().join(",");
        const productTypeCountMatch = (Number(s.product_type_count) || 3) === (Number(currentSettings.product_type_count) || 3);

        if (!moneyMatch || !pnlMatch || !intermediateStockMatch || !opportunityCostsMatch ||
            !roleFreedomMatch || !openingBalanceMatch || !revenueBalanceMatch ||
            !productionPlanningMatch ||
            !multipleColorsMatch || !editableColorLayersMatch || !supplierMatch ||
            !currencyModeMatch || !baseCurrencyMatch || !enabledCurrenciesMatch ||
            !exchangeRatesMatch ||
            !priceModeMatch || !customerOrderModeMatch || !organizationModelMatch ||
            !fundingIncentiveMatch ||
            !logisticsOrgMatch || !processMatch || !productTypeCountMatch) {
          continue;
        }

        if (currentRolesSorted !== null && Array.isArray(s.enabled_roles)) {
          const configRolesSorted = [...s.enabled_roles].sort().join(",");
          if (configRolesSorted !== currentRolesSorted) {
            continue;
          }
        }

        return config;
      }
      return null;
    }

    saveConfiguration({ name, description = "", baseTemplate = "lo4", settings }) {
      if (!name || typeof name !== "string" || !name.trim()) {
        throw new Error("Configuratienaam is verplicht.");
      }
      const customConfigs = this.getCustomConfigurations();
      const now = new Date().toISOString();
      
      // Ensure users cannot overwrite built-in presets
      const isBuiltinName = BUILTIN_PRESETS.some(p => p.name.toLowerCase() === name.trim().toLowerCase());
      const safeName = isBuiltinName ? `${name.trim()} (Aangepast)` : name.trim();

      const existingIndex = customConfigs.findIndex(c => c.name.toLowerCase() === safeName.toLowerCase());

      const configObj = {
        config_id: existingIndex >= 0 ? customConfigs[existingIndex].config_id : "cfg_" + Date.now().toString(36),
        name: safeName,
        description: description.trim(),
        is_preset: false,
        base_template: baseTemplate,
        created_at: existingIndex >= 0 ? customConfigs[existingIndex].created_at : now,
        updated_at: now,
        settings: normalizeSettings(settings, settings.game_type || baseTemplate)
      };

      if (existingIndex >= 0) {
        customConfigs[existingIndex] = configObj;
      } else {
        customConfigs.push(configObj);
      }

      saveCustomConfigurations(customConfigs);
      return configObj;
    }

    deleteCustomConfiguration(configId) {
      // Prevent deleting built-in presets
      if (BUILTIN_PRESETS.some(p => p.config_id === configId)) {
        return;
      }
      const customConfigs = this.getCustomConfigurations().filter(c => c.config_id !== configId);
      saveCustomConfigurations(customConfigs);
    }
  }

  const store = new GameConfigurationStore();
  global.GameConfigurationStore = store;
})(typeof window !== "undefined" ? window : globalThis);
